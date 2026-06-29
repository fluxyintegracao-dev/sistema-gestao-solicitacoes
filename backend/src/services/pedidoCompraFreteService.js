const {
  FornecedorCompra,
  Historico,
  Obra,
  Parceiro,
  PedidoCompra,
  PedidoCompraFrete,
  PedidoCompraFreteRateio,
  PedidoCompraItem,
  Solicitacao,
  SolicitacaoCompra,
  TituloFinanceiro,
  User
} = require('../models');
const { registrarLogSolicitacaoCompra } = require('./comprasCotacao');
const {
  criarOuAtualizarFornecedorCentralizado,
  sincronizarFornecedorCompraComParceiro
} = require('./comprasFornecedorService');
const { isPedidoCompraStatusLocked } = require('./pedidoCompraStatusConfig');

function asNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  return Number(asNumber(value).toFixed(2));
}

function normalizeToken(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function safeJsonParse(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function serializeFrete(frete) {
  if (!frete) return null;
  const data = typeof frete.toJSON === 'function' ? frete.toJSON() : frete;
  return {
    ...data,
    valor_total: roundMoney(data.valor_total),
    dados_pagamento: safeJsonParse(data.dados_pagamento, data.dados_pagamento || null),
    pendente_financeiro: normalizeToken(data.status_financeiro) === 'PENDENTE_TITULO',
    rateios: (data.rateios || []).map((rateio) => ({
      ...rateio,
      valor_item_base: roundMoney(rateio.valor_item_base),
      valor_rateado: roundMoney(rateio.valor_rateado),
      percentual_rateio: Number(rateio.percentual_rateio || 0)
    }))
  };
}

async function listarFretesPedido(pedidoId, options = {}) {
  const fretes = await PedidoCompraFrete.findAll({
    where: { pedido_compra_id: Number(pedidoId) },
    include: [
      { model: FornecedorCompra, as: 'fornecedor', attributes: ['id', 'nome', 'cnpj', 'email', 'whatsapp', 'contato', 'parceiro_id'] },
      { model: TituloFinanceiro, as: 'tituloFinanceiro', attributes: ['id', 'codigo', 'status', 'valor_original', 'data_vencimento'] },
      { model: User, as: 'registradoPor', attributes: ['id', 'nome', 'email'] },
      {
        model: PedidoCompraFreteRateio,
        as: 'rateios',
        include: [{ model: PedidoCompraItem, as: 'item', attributes: ['id', 'descricao', 'unidade', 'quantidade_pedido', 'valor_total'] }]
      }
    ],
    order: [['createdAt', 'DESC'], [{ model: PedidoCompraFreteRateio, as: 'rateios' }, 'id', 'ASC']],
    transaction: options.transaction
  });

  return fretes.map(serializeFrete);
}

async function listarFretesPendentesFinanceiro(options = {}) {
  const limit = Math.min(Math.max(Number(options.limit || 20), 1), 100);

  const fretes = await PedidoCompraFrete.findAll({
    where: {
      tipo: 'TERCEIRO',
      status_financeiro: 'PENDENTE_TITULO',
      titulo_financeiro_id: null
    },
    include: [
      { model: PedidoCompra, as: 'pedido', attributes: ['id', 'status', 'valor_total'] },
      { model: SolicitacaoCompra, as: 'solicitacaoCompra', attributes: ['id', 'status', 'origem'] },
      { model: Solicitacao, as: 'solicitacaoPrincipal', attributes: ['id', 'codigo', 'status_global', 'area_responsavel'] },
      { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo', 'empresa_grupo_id'] },
      { model: FornecedorCompra, as: 'fornecedor', attributes: ['id', 'nome', 'cnpj', 'email', 'whatsapp', 'contato', 'parceiro_id'] },
      { model: Parceiro, as: 'parceiro', attributes: ['id', 'nome', 'cpf_cnpj', 'fornecedor', 'ativo'] },
      { model: TituloFinanceiro, as: 'tituloFinanceiro', attributes: ['id', 'codigo', 'status', 'valor_original', 'data_vencimento'] },
      { model: User, as: 'registradoPor', attributes: ['id', 'nome', 'email'] }
    ],
    order: [
      ['data_vencimento', 'ASC'],
      ['createdAt', 'ASC']
    ],
    limit
  });

  return fretes.map(serializeFrete);
}

function calcularRateiosProporcionais({ itens, valorTotal, pedido }) {
  const itensAtivos = itens.filter((item) => !item.removido);
  if (!itensAtivos.length) {
    throw new Error('O pedido nao possui itens ativos para ratear o frete.');
  }

  const totalBase = roundMoney(itensAtivos.reduce((sum, item) => sum + asNumber(item.valor_total), 0));
  const divisorIgual = itensAtivos.length;
  let acumulado = 0;

  return itensAtivos.map((item, index) => {
    const base = roundMoney(item.valor_total);
    const percentual = totalBase > 0 ? base / totalBase : 1 / divisorIgual;
    const isUltimo = index === itensAtivos.length - 1;
    const valorRateado = isUltimo ? roundMoney(valorTotal - acumulado) : roundMoney(valorTotal * percentual);
    acumulado = roundMoney(acumulado + valorRateado);

    return {
      pedido_compra_id: pedido.id,
      pedido_compra_item_id: item.id,
      solicitacao_compra_item_id: item.solicitacao_compra_item_id || null,
      solicitacao_compra_item_manual_id: item.solicitacao_compra_item_manual_id || null,
      obra_id: pedido.obra_id || null,
      valor_item_base: base,
      percentual_rateio: Number((percentual * 100).toFixed(6)),
      valor_rateado: valorRateado,
      manual: false
    };
  });
}

async function resolverFornecedorFrete(payload, transaction) {
  if (Number(payload.fornecedor_compra_id || 0) > 0) {
    const fornecedor = await FornecedorCompra.findByPk(Number(payload.fornecedor_compra_id), { transaction });
    if (!fornecedor) {
      throw new Error('Fornecedor do frete nao encontrado.');
    }
    return fornecedor;
  }

  if (Number(payload.parceiro_id || 0) > 0) {
    const parceiro = await Parceiro.findByPk(Number(payload.parceiro_id), { transaction });
    if (!parceiro || parceiro.ativo === false) {
      throw new Error('Credor/transportador do frete nao encontrado ou inativo.');
    }

    return sincronizarFornecedorCompraComParceiro(parceiro, {
      contato: payload.contato || null
    }, { transaction });
  }

  const novoFornecedor = payload.novo_fornecedor || null;
  if (!novoFornecedor || typeof novoFornecedor !== 'object') {
    throw new Error('Informe o credor/transportador do frete.');
  }

  return criarOuAtualizarFornecedorCentralizado({
    nome: novoFornecedor.nome,
    cpf_cnpj: novoFornecedor.cpf_cnpj || novoFornecedor.cnpj,
    whatsapp: novoFornecedor.whatsapp || novoFornecedor.telefone,
    telefone: novoFornecedor.telefone || novoFornecedor.whatsapp,
    email: novoFornecedor.email,
    contato: novoFornecedor.contato,
    observacoes: novoFornecedor.observacoes
  }, { transaction });
}

async function registrarFretePedido({
  pedidoId,
  payload = {},
  usuarioId = null,
  idempotencyKey = null,
  transaction
}) {
  const pedido = await PedidoCompra.findByPk(Number(pedidoId), {
    include: [
      { model: PedidoCompraItem, as: 'itens' },
      { model: FornecedorCompra, as: 'fornecedor', attributes: ['id', 'nome'] },
      { model: SolicitacaoCompra, as: 'solicitacao', attributes: ['id', 'solicitacao_principal_id', 'status'] }
    ],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : undefined
  });

  if (!pedido) {
    throw new Error('Pedido de compra nao encontrado.');
  }

  const key = idempotencyKey ? String(idempotencyKey).trim().slice(0, 120) : null;
  if (key) {
    const existente = await PedidoCompraFrete.findOne({
      where: { pedido_compra_id: pedido.id, idempotency_key: key },
      transaction
    });
    if (existente) {
      const fretes = await listarFretesPedido(pedido.id, { transaction });
      return fretes.find((item) => Number(item.id) === Number(existente.id)) || serializeFrete(existente);
    }
  }

  const tipo = normalizeToken(payload.tipo || 'EMBUTIDO');
  const momento = normalizeToken(payload.momento || 'FECHAMENTO');
  const criterioRateio = normalizeToken(payload.criterio_rateio || 'VALOR_ITENS');
  const valorTotal = roundMoney(payload.valor_total);
  const dataVencimento = payload.data_vencimento || null;

  if (!['EMBUTIDO', 'TERCEIRO'].includes(tipo)) {
    throw new Error('Tipo de frete invalido.');
  }
  if (!['FECHAMENTO', 'POSTERIOR'].includes(momento)) {
    throw new Error('Momento do frete invalido.');
  }
  if (!['VALOR_ITENS'].includes(criterioRateio)) {
    throw new Error('Criterio de rateio ainda nao disponivel para este pedido.');
  }
  if (valorTotal <= 0) {
    throw new Error('Informe um valor de frete maior que zero.');
  }

  const edicaoBloqueadaPorStatus = await isPedidoCompraStatusLocked(pedido.status);
  if (tipo === 'EMBUTIDO' && edicaoBloqueadaPorStatus) {
    throw new Error('Pedido fechado aceita apenas frete pago a terceiro.');
  }
  if (momento === 'FECHAMENTO' && edicaoBloqueadaPorStatus) {
    throw new Error('Pedido fechado aceita apenas frete informado depois.');
  }
  if (tipo === 'TERCEIRO' && !dataVencimento) {
    throw new Error('Informe a data de vencimento do frete pago a terceiro.');
  }

  const fornecedor = tipo === 'TERCEIRO'
    ? await resolverFornecedorFrete(payload, transaction)
    : null;
  const dadosPagamento = payload.dados_pagamento && typeof payload.dados_pagamento === 'object'
    ? JSON.stringify(payload.dados_pagamento)
    : (payload.dados_pagamento ? JSON.stringify({ observacoes: String(payload.dados_pagamento) }) : null);
  const statusFinanceiro = tipo === 'TERCEIRO' ? 'PENDENTE_TITULO' : 'NAO_GERA_TITULO';
  const rateios = calcularRateiosProporcionais({
    itens: pedido.itens || [],
    valorTotal,
    pedido
  });

  const frete = await PedidoCompraFrete.create(
    {
      pedido_compra_id: pedido.id,
      solicitacao_compra_id: pedido.solicitacao_compra_id,
      solicitacao_id: pedido.solicitacao?.solicitacao_principal_id || null,
      obra_id: pedido.obra_id || null,
      tipo,
      momento,
      criterio_rateio: criterioRateio,
      status_financeiro: statusFinanceiro,
      valor_total: valorTotal,
      data_vencimento: tipo === 'TERCEIRO' ? dataVencimento : null,
      fornecedor_compra_id: fornecedor?.id || null,
      parceiro_id: fornecedor?.parceiro_id || null,
      dados_pagamento: dadosPagamento,
      observacoes: payload.observacoes || null,
      idempotency_key: key,
      registrado_por: usuarioId || null
    },
    { transaction }
  );

  await PedidoCompraFreteRateio.bulkCreate(
    rateios.map((rateio) => ({ ...rateio, frete_id: frete.id })),
    { transaction }
  );

  await registrarLogSolicitacaoCompra({
    solicitacaoCompraId: pedido.solicitacao_compra_id,
    usuarioId,
    fornecedorCompraId: fornecedor?.id || null,
    tipoAcao: 'FRETE_PEDIDO_REGISTRADO',
    descricao: tipo === 'TERCEIRO'
      ? `Frete de terceiro registrado para o pedido PC-${String(pedido.id).padStart(5, '0')}`
      : `Frete embutido registrado para o pedido PC-${String(pedido.id).padStart(5, '0')}`,
    metadados: {
      pedido_compra_id: pedido.id,
      frete_id: frete.id,
      tipo,
      momento,
      valor_total: valorTotal,
      status_financeiro: statusFinanceiro
    },
    transaction
  });

  if (tipo === 'TERCEIRO' && Number(pedido.solicitacao?.solicitacao_principal_id || 0) > 0) {
    await Historico.create(
      {
        solicitacao_id: pedido.solicitacao.solicitacao_principal_id,
        usuario_responsavel_id: usuarioId || null,
        setor: 'FINANCEIRO',
        acao: 'FRETE_PENDENTE_FINANCEIRO',
        observacao: `Frete de terceiro pendente de titulo: ${fornecedor?.nome || 'transportador'} - R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        descricao: `Pedido PC-${String(pedido.id).padStart(5, '0')} possui frete de terceiro pendente para o financeiro.`,
        metadata: JSON.stringify({
          tipo: 'FRETE_PEDIDO_COMPRA',
          pedido_compra_id: pedido.id,
          frete_id: frete.id,
          solicitacao_compra_id: pedido.solicitacao_compra_id,
          fornecedor_compra_id: fornecedor?.id || null,
          parceiro_id: fornecedor?.parceiro_id || null,
          valor_total: valorTotal,
          dados_pagamento: safeJsonParse(dadosPagamento, null)
        })
      },
      { transaction }
    );
  }

  const fretes = await listarFretesPedido(pedido.id, { transaction });
  return fretes.find((item) => Number(item.id) === Number(frete.id)) || serializeFrete(frete);
}

module.exports = {
  listarFretesPendentesFinanceiro,
  listarFretesPedido,
  registrarFretePedido
};
