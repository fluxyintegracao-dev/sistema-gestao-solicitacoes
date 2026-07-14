const { Op } = require('sequelize');
const {
  FornecedorCompra,
  Historico,
  Obra,
  Parceiro,
  PedidoCompra,
  PedidoCompraFrete,
  PedidoCompraFreteRateio,
  PedidoCompraItem,
  PedidoCompraItemLog,
  Solicitacao,
  SolicitacaoCompra,
  SolicitacaoCompraAlocacao,
  SolicitacaoCompraFornecedor,
  Insumo,
  SolicitacaoCompraItem,
  SolicitacaoCompraItemManual,
  SolicitacaoCompraRespostaItem,
  TituloFinanceiro,
  Unidade,
  User
} = require('../models');
const {
  isSolicitacaoCompraCancelada,
  normalizeText: normalizeCotacaoText,
  registrarLogSolicitacaoCompra
} = require('./comprasCotacao');
const {
  findPedidoCompraStatusConfig,
  getPedidoCompraStatusConfig,
  isPedidoCompraStatusLocked,
  normalizeStatusCode
} = require('./pedidoCompraStatusConfig');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function asNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  return Number(asNumber(value).toFixed(2));
}

function roundQty(value) {
  return Number(asNumber(value).toFixed(3));
}

function roundPedidoQty(value) {
  return Number(asNumber(value).toFixed(2));
}

function calcularRateiosMonetarios(valorTotal, bases = []) {
  const valoresBase = bases.map((base) => Math.max(0, roundMoney(base)));
  const totalBase = roundMoney(valoresBase.reduce((sum, base) => sum + base, 0));
  const totalRatear = Math.min(Math.max(0, roundMoney(valorTotal)), totalBase);

  if (!valoresBase.length || totalRatear <= 0 || totalBase <= 0) {
    return valoresBase.map(() => 0);
  }

  let acumulado = 0;
  return valoresBase.map((base, index) => {
    if (index === valoresBase.length - 1) {
      return roundMoney(totalRatear - acumulado);
    }

    const parcela = roundMoney((base / totalBase) * totalRatear);
    acumulado = roundMoney(acumulado + parcela);
    return parcela;
  });
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

function buildRespostaKey(itemTipo, itemReferenciaId) {
  return `${normalizeText(itemTipo)}:${Number(itemReferenciaId)}`;
}

function buildPedidoCodigo(id) {
  return `PC-${String(id).padStart(5, '0')}`;
}

function isDateOnlyPast(value) {
  if (!value) return false;
  const text = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const today = new Date();
  const todayText = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0')
  ].join('-');
  return text < todayText;
}

async function registrarHistoricoPedidoNaSolicitacaoPrincipal({
  solicitacao,
  pedido,
  usuarioId = null,
  acao,
  descricao,
  statusAnterior = null,
  statusNovo = null,
  metadados = {},
  transaction
}) {
  const solicitacaoPrincipalId = Number(solicitacao?.solicitacao_principal_id || 0);
  if (!solicitacaoPrincipalId || !pedido?.id || !acao || !descricao) {
    return null;
  }

  return Historico.create(
    {
      solicitacao_id: solicitacaoPrincipalId,
      usuario_responsavel_id: usuarioId || null,
      setor: 'COMPRAS',
      acao,
      status_anterior: statusAnterior || null,
      status_novo: statusNovo || null,
      observacao: descricao,
      descricao,
      metadata: JSON.stringify({
        tipo: 'PEDIDO_COMPRA',
        pedido_compra_id: pedido.id,
        pedido_compra_codigo: buildPedidoCodigo(pedido.id),
        solicitacao_compra_id: solicitacao.id,
        fornecedor_compra_id: pedido.fornecedor_compra_id,
        ...metadados
      })
    },
    { transaction }
  );
}

async function registrarHistoricoCompraNaSolicitacaoPrincipal({
  solicitacao,
  usuarioId = null,
  acao,
  descricao,
  statusAnterior = null,
  statusNovo = null,
  metadados = {},
  transaction
}) {
  const solicitacaoPrincipalId = Number(solicitacao?.solicitacao_principal_id || 0);
  if (!solicitacaoPrincipalId || !acao || !descricao) {
    return null;
  }

  return Historico.create(
    {
      solicitacao_id: solicitacaoPrincipalId,
      usuario_responsavel_id: usuarioId || null,
      setor: 'COMPRAS',
      acao,
      status_anterior: statusAnterior || null,
      status_novo: statusNovo || null,
      observacao: descricao,
      descricao,
      metadata: JSON.stringify({
        tipo: 'SOLICITACAO_COMPRA',
        solicitacao_compra_id: solicitacao.id,
        ...metadados
      })
    },
    { transaction }
  );
}

function getRespostaItemReferencia(resposta) {
  return {
    itemTipo: normalizeText(resposta?.item_tipo),
    itemReferenciaId:
      Number(resposta?.solicitacao_compra_item_id || 0) ||
      Number(resposta?.solicitacao_compra_item_manual_id || 0)
  };
}

function buildItemKeyFromResposta(resposta) {
  const { itemTipo, itemReferenciaId } = getRespostaItemReferencia(resposta);
  return buildRespostaKey(itemTipo, itemReferenciaId);
}

function buildItemKeyFromPedidoItem(item) {
  const itemReferenciaId =
    Number(item?.solicitacao_compra_item_id || 0) ||
    Number(item?.solicitacao_compra_item_manual_id || 0);
  return buildRespostaKey(item?.item_tipo, itemReferenciaId);
}

function fornecedorRespondeuCotacao(vinculacaoFornecedor) {
  const status = normalizeText(vinculacaoFornecedor?.status);
  return Boolean(vinculacaoFornecedor?.respondido_em) ||
    ['RESPONDIDO', 'FINALIZADA'].includes(status);
}

function isSolicitacaoCompraEncerrada(solicitacao) {
  return normalizeText(solicitacao?.status) === 'ENCERRADO' || Boolean(solicitacao?.encerrado_em);
}

function getQuantidadeBaseItem(solicitacao, resposta) {
  const baseItem = obterBaseItemPorResposta(solicitacao, resposta);
  return baseItem ? roundQty(baseItem.quantidade_solicitada) : 0;
}

async function sincronizarValoresSolicitacaoCompra(solicitacaoId, transaction) {
  const solicitacao = await SolicitacaoCompra.findByPk(Number(solicitacaoId), {
    transaction,
    attributes: ['id', 'solicitacao_principal_id']
  });

  if (!solicitacao) {
    return null;
  }

  const pedidos = await PedidoCompra.findAll({
    where: { solicitacao_compra_id: solicitacao.id },
    include: [{ model: PedidoCompraItem, as: 'itens' }],
    transaction
  });

  const valorFechado = roundMoney(
    pedidos.reduce((total, pedido) => {
      if (normalizeText(pedido.status) === 'CANCELADO') {
        return total;
      }

      const valorPedido = (pedido.itens || [])
        .filter((item) => !item.removido)
        .reduce((sum, item) => sum + asNumber(item.valor_total), 0);

      return total + valorPedido;
    }, 0)
  );

  await SolicitacaoCompra.update(
    { valor_fechado: valorFechado },
    { where: { id: solicitacao.id }, transaction }
  );

  if (Number(solicitacao.solicitacao_principal_id || 0) > 0) {
    await Solicitacao.update(
      { valor: valorFechado },
      { where: { id: solicitacao.solicitacao_principal_id }, transaction }
    );
  }

  return valorFechado;
}

async function buscarUltimosPrecosPorInsumo(insumoIds, obraIdsEscopo = null, solicitacaoCompraIdIgnorar = null) {
  const ids = [...new Set(
    (Array.isArray(insumoIds) ? insumoIds : [])
      .map((item) => Number(item))
      .filter((item) => item > 0)
  )];

  if (!ids.length) {
    return new Map();
  }

  const whereCompra = { status: 'ENCERRADO' };
  if (Number(solicitacaoCompraIdIgnorar) > 0) {
    whereCompra.id = { [Op.ne]: Number(solicitacaoCompraIdIgnorar) };
  }

  if (Array.isArray(obraIdsEscopo)) {
    if (!obraIdsEscopo.length) {
      return new Map();
    }
    whereCompra.obra_id = { [Op.in]: obraIdsEscopo.map((item) => Number(item)).filter((item) => item > 0) };
  }

  const respostas = await SolicitacaoCompraRespostaItem.findAll({
    where: {
      vencedor: true,
      preco: { [Op.not]: null },
      deleted_at: null
    },
    include: [{
      model: SolicitacaoCompraItem,
      as: 'itemCadastrado',
      required: true,
      attributes: ['id', 'insumo_id'],
      where: {
        insumo_id: { [Op.in]: ids }
      },
      include: [{
        model: SolicitacaoCompra,
        as: 'solicitacao',
        required: true,
        where: whereCompra,
        attributes: ['id', 'updatedAt']
      }]
    }],
    order: [
      [{ model: SolicitacaoCompraItem, as: 'itemCadastrado' }, 'insumo_id', 'ASC'],
      [
        { model: SolicitacaoCompraItem, as: 'itemCadastrado' },
        { model: SolicitacaoCompra, as: 'solicitacao' },
        'updatedAt',
        'DESC'
      ]
    ]
  });

  const mapaPrecos = new Map();
  for (const resposta of respostas) {
    const insumoId = Number(resposta?.itemCadastrado?.insumo_id || 0);
    if (!insumoId || mapaPrecos.has(insumoId)) {
      continue;
    }

    mapaPrecos.set(insumoId, roundMoney(resposta.preco));

    if (mapaPrecos.size >= ids.length) {
      break;
    }
  }

  return mapaPrecos;
}

async function carregarSolicitacaoPedidos(id, transaction, { incluirPedidos = true } = {}) {
  const include = [
    {
      model: Obra,
      as: 'obra',
      attributes: [
        'id',
        'nome',
        'codigo',
        'cno',
        'cidade',
        'endereco_logradouro',
        'endereco_numero',
        'endereco_complemento',
        'endereco_bairro',
        'endereco_cep',
        'endereco_uf'
      ]
    },
    {
      model: SolicitacaoCompraItem,
      as: 'itens',
      include: [
        { model: Insumo, as: 'insumo', attributes: ['id', 'nome', 'codigo'] },
        { model: Unidade, as: 'unidade', attributes: ['id', 'sigla'] }
      ]
    },
    {
      model: SolicitacaoCompraItemManual,
      as: 'itensManuais'
    },
    {
      model: SolicitacaoCompraFornecedor,
      as: 'fornecedores',
      include: [
        {
          model: FornecedorCompra,
          as: 'fornecedor',
          attributes: ['id', 'nome', 'email', 'whatsapp', 'contato']
        },
        {
          model: SolicitacaoCompraRespostaItem,
          as: 'respostas',
          where: { deleted_at: null },
          required: false,
          attributes: [
            'id',
            'item_tipo',
            'solicitacao_compra_item_id',
            'solicitacao_compra_item_manual_id',
            'disponivel',
            'preco',
            'prazo',
            'observacao',
            'quantidade_minima_item',
            'vencedor'
          ]
        }
      ]
    },
    {
      model: SolicitacaoCompraAlocacao,
      as: 'alocacoes',
      required: false
    }
  ];

  if (incluirPedidos) {
    include.push({
      model: PedidoCompra,
      as: 'pedidos',
      include: [
        {
          model: PedidoCompraItem,
          as: 'itens'
        },
        {
          model: FornecedorCompra,
          as: 'fornecedor',
          attributes: ['id', 'nome', 'email', 'whatsapp']
        }
      ]
    });
  }

  return SolicitacaoCompra.findByPk(id, {
    transaction,
    include
  });
}

function obterBaseItemPorResposta(solicitacao, resposta) {
  const itemReferenciaId =
    Number(resposta?.solicitacao_compra_item_id || 0) ||
    Number(resposta?.solicitacao_compra_item_manual_id || 0);
  const itemTipo = normalizeText(resposta?.item_tipo);

  if (itemTipo === 'CADASTRADO') {
    const item = (solicitacao?.itens || []).find((entry) => Number(entry.id) === itemReferenciaId);
    if (!item) return null;
    return {
      item_tipo: 'CADASTRADO',
      solicitacao_compra_item_id: item.id,
      solicitacao_compra_item_manual_id: null,
      descricao: item.insumo?.nome || `Item ${item.id}`,
      unidade: item.unidade?.sigla || null,
      quantidade_solicitada: roundQty(item.quantidade)
    };
  }

  const item = (solicitacao?.itensManuais || []).find((entry) => Number(entry.id) === itemReferenciaId);
  if (!item) return null;
  return {
    item_tipo: 'MANUAL',
    solicitacao_compra_item_id: null,
    solicitacao_compra_item_manual_id: item.id,
    descricao: item.nome_manual || `Item manual ${item.id}`,
    unidade: item.unidade_sigla_manual || null,
    quantidade_solicitada: roundQty(item.quantidade)
  };
}

async function registrarLogPedidoItem({
  pedidoCompraId,
  pedidoCompraItemId,
  usuarioId = null,
  acao,
  descricao,
  dadosAnteriores = null,
  dadosNovos = null,
  transaction
}) {
  return PedidoCompraItemLog.create(
    {
      pedido_compra_id: pedidoCompraId,
      pedido_compra_item_id: pedidoCompraItemId,
      usuario_id: usuarioId,
      acao,
      descricao,
      dados_anteriores: dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
      dados_novos: dadosNovos ? JSON.stringify(dadosNovos) : null
    },
    { transaction }
  );
}

async function assertPedidoEditavel(pedidoOrId, transaction) {
  const pedido = typeof pedidoOrId === 'object' && pedidoOrId
    ? pedidoOrId
    : await PedidoCompra.findByPk(Number(pedidoOrId), { transaction });

  if (!pedido) {
    throw new Error('Pedido nao encontrado.');
  }

  const bloqueado = await isPedidoCompraStatusLocked(pedido.status);
  if (bloqueado) {
    throw new Error('O pedido esta com status bloqueado para edicao.');
  }

  return pedido;
}

async function recalcularPedidoPorId(pedidoId, transaction) {
  const pedido = await PedidoCompra.findByPk(pedidoId, {
    transaction,
    include: [{ model: PedidoCompraItem, as: 'itens' }]
  });

  if (!pedido) {
    throw new Error('Pedido nao encontrado.');
  }

  const itensAtivos = (pedido.itens || []).filter((item) => !item.removido);
  let valorTotal = 0;

  if (!itensAtivos.length) {
    await pedido.update(
      {
        status: 'CANCELADO',
        valor_total: 0,
        atingiu_pedido_minimo: true,
        cancelado_em: pedido.cancelado_em || new Date(),
        motivo_cancelamento: pedido.motivo_cancelamento || 'Pedido sem itens ativos apos atualizacao da cotacao',
        encerrado_em: pedido.encerrado_em || new Date()
      },
      { transaction }
    );

    await sincronizarValoresSolicitacaoCompra(pedido.solicitacao_compra_id, transaction);

    return PedidoCompra.findByPk(pedidoId, {
      transaction,
      include: [
        { model: PedidoCompraItem, as: 'itens' },
        { model: FornecedorCompra, as: 'fornecedor', attributes: ['id', 'nome', 'email', 'whatsapp'] },
        { model: SolicitacaoCompra, as: 'solicitacao', attributes: ['id', 'status'] }
      ]
    });
  }

  const valoresBrutos = itensAtivos.map((item) =>
    roundMoney(asNumber(item.quantidade_pedido) * asNumber(item.preco_unitario))
  );
  const descontosRateados = calcularRateiosMonetarios(pedido.desconto_total, valoresBrutos);

  for (const [index, item] of itensAtivos.entries()) {
    const descontoRateado = descontosRateados[index] || 0;
    const valorItem = roundMoney(Math.max(0, valoresBrutos[index] - descontoRateado));
    if (
      roundMoney(item.valor_total) !== valorItem ||
      roundMoney(item.desconto_rateado) !== descontoRateado
    ) {
      await item.update(
        {
          valor_total: valorItem,
          desconto_rateado: descontoRateado
        },
        { transaction }
      );
    }
    valorTotal += valorItem;
  }

  valorTotal = roundMoney(valorTotal);
  const valorMinimo = asNumber(pedido.valor_minimo_pedido);
  const atingiuPedidoMinimo = valorMinimo <= 0 ? true : valorTotal >= valorMinimo;

  await pedido.update(
    {
      valor_total: valorTotal,
      atingiu_pedido_minimo: atingiuPedidoMinimo
    },
    { transaction }
  );

  await sincronizarValoresSolicitacaoCompra(pedido.solicitacao_compra_id, transaction);

  return PedidoCompra.findByPk(pedidoId, {
    transaction,
    include: [
      { model: PedidoCompraItem, as: 'itens' },
      { model: FornecedorCompra, as: 'fornecedor', attributes: ['id', 'nome', 'email', 'whatsapp'] },
      { model: SolicitacaoCompra, as: 'solicitacao', attributes: ['id', 'status'] }
    ]
  });
}

async function inativarPedidoSemItensPorAtualizacao({ pedido, usuarioId, transaction, motivo }) {
  const pedidoCompleto = pedido.itens
    ? pedido
    : await PedidoCompra.findByPk(pedido.id, {
      transaction,
      include: [{ model: PedidoCompraItem, as: 'itens' }]
    });

  const agora = new Date();
  const itensAtivos = (pedidoCompleto.itens || []).filter((item) => !item.removido);
  for (const item of itensAtivos) {
    const anterior = item.toJSON();
    await item.update(
      {
        removido: true,
        quantidade_cancelada: item.quantidade_pedido,
        cancelado_por: usuarioId || null,
        cancelado_em: agora,
        motivo_cancelamento: motivo
      },
      { transaction }
    );

    await registrarLogPedidoItem({
      pedidoCompraId: pedidoCompleto.id,
      pedidoCompraItemId: item.id,
      usuarioId,
      acao: 'ITEM_REMOVIDO_DA_SELECAO',
      descricao: `Item ${item.descricao} removido porque deixou de ser vencedor da cotacao`,
      dadosAnteriores: {
        removido: anterior.removido,
        quantidade_pedido: anterior.quantidade_pedido,
        valor_total: anterior.valor_total
      },
      dadosNovos: {
        removido: true,
        quantidade_cancelada: item.quantidade_cancelada
      },
      transaction
    });
  }

  await pedidoCompleto.update(
    {
      status: 'CANCELADO',
      valor_total: 0,
      atingiu_pedido_minimo: true,
      cancelado_por: usuarioId || null,
      cancelado_em: pedidoCompleto.cancelado_em || agora,
      encerrado_em: pedidoCompleto.encerrado_em || agora,
      motivo_cancelamento: motivo
    },
    { transaction }
  );

  await registrarLogSolicitacaoCompra({
    solicitacaoCompraId: pedidoCompleto.solicitacao_compra_id,
    usuarioId,
    fornecedorCompraId: pedidoCompleto.fornecedor_compra_id,
    tipoAcao: 'PEDIDO_CANCELADO_AUTOMATICAMENTE',
    descricao: motivo,
    metadados: {
      pedido_compra_id: pedidoCompleto.id
    },
    transaction
  });

  return pedidoCompleto;
}

async function obterOuCriarPedidoPorFornecedor({
  solicitacao,
  vinculacaoFornecedor,
  usuarioId,
  transaction
}) {
  let pedido = await PedidoCompra.findOne({
    where: {
      solicitacao_compra_id: solicitacao.id,
      fornecedor_compra_id: vinculacaoFornecedor.fornecedor_compra_id
    },
    transaction
  });

  if (pedido) {
    const atualizacaoPedido = {
      valor_minimo_pedido: vinculacaoFornecedor.valor_minimo_pedido || null,
      desconto_total: roundMoney(vinculacaoFornecedor.desconto_total)
    };
    const statusAnterior = String(pedido.status || '');
    if (normalizeText(pedido.status) === 'CANCELADO') {
      await pedido.update(
        {
          ...atualizacaoPedido,
          status: 'ABERTO',
          cancelado_por: null,
          cancelado_em: null,
          motivo_cancelamento: null,
          encerrado_em: null
        },
        { transaction }
      );
    } else if (await isPedidoCompraStatusLocked(statusAnterior)) {
      const statusAberto = await getPedidoStatusAbertoConfig();
      await pedido.update(
        {
          ...atualizacaoPedido,
          status: statusAberto.codigo,
          encerrado_em: null
        },
        { transaction }
      );

      await registrarLogSolicitacaoCompra({
        solicitacaoCompraId: solicitacao.id,
        usuarioId,
        fornecedorCompraId: pedido.fornecedor_compra_id,
        tipoAcao: 'PEDIDO_REABERTO_PARA_REENCERRAMENTO',
        descricao: `${buildPedidoCodigo(pedido.id)} reaberto automaticamente para atualizar vencedores da cotacao`,
        metadados: {
          pedido_compra_id: pedido.id,
          status_anterior: statusAnterior || null,
          status_novo: statusAberto.codigo,
          origem: 'ENCERRAMENTO_COTACAO'
        },
        transaction
      });

      await registrarHistoricoPedidoNaSolicitacaoPrincipal({
        solicitacao,
        pedido,
        usuarioId,
        acao: 'PEDIDO_COMPRA_REABERTO_COTACAO',
        descricao: `${buildPedidoCodigo(pedido.id)} reaberto automaticamente para atualizar vencedores da cotacao`,
        statusAnterior: statusAnterior || null,
        statusNovo: statusAberto.codigo,
        metadados: {
          automatico: true,
          origem: 'ENCERRAMENTO_COTACAO'
        },
        transaction
      });
    } else if (
      roundMoney(pedido.desconto_total) !== atualizacaoPedido.desconto_total ||
      String(pedido.valor_minimo_pedido || '') !== String(atualizacaoPedido.valor_minimo_pedido || '')
    ) {
      await pedido.update(atualizacaoPedido, { transaction });
    }
    return pedido;
  }

  pedido = await PedidoCompra.create(
    {
      solicitacao_compra_id: solicitacao.id,
      obra_id: solicitacao.obra_id,
      fornecedor_compra_id: vinculacaoFornecedor.fornecedor_compra_id,
      criado_por: usuarioId || null,
      status: 'ABERTO',
      origem: 'COTACAO',
      valor_minimo_pedido: vinculacaoFornecedor.valor_minimo_pedido || null,
      desconto_total: roundMoney(vinculacaoFornecedor.desconto_total),
      atingiu_pedido_minimo: true,
      observacoes: null
    },
    { transaction }
  );

  await registrarLogSolicitacaoCompra({
    solicitacaoCompraId: solicitacao.id,
    usuarioId,
    fornecedorCompraId: vinculacaoFornecedor.fornecedor_compra_id,
    tipoAcao: 'PEDIDO_GERADO',
    descricao: `Pedido preliminar gerado para ${vinculacaoFornecedor.fornecedor?.nome || vinculacaoFornecedor.fornecedor_compra_id}`,
    metadados: {
      pedido_compra_id: pedido.id
    },
    transaction
  });

  await registrarHistoricoPedidoNaSolicitacaoPrincipal({
    solicitacao,
    pedido,
    usuarioId,
    acao: 'PEDIDO_COMPRA_GERADO',
    descricao: `${buildPedidoCodigo(pedido.id)} gerado para ${vinculacaoFornecedor.fornecedor?.nome || vinculacaoFornecedor.fornecedor_compra_id}`,
    statusNovo: pedido.status,
    metadados: {
      fornecedor_nome: vinculacaoFornecedor.fornecedor?.nome || null
    },
    transaction
  });

  return pedido;
}

async function adicionarRespostasAoPedido({
  pedido,
  solicitacao,
  vinculacaoFornecedor,
  respostaItemIds = [],
  quantidadesPorResposta = new Map(),
  somarQuantidadeExistente = false,
  sincronizarItensSelecionados = false,
  usuarioId,
  acaoLog = 'ITEM_ADICIONADO',
  descricaoLog = 'Item adicionado ao pedido',
  transaction
}) {
  await assertPedidoEditavel(pedido, transaction);

  const todasRespostasDisponiveis = (vinculacaoFornecedor?.respostas || []).filter(
    (resposta) => Boolean(resposta.disponivel) && asNumber(resposta.preco) > 0
  );

  const respostasSelecionadas = respostaItemIds.length
    ? todasRespostasDisponiveis.filter((resposta) => respostaItemIds.includes(Number(resposta.id)))
    : todasRespostasDisponiveis;

  const itensAtuais = await PedidoCompraItem.findAll({
    where: { pedido_compra_id: pedido.id },
    transaction
  });

  const itensAtuaisPorResposta = new Map(
    itensAtuais
      .filter((item) => !item.removido)
      .map((item) => [Number(item.resposta_item_id || 0), item])
      .filter(([id]) => id > 0)
  );

  if (sincronizarItensSelecionados && respostaItemIds.length) {
    const respostasSelecionadasIds = new Set(respostasSelecionadas.map((resposta) => Number(resposta.id)));
    const itensRemover = itensAtuais.filter((item) =>
      !item.removido &&
      Number(item.resposta_item_id || 0) > 0 &&
      !respostasSelecionadasIds.has(Number(item.resposta_item_id || 0))
    );

    for (const itemAtual of itensRemover) {
      const anterior = itemAtual.toJSON();
      await itemAtual.update(
        {
          removido: true,
          quantidade_cancelada: itemAtual.quantidade_pedido,
          cancelado_por: usuarioId || null,
          cancelado_em: new Date(),
          motivo_cancelamento: 'Item removido da selecao de vencedores da cotacao'
        },
        { transaction }
      );

      await registrarLogPedidoItem({
        pedidoCompraId: pedido.id,
        pedidoCompraItemId: itemAtual.id,
        usuarioId,
        acao: 'ITEM_REMOVIDO_DA_SELECAO',
        descricao: `Item ${itemAtual.descricao} removido da selecao de vencedores`,
        dadosAnteriores: {
          removido: anterior.removido,
          quantidade_pedido: anterior.quantidade_pedido,
          valor_total: anterior.valor_total
        },
        dadosNovos: {
          removido: true,
          quantidade_cancelada: itemAtual.quantidade_cancelada
        },
        transaction
      });
    }
  }

  for (const resposta of respostasSelecionadas) {
    const baseItem = obterBaseItemPorResposta(solicitacao, resposta);
    if (!baseItem) {
      continue;
    }

    const quantidadeInformada = quantidadesPorResposta instanceof Map
      ? quantidadesPorResposta.get(Number(resposta.id))
      : null;
    const quantidadePedido = roundPedidoQty(
      quantidadeInformada !== undefined && quantidadeInformada !== null
        ? quantidadeInformada
        : baseItem.quantidade_solicitada
    );

    if (quantidadePedido <= 0) {
      continue;
    }

    const itemExistente = itensAtuaisPorResposta.get(Number(resposta.id));
    if (itemExistente) {
      const anterior = itemExistente.toJSON();
      const proximaQuantidade = somarQuantidadeExistente
        ? roundPedidoQty(asNumber(itemExistente.quantidade_pedido) + quantidadePedido)
        : quantidadePedido;
      await itemExistente.update(
        {
          quantidade_pedido: proximaQuantidade,
          preco_unitario: roundMoney(resposta.preco),
          valor_total: roundMoney(proximaQuantidade * asNumber(resposta.preco)),
          quantidade_minima_item: resposta.quantidade_minima_item || null,
          observacoes: resposta.observacao || itemExistente.observacoes || null
        },
        { transaction }
      );

      await registrarLogPedidoItem({
        pedidoCompraId: pedido.id,
        pedidoCompraItemId: itemExistente.id,
        usuarioId,
        acao: 'ITEM_REALOCADO',
        descricao: `Quantidade do item ${itemExistente.descricao} atualizada pela cotacao`,
        dadosAnteriores: {
          quantidade_pedido: anterior.quantidade_pedido,
          preco_unitario: anterior.preco_unitario,
          valor_total: anterior.valor_total
        },
        dadosNovos: {
          quantidade_pedido: itemExistente.quantidade_pedido,
          preco_unitario: itemExistente.preco_unitario,
          valor_total: itemExistente.valor_total
        },
        transaction
      });
      continue;
    }

    const novoItem = await PedidoCompraItem.create(
      {
        pedido_compra_id: pedido.id,
        resposta_item_id: resposta.id,
        item_tipo: baseItem.item_tipo,
        solicitacao_compra_item_id: baseItem.solicitacao_compra_item_id,
        solicitacao_compra_item_manual_id: baseItem.solicitacao_compra_item_manual_id,
        descricao: baseItem.descricao,
        unidade: baseItem.unidade,
        quantidade_solicitada: baseItem.quantidade_solicitada,
        quantidade_minima_item: resposta.quantidade_minima_item || null,
        quantidade_pedido: quantidadePedido,
        preco_unitario: roundMoney(resposta.preco),
        valor_total: roundMoney(quantidadePedido * asNumber(resposta.preco)),
        removido: false,
        origem: 'COTACAO',
        observacoes: resposta.observacao || null
      },
      { transaction }
    );

    await registrarLogPedidoItem({
      pedidoCompraId: pedido.id,
      pedidoCompraItemId: novoItem.id,
      usuarioId,
      acao: acaoLog,
      descricao: `${descricaoLog}: ${novoItem.descricao}`,
      dadosNovos: {
        resposta_item_id: resposta.id,
        quantidade_pedido: novoItem.quantidade_pedido,
        preco_unitario: novoItem.preco_unitario
      },
      transaction
    });
  }

  return recalcularPedidoPorId(pedido.id, transaction);
}

function montarAlocacoesNormalizadas(solicitacao, vencedores = []) {
  const todasRespostas = [];
  for (const vinculacaoFornecedor of solicitacao.fornecedores || []) {
    for (const resposta of vinculacaoFornecedor.respostas || []) {
      todasRespostas.push({
        resposta,
        vinculacaoFornecedor
      });
    }
  }

  const entradas = Array.isArray(vencedores) && vencedores.length
    ? vencedores
    : todasRespostas
      .filter(({ resposta }) => resposta.vencedor)
      .map(({ resposta }) => ({ resposta_item_id: resposta.id }));

  const alocacoes = [];
  const totaisPorItem = new Map();

  for (const entrada of entradas) {
    const respostaItemId = Number(entrada?.resposta_item_id || entrada?.id || 0);
    if (!respostaItemId) {
      continue;
    }

    const registro = todasRespostas.find(({ resposta }) => Number(resposta.id) === respostaItemId);
    if (!registro) {
      throw new Error('Resposta vencedora invalida informada.');
    }

    const { resposta, vinculacaoFornecedor } = registro;
    if (!resposta.disponivel || asNumber(resposta.preco) <= 0) {
      throw new Error('Resposta vencedora precisa estar disponivel e possuir preco.');
    }

    const baseItem = obterBaseItemPorResposta(solicitacao, resposta);
    if (!baseItem) {
      throw new Error('Item da resposta vencedora nao foi encontrado.');
    }

    const quantidadeBase = roundQty(baseItem.quantidade_solicitada);
    const quantidadeEntrada =
      entrada?.quantidade_alocada ??
      entrada?.quantidade ??
      entrada?.quantidade_pedido ??
      quantidadeBase;
    const quantidadeAlocada = roundQty(quantidadeEntrada);

    if (quantidadeAlocada <= 0) {
      throw new Error('Quantidade alocada deve ser maior que zero.');
    }

    const itemKey = buildItemKeyFromResposta(resposta);
    const totalAtual = roundQty((totaisPorItem.get(itemKey) || 0) + quantidadeAlocada);
    if (totalAtual > quantidadeBase) {
      throw new Error(
        `A quantidade definida para comprar do item "${baseItem.descricao}" ultrapassa a quantidade solicitada na cotacao. Solicitado: ${quantidadeBase}. Marcado: ${totalAtual}. Ajuste a quantidade antes de atualizar os vencedores.`
      );
    }

    totaisPorItem.set(itemKey, totalAtual);
    alocacoes.push({
      resposta,
      vinculacaoFornecedor,
      baseItem,
      itemKey,
      quantidade_alocada: quantidadeAlocada,
      preco_unitario: roundMoney(resposta.preco),
      valor_total: roundMoney(quantidadeAlocada * asNumber(resposta.preco))
    });
  }

  const porFornecedor = new Map();
  for (const alocacao of alocacoes) {
    const fornecedorId = Number(alocacao.vinculacaoFornecedor?.fornecedor_compra_id || 0);
    if (!porFornecedor.has(fornecedorId)) {
      porFornecedor.set(fornecedorId, []);
    }
    porFornecedor.get(fornecedorId).push(alocacao);
  }

  for (const grupo of porFornecedor.values()) {
    const descontoTotal = roundMoney(grupo[0]?.vinculacaoFornecedor?.desconto_total);
    const bases = grupo.map((alocacao) => alocacao.valor_total);
    const descontos = calcularRateiosMonetarios(descontoTotal, bases);
    grupo.forEach((alocacao, index) => {
      const descontoRateado = descontos[index] || 0;
      alocacao.desconto_rateado = descontoRateado;
      alocacao.valor_total = roundMoney(Math.max(0, asNumber(alocacao.valor_total) - descontoRateado));
    });
  }

  return alocacoes;
}

async function persistirAlocacoesSolicitacao({ solicitacao, alocacoes, usuarioId, transaction }) {
  await SolicitacaoCompraAlocacao.update(
    {
      status: 'SUBSTITUIDA',
      cancelado_em: new Date(),
      cancelado_por: usuarioId || null,
      motivo_cancelamento: 'Cotacao reencerrada com nova selecao de vencedores'
    },
    {
      where: {
        solicitacao_compra_id: solicitacao.id,
        status: 'ATIVA'
      },
      transaction
    }
  );

  const criadas = [];
  for (const alocacao of alocacoes) {
    const criada = await SolicitacaoCompraAlocacao.create(
      {
        solicitacao_compra_id: solicitacao.id,
        resposta_item_id: alocacao.resposta.id,
        fornecedor_compra_id: alocacao.vinculacaoFornecedor.fornecedor_compra_id,
        item_tipo: alocacao.baseItem.item_tipo,
        solicitacao_compra_item_id: alocacao.baseItem.solicitacao_compra_item_id,
        solicitacao_compra_item_manual_id: alocacao.baseItem.solicitacao_compra_item_manual_id,
        quantidade_alocada: alocacao.quantidade_alocada,
        preco_unitario: alocacao.preco_unitario,
        valor_total: alocacao.valor_total,
        desconto_rateado: alocacao.desconto_rateado || 0,
        status: 'ATIVA',
        criado_por: usuarioId || null
      },
      { transaction }
    );
    criadas.push({ ...alocacao, registro: criada });
  }

  return criadas;
}

async function gerarPedidosDosVencedores({ solicitacaoId, usuarioId, vencedores = [], transaction }) {
  const solicitacao = await carregarSolicitacaoPedidos(solicitacaoId, transaction);
  if (!solicitacao) {
    throw new Error('Solicitacao de compra nao encontrada.');
  }
  if (isSolicitacaoCompraCancelada(solicitacao.status) || normalizeCotacaoText(solicitacao.status) === 'RECUSADO') {
    throw new Error('Solicitacao de compra cancelada ou recusada nao permite gerar pedidos.');
  }

  const alocacoes = await persistirAlocacoesSolicitacao({
    solicitacao,
    alocacoes: montarAlocacoesNormalizadas(solicitacao, vencedores),
    usuarioId,
    transaction
  });

  const porFornecedor = new Map();
  for (const alocacao of alocacoes) {
    const fornecedorId = Number(alocacao.vinculacaoFornecedor.fornecedor_compra_id);
    if (!porFornecedor.has(fornecedorId)) {
      porFornecedor.set(fornecedorId, {
        vinculacaoFornecedor: alocacao.vinculacaoFornecedor,
        respostaItemIds: [],
        quantidadesPorResposta: new Map(),
        registrosAlocacao: []
      });
    }
    const grupo = porFornecedor.get(fornecedorId);
    grupo.respostaItemIds.push(Number(alocacao.resposta.id));
    grupo.quantidadesPorResposta.set(Number(alocacao.resposta.id), alocacao.quantidade_alocada);
    grupo.registrosAlocacao.push(alocacao.registro);
  }

  const fornecedoresSelecionados = new Set([...porFornecedor.keys()].map((id) => Number(id)));
  const pedidosExistentes = await PedidoCompra.findAll({
    where: { solicitacao_compra_id: solicitacao.id },
    include: [{ model: PedidoCompraItem, as: 'itens' }],
    transaction
  });

  for (const pedidoExistente of pedidosExistentes) {
    const fornecedorId = Number(pedidoExistente.fornecedor_compra_id || 0);
    if (fornecedoresSelecionados.has(fornecedorId) || normalizeText(pedidoExistente.status) === 'CANCELADO') {
      continue;
    }

    await inativarPedidoSemItensPorAtualizacao({
      pedido: pedidoExistente,
      usuarioId,
      transaction,
      motivo: 'Fornecedor sem itens vencedores apos atualizacao da cotacao'
    });
  }

  for (const grupo of porFornecedor.values()) {
    if (!grupo.respostaItemIds.length) continue;

    const pedido = await obterOuCriarPedidoPorFornecedor({
      solicitacao,
      vinculacaoFornecedor: grupo.vinculacaoFornecedor,
      usuarioId,
      transaction
    });

    const pedidoAtualizado = await adicionarRespostasAoPedido({
      pedido,
      solicitacao,
      vinculacaoFornecedor: grupo.vinculacaoFornecedor,
      respostaItemIds: grupo.respostaItemIds,
      quantidadesPorResposta: grupo.quantidadesPorResposta,
      usuarioId,
      acaoLog: 'GERADO_DA_COTACAO',
      descricaoLog: 'Item gerado a partir da cotacao encerrada',
      sincronizarItensSelecionados: true,
      transaction
    });

    const itensPorResposta = new Map(
      (pedidoAtualizado?.itens || [])
        .map((item) => [Number(item.resposta_item_id || 0), item])
        .filter(([id]) => id > 0)
    );

    for (const registro of grupo.registrosAlocacao) {
      const itemPedido = itensPorResposta.get(Number(registro.resposta_item_id || 0));
      await registro.update(
        {
          pedido_compra_id: pedido.id,
          pedido_compra_item_id: itemPedido?.id || null
        },
        { transaction }
      );
    }
  }
}

async function getPedidoStatusFechadoFornecedorConfig() {
  const statusList = await getPedidoCompraStatusConfig();
  const ativo = (statusList || []).filter((item) => item?.ativo !== false);
  const exato = ativo.find((item) => item.codigo === 'FECHADO_FORNECEDOR');
  if (exato) return exato;

  const porNome = ativo.find((item) => {
    const texto = normalizeText(`${item.codigo || ''} ${item.nome || ''}`);
    return texto.includes('FECHADO') && texto.includes('FORNECEDOR');
  });
  if (porNome) return porNome;

  return {
    codigo: 'FECHADO_FORNECEDOR',
    nome: 'Fechado com o fornecedor',
    cor: '#16a34a',
    bloqueia_edicao: true,
    ativo: true
  };
}

async function getPedidoStatusAbertoConfig() {
  const statusList = await getPedidoCompraStatusConfig();
  const ativo = (statusList || []).filter((item) => item?.ativo !== false);
  const aberto = ativo.find((item) => item.codigo === 'ABERTO');
  if (aberto) return aberto;

  const editavel = ativo.find((item) => !item.bloqueia_edicao);
  if (editavel) return editavel;

  return {
    codigo: 'ABERTO',
    nome: 'Aberto',
    cor: '#2563eb',
    bloqueia_edicao: false,
    ativo: true
  };
}

function isPedidoCancelado(status) {
  return normalizeText(status) === 'CANCELADO';
}

function getPedidoStatusValue(pedido) {
  return pedido?.status ?? pedido?.get?.('status') ?? '';
}

function isPedidoFechadoComFornecedorStatus(status, statusFechado) {
  const normalized = normalizeText(status);
  const normalizedConfig = normalizeText(statusFechado?.codigo);
  return (
    normalized === normalizedConfig ||
    normalized === 'FECHADO_FORNECEDOR' ||
    (normalized.includes('FECHADO') && normalized.includes('FORNECEDOR'))
  );
}

async function fecharPedidosDaSolicitacaoCompraAutomaticamente({ solicitacaoId, usuarioId, transaction }) {
  const statusFechado = await getPedidoStatusFechadoFornecedorConfig();
  const pedidos = await PedidoCompra.findAll({
    where: { solicitacao_compra_id: Number(solicitacaoId) },
    transaction
  });

  const solicitacao = await SolicitacaoCompra.findByPk(Number(solicitacaoId), {
    transaction,
    attributes: ['id', 'solicitacao_principal_id']
  });

  for (const pedido of pedidos) {
    const statusAnterior = String(pedido.status || '');
    if (statusAnterior === statusFechado.codigo || isPedidoCancelado(statusAnterior)) {
      continue;
    }

    await pedido.update(
      {
        status: statusFechado.codigo,
        encerrado_em: new Date()
      },
      { transaction }
    );

    await registrarLogSolicitacaoCompra({
      solicitacaoCompraId: Number(solicitacaoId),
      usuarioId,
      fornecedorCompraId: pedido.fornecedor_compra_id,
      tipoAcao: 'PEDIDO_FECHADO_AUTOMATICAMENTE',
      descricao: `${buildPedidoCodigo(pedido.id)} fechado automaticamente apos encerramento da cotacao`,
      metadados: {
        pedido_compra_id: pedido.id,
        status_anterior: statusAnterior || null,
        status_novo: statusFechado.codigo,
        origem: 'ENCERRAMENTO_COTACAO'
      },
      transaction
    });

    await registrarHistoricoPedidoNaSolicitacaoPrincipal({
      solicitacao,
      pedido,
      usuarioId,
      acao: 'PEDIDO_COMPRA_ENCERRADO',
      descricao: `${buildPedidoCodigo(pedido.id)} fechado automaticamente apos encerramento da cotacao`,
      statusAnterior: statusAnterior || null,
      statusNovo: statusFechado.codigo,
      metadados: {
        automatico: true,
        origem: 'ENCERRAMENTO_COTACAO'
      },
      transaction
    });
  }
}

async function isSolicitacaoCompraComPedidosFechadosComFornecedor(solicitacao) {
  const statusFechado = await getPedidoStatusFechadoFornecedorConfig();
  const pedidos = Array.isArray(solicitacao?.pedidos)
    ? solicitacao.pedidos
    : await PedidoCompra.findAll({
        where: { solicitacao_compra_id: Number(solicitacao?.id || 0) },
        attributes: ['id', 'status']
      });

  const ativos = pedidos.filter((pedido) => !isPedidoCancelado(getPedidoStatusValue(pedido)));
  return ativos.length > 0 && ativos.every((pedido) => (
    isPedidoFechadoComFornecedorStatus(getPedidoStatusValue(pedido), statusFechado)
  ));
}

async function reabrirPedidoParaCotacao({ pedidoId, usuarioId, motivo, transaction }) {
  const motivoNormalizado = String(motivo || '').trim();
  if (!motivoNormalizado) {
    throw new Error('Informe o motivo da reabertura.');
  }

  const pedido = await PedidoCompra.findByPk(Number(pedidoId), {
    transaction,
    lock: transaction?.LOCK?.UPDATE
  });
  if (!pedido) {
    throw new Error('Pedido nao encontrado.');
  }

  const statusAnterior = String(pedido.status || '');
  if (isPedidoCancelado(statusAnterior)) {
    throw new Error('Pedido cancelado nao pode ser reaberto.');
  }

  const solicitacao = await SolicitacaoCompra.findByPk(pedido.solicitacao_compra_id, {
    transaction,
    lock: transaction?.LOCK?.UPDATE,
    attributes: ['id', 'status', 'encerrado_em', 'solicitacao_principal_id']
  });

  const bloqueado = await isPedidoCompraStatusLocked(statusAnterior);
  const statusAberto = await getPedidoStatusAbertoConfig();
  const pedidoAberto = !bloqueado && normalizeText(statusAnterior) === normalizeText(statusAberto.codigo);
  const cotacaoEncerrada = isSolicitacaoCompraEncerrada(solicitacao);

  if (pedidoAberto && !cotacaoEncerrada) {
    return pedido;
  }

  if (!pedidoAberto) {
    await pedido.update(
      {
        status: statusAberto.codigo,
        encerrado_em: null
      },
      { transaction }
    );
  }

  if (solicitacao && cotacaoEncerrada) {
    await solicitacao.update(
      {
        status: 'ENVIADO',
        encerrado_em: null
      },
      { transaction }
    );
  }

  if (pedido.fornecedor_compra_id) {
    await SolicitacaoCompraFornecedor.update(
      { status: 'REABERTA' },
      {
        where: {
          solicitacao_compra_id: pedido.solicitacao_compra_id,
          fornecedor_compra_id: pedido.fornecedor_compra_id,
          status: { [Op.ne]: 'CANCELADO' }
        },
        transaction
      }
    );
  }

  await registrarLogSolicitacaoCompra({
    solicitacaoCompraId: pedido.solicitacao_compra_id,
    usuarioId,
    fornecedorCompraId: pedido.fornecedor_compra_id,
    tipoAcao: 'PEDIDO_REABERTO_COTACAO',
    descricao: `${buildPedidoCodigo(pedido.id)} reaberto para ajustes na cotacao`,
    metadados: {
      pedido_compra_id: pedido.id,
      status_anterior: statusAnterior || null,
      status_novo: statusAberto.codigo,
      cotacao_reaberta: cotacaoEncerrada,
      motivo: motivoNormalizado
    },
    transaction
  });

  await registrarHistoricoPedidoNaSolicitacaoPrincipal({
    solicitacao,
    pedido,
    usuarioId,
    acao: 'PEDIDO_COMPRA_REABERTO',
    descricao: `${buildPedidoCodigo(pedido.id)} reaberto para ajustes na cotacao. Motivo: ${motivoNormalizado}`,
    statusAnterior: statusAnterior || null,
    statusNovo: statusAberto.codigo,
    metadados: {
      motivo: motivoNormalizado,
      origem: 'REABERTURA_COTACAO',
      cotacao_reaberta: cotacaoEncerrada
    },
    transaction
  });

  return pedido;
}

async function criarPedidoParaFornecedor({ solicitacaoId, fornecedorCompraId, usuarioId, transaction }) {
  const solicitacao = await carregarSolicitacaoPedidos(solicitacaoId, transaction);
  if (!solicitacao) {
    throw new Error('Solicitacao de compra nao encontrada.');
  }
  if (isSolicitacaoCompraCancelada(solicitacao.status) || normalizeCotacaoText(solicitacao.status) === 'RECUSADO') {
    throw new Error('Solicitacao de compra cancelada ou recusada nao permite gerar pedidos.');
  }

  const vinculacaoFornecedor = (solicitacao.fornecedores || []).find(
    (item) => Number(item.fornecedor_compra_id) === Number(fornecedorCompraId)
  );

  if (!vinculacaoFornecedor) {
    throw new Error('Fornecedor nao possui cotacao vinculada a esta solicitacao.');
  }

  const pedido = await obterOuCriarPedidoPorFornecedor({
    solicitacao,
    vinculacaoFornecedor,
    usuarioId,
    transaction
  });

  await adicionarRespostasAoPedido({
    pedido,
    solicitacao,
    vinculacaoFornecedor,
    respostaItemIds: [],
    usuarioId,
    acaoLog: 'ITEM_ADICIONADO_FORNECEDOR',
    descricaoLog: 'Item incluido ao criar pedido do fornecedor',
    transaction
  });

  return PedidoCompra.findByPk(pedido.id, {
    transaction,
    include: [
      { model: FornecedorCompra, as: 'fornecedor', attributes: ['id', 'nome', 'email', 'whatsapp'] },
      { model: PedidoCompraItem, as: 'itens' }
    ]
  });
}

async function listarPedidos({
  solicitacaoId,
  obraId,
  status,
  q,
  obraIds = null,
  compradorResponsavelId = null,
  solicitanteId = null
} = {}) {
  const where = {};

  if (solicitacaoId) {
    where.solicitacao_compra_id = Number(solicitacaoId);
  }

  if (obraId) {
    where.obra_id = Number(obraId);
  } else if (Array.isArray(obraIds)) {
    where.obra_id = {
      [Op.in]: obraIds.length ? obraIds.map((item) => Number(item)) : [0]
    };
  }

  if (status) {
    where.status = String(status).trim().toUpperCase();
  } else {
    where.status = { [Op.ne]: 'CANCELADO' };
  }

  const solicitacaoScope = [];
  if (Number(compradorResponsavelId || 0) > 0) {
    solicitacaoScope.push({ comprador_responsavel_id: Number(compradorResponsavelId) });
  }
  if (Number(solicitanteId || 0) > 0) {
    solicitacaoScope.push({ solicitante_id: Number(solicitanteId) });
  }

  const solicitacaoWhere = {};
  if (solicitacaoScope.length === 1) {
    Object.assign(solicitacaoWhere, solicitacaoScope[0]);
  } else if (solicitacaoScope.length > 1) {
    solicitacaoWhere[Op.or] = solicitacaoScope;
  }

  const pedidos = await PedidoCompra.findAll({
    where,
    include: [
      { model: FornecedorCompra, as: 'fornecedor', attributes: ['id', 'nome', 'email', 'whatsapp'] },
      {
        model: SolicitacaoCompra,
        as: 'solicitacao',
        attributes: ['id', 'status', 'numero_sienge', 'comprador_responsavel_id', 'solicitante_id'],
        where: solicitacaoWhere,
        required: solicitacaoScope.length > 0
      },
      { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo'] },
      { model: PedidoCompraItem, as: 'itens', attributes: ['id', 'descricao', 'valor_total', 'removido'] }
    ],
    order: [['updatedAt', 'DESC']]
  });

  const filtro = String(q || '').trim().toLowerCase();
  return pedidos.filter((pedido) => {
    if (!filtro) return true;
    const haystack = [
      buildPedidoCodigo(pedido.id),
      pedido.fornecedor?.nome,
      pedido.solicitacao?.numero_sienge,
      pedido.obra?.nome,
      pedido.id
    ]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
    return haystack.includes(filtro);
  });
}

async function listarAuditoriaItensPedido({ obraId, pedidoId, itemId, acao, q, obraIds = null } = {}) {
  const where = {};
  const pedidoWhere = {};

  if (pedidoId) {
    where.pedido_compra_id = Number(pedidoId);
  }

  if (itemId) {
    where.pedido_compra_item_id = Number(itemId);
  }

  if (acao) {
    where.acao = String(acao).trim().toUpperCase();
  }

  if (obraId) {
    pedidoWhere.obra_id = Number(obraId);
  } else if (Array.isArray(obraIds)) {
    pedidoWhere.obra_id = {
      [Op.in]: obraIds.length ? obraIds.map((entry) => Number(entry)) : [0]
    };
  }

  const logs = await PedidoCompraItemLog.findAll({
    where,
    include: [
      {
        model: PedidoCompra,
        as: 'pedido',
        where: pedidoWhere,
        required: true,
        attributes: ['id', 'obra_id', 'solicitacao_compra_id', 'status', 'updatedAt'],
        include: [
          { model: FornecedorCompra, as: 'fornecedor', attributes: ['id', 'nome'] },
          { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo'] },
          { model: SolicitacaoCompra, as: 'solicitacao', attributes: ['id', 'numero_sienge'] }
        ]
      },
      {
        model: PedidoCompraItem,
        as: 'item',
        attributes: ['id', 'descricao', 'origem', 'unidade', 'quantidade_pedido', 'preco_unitario', 'removido']
      },
      { model: User, as: 'usuario', attributes: ['id', 'nome'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  const filtro = String(q || '').trim().toLowerCase();
  const logsFiltrados = !filtro
    ? logs
    : logs.filter((log) => {
        const haystack = [
          log.descricao,
          log.acao,
          log.pedido?.fornecedor?.nome,
          log.pedido?.obra?.nome,
          log.pedido?.obra?.codigo,
          log.item?.descricao,
          log.usuario?.nome,
          buildPedidoCodigo(log.pedido?.id)
        ]
          .map((value) => String(value || '').toLowerCase())
          .join(' ');

        return haystack.includes(filtro);
      });

  return logsFiltrados.map((log) => ({
    id: log.id,
    acao: log.acao,
    descricao: log.descricao,
    createdAt: log.createdAt,
    dados_anteriores: log.dados_anteriores,
    dados_novos: log.dados_novos,
    usuario: log.usuario ? { id: log.usuario.id, nome: log.usuario.nome } : null,
    pedido: log.pedido
      ? {
          id: log.pedido.id,
          codigo: buildPedidoCodigo(log.pedido.id),
          status: log.pedido.status,
          fornecedor: log.pedido.fornecedor || null,
          obra: log.pedido.obra || null,
          solicitacao: log.pedido.solicitacao || null
        }
      : null,
    item: log.item
      ? {
          id: log.item.id,
          descricao: log.item.descricao,
          origem: log.item.origem,
          unidade: log.item.unidade,
          quantidade_pedido: log.item.quantidade_pedido,
          preco_unitario: log.item.preco_unitario,
          removido: Boolean(log.item.removido)
        }
      : null
  }));
}

async function obterPedidoDetalhe(id, { obraIdsHistoricoPreco = null } = {}) {
  const pedido = await PedidoCompra.findByPk(id, {
    include: [
      { model: FornecedorCompra, as: 'fornecedor', attributes: ['id', 'nome', 'email', 'whatsapp', 'contato'] },
      {
        model: Obra,
        as: 'obra',
        attributes: [
          'id',
          'nome',
          'codigo',
          'cno',
          'endereco_logradouro',
          'endereco_numero',
          'endereco_complemento',
          'endereco_bairro',
          'endereco_cep',
          'endereco_uf'
        ]
      },
      { model: User, as: 'criador', attributes: ['id', 'nome', 'email'] },
      { model: User, as: 'responsavel', attributes: ['id', 'nome', 'email'] },
        {
          model: SolicitacaoCompra,
          as: 'solicitacao',
          attributes: [
            'id',
            'status',
            'obra_id',
            'origem',
            'solicitacao_principal_id',
            'numero_sienge',
            'necessario_para',
            'comprador_responsavel_id',
            'solicitante_id',
            'encerrado_em'
          ]
        },
      {
        model: PedidoCompraItem,
        as: 'itens',
        include: [
          {
            model: SolicitacaoCompraItem,
            as: 'itemCadastrado',
            attributes: ['id', 'insumo_id']
          },
          {
            model: SolicitacaoCompraRespostaItem,
            as: 'respostaItem',
            include: [
              {
                model: SolicitacaoCompraFornecedor,
                as: 'cotacaoFornecedor',
                include: [{ model: FornecedorCompra, as: 'fornecedor', attributes: ['id', 'nome'] }]
              }
            ]
          },
          {
            model: PedidoCompraItemLog,
            as: 'logs',
            include: [{ model: User, as: 'usuario', attributes: ['id', 'nome'] }]
          }
        ]
      },
      {
        model: PedidoCompraFrete,
        as: 'fretes',
        include: [
          {
            model: FornecedorCompra,
            as: 'fornecedor',
            attributes: ['id', 'nome', 'cnpj', 'email', 'whatsapp', 'contato', 'parceiro_id'],
            required: false
          },
          {
            model: Parceiro,
            as: 'parceiro',
            attributes: ['id', 'nome', 'cpf_cnpj', 'fornecedor', 'ativo'],
            required: false
          },
          {
            model: TituloFinanceiro,
            as: 'tituloFinanceiro',
            attributes: ['id', 'codigo', 'status', 'valor_original', 'data_vencimento'],
            required: false
          },
          { model: User, as: 'registradoPor', attributes: ['id', 'nome', 'email'] },
          {
            model: PedidoCompraFreteRateio,
            as: 'rateios',
            include: [{ model: PedidoCompraItem, as: 'item', attributes: ['id', 'descricao', 'unidade', 'quantidade_pedido', 'valor_total'] }]
          }
        ]
      }
    ]
  });

  if (!pedido) {
    return null;
  }

  const statusConfig = await findPedidoCompraStatusConfig(pedido.status);
  const bloqueadoPorStatus = Boolean(statusConfig?.bloqueia_edicao);
  const cotacaoEncerradaMinima = isSolicitacaoCompraEncerrada(pedido.solicitacao);
  const precisaSolicitacaoOperacional = !bloqueadoPorStatus && !cotacaoEncerradaMinima;
  const solicitacao = precisaSolicitacaoOperacional
    ? await carregarSolicitacaoPedidos(pedido.solicitacao_compra_id, null, { incluirPedidos: false })
    : pedido.solicitacao;
  const cotacaoEncerrada = cotacaoEncerradaMinima || isSolicitacaoCompraEncerrada(solicitacao);
  const edicaoBloqueada = Boolean(statusConfig?.bloqueia_edicao || cotacaoEncerrada);
  const respostaIdsAtuais = new Set(
    (pedido.itens || [])
      .filter((item) => !item.removido)
      .map((item) => Number(item.resposta_item_id || 0))
      .filter((idAtual) => idAtual > 0)
  );

  const vinculacaoFornecedor = (solicitacao?.fornecedores || []).find(
    (item) => Number(item.fornecedor_compra_id) === Number(pedido.fornecedor_compra_id)
  );

  const candidatos = edicaoBloqueada
    ? []
    : (vinculacaoFornecedor?.respostas || [])
      .filter((resposta) => Boolean(resposta.disponivel) && asNumber(resposta.preco) > 0)
      .filter((resposta) => !respostaIdsAtuais.has(Number(resposta.id)))
      .map((resposta) => {
        const baseItem = obterBaseItemPorResposta(solicitacao, resposta);
        return {
          resposta_item_id: resposta.id,
          descricao: baseItem?.descricao || 'Item',
          unidade: baseItem?.unidade || null,
          quantidade_solicitada: baseItem?.quantidade_solicitada || 0,
          quantidade_minima_item: resposta.quantidade_minima_item || null,
          preco_unitario: resposta.preco,
          prazo: resposta.prazo || '',
          observacao: resposta.observacao || ''
        };
      });

  const candidatosRemanejamento = edicaoBloqueada
    ? []
    : (solicitacao?.fornecedores || [])
      .flatMap((fornecedor) => (fornecedor.respostas || []).map((resposta) => ({ fornecedor, resposta })))
      .filter(({ fornecedor, resposta }) => (
        fornecedorRespondeuCotacao(fornecedor) &&
        Number(fornecedor.fornecedor_compra_id) !== Number(pedido.fornecedor_compra_id) &&
        Boolean(resposta.disponivel) &&
        asNumber(resposta.preco) > 0
      ))
      .map(({ fornecedor, resposta }) => {
        const baseItem = obterBaseItemPorResposta(solicitacao, resposta);
        return {
          resposta_item_id: resposta.id,
          fornecedor_id: fornecedor.fornecedor_compra_id,
          fornecedor_nome: fornecedor.fornecedor?.nome || fornecedor.nome || 'Fornecedor',
          item_tipo: baseItem?.item_tipo || normalizeText(resposta.item_tipo),
          solicitacao_compra_item_id: baseItem?.solicitacao_compra_item_id || null,
          solicitacao_compra_item_manual_id: baseItem?.solicitacao_compra_item_manual_id || null,
          item_key: buildItemKeyFromResposta(resposta),
          descricao: baseItem?.descricao || 'Item',
          unidade: baseItem?.unidade || null,
          quantidade_solicitada: baseItem?.quantidade_solicitada || 0,
          quantidade_minima_item: resposta.quantidade_minima_item || null,
          preco_unitario: resposta.preco,
          prazo: resposta.prazo || '',
          observacao: resposta.observacao || ''
        };
      });

  const ultimoPrecoPorInsumo = await buscarUltimosPrecosPorInsumo(
    (pedido.itens || []).map((item) => item.itemCadastrado?.insumo_id),
    obraIdsHistoricoPreco,
    pedido.solicitacao_compra_id
  );

  const itens = (pedido.itens || []).map((item) => {
    const itemJson = item.toJSON();
    const { itemCadastrado, ...itemData } = itemJson;
    const insumoId = Number(itemCadastrado?.insumo_id || 0) || null;

    return {
      ...itemData,
      contexto_preco: {
        insumo_id: insumoId,
        preco_cotado: itemJson.respostaItem?.preco != null ? roundMoney(itemJson.respostaItem.preco) : null,
        ultimo_preco_compra: insumoId ? (ultimoPrecoPorInsumo.get(insumoId) ?? null) : null
      }
    };
  });
  const fretes = (pedido.fretes || []).map((frete) => {
    const data = typeof frete.toJSON === 'function' ? frete.toJSON() : frete;
    return {
      ...data,
      valor_total: roundMoney(data.valor_total),
      dados_pagamento: safeJsonParse(data.dados_pagamento, data.dados_pagamento || null),
      pendente_financeiro: normalizeText(data.status_financeiro) === 'PENDENTE_TITULO',
      rateios: (data.rateios || []).map((rateio) => ({
        ...rateio,
        valor_item_base: roundMoney(rateio.valor_item_base),
        valor_rateado: roundMoney(rateio.valor_rateado),
        percentual_rateio: Number(rateio.percentual_rateio || 0)
      }))
    };
  });

  return {
    ...pedido.toJSON(),
    itens,
    fretes,
    status_configuracao: statusConfig,
    edicao_bloqueada: edicaoBloqueada,
    edicao_bloqueada_motivo: edicaoBloqueada && cotacaoEncerrada && !statusConfig?.bloqueia_edicao
      ? 'COTACAO_ENCERRADA'
      : null,
    candidatos_adicao: candidatos,
    candidatos_remanejamento: candidatosRemanejamento
  };
}

async function atualizarPedidoItem({ pedidoId, itemId, payload, usuarioId, transaction }) {
  await assertPedidoEditavel(pedidoId, transaction);

  const item = await PedidoCompraItem.findOne({
    where: {
      id: Number(itemId),
      pedido_compra_id: Number(pedidoId)
    },
    transaction
  });

  if (!item) {
    throw new Error('Item do pedido nao encontrado.');
  }

  const anterior = item.toJSON();
  const quantidadePedido = payload.quantidade_pedido !== undefined
    ? roundPedidoQty(payload.quantidade_pedido)
    : roundPedidoQty(item.quantidade_pedido);
  const precoUnitario = payload.preco_unitario !== undefined
    ? roundMoney(payload.preco_unitario)
    : roundMoney(item.preco_unitario);

  await item.update(
    {
      quantidade_pedido: quantidadePedido,
      preco_unitario: precoUnitario,
      valor_total: roundMoney(quantidadePedido * precoUnitario),
      observacoes: payload.observacoes !== undefined ? (payload.observacoes || null) : item.observacoes
    },
    { transaction }
  );

  await registrarLogPedidoItem({
    pedidoCompraId: Number(pedidoId),
    pedidoCompraItemId: item.id,
    usuarioId,
    acao: 'AJUSTE_MANUAL',
    descricao: `Item ${item.descricao} ajustado manualmente`,
    dadosAnteriores: {
      quantidade_pedido: anterior.quantidade_pedido,
      preco_unitario: anterior.preco_unitario,
      observacoes: anterior.observacoes
    },
    dadosNovos: {
      quantidade_pedido: item.quantidade_pedido,
      preco_unitario: item.preco_unitario,
      observacoes: item.observacoes
    },
    transaction
  });

  return recalcularPedidoPorId(pedidoId, transaction);
}

async function removerPedidoItem({ pedidoId, itemId, usuarioId, transaction }) {
  await assertPedidoEditavel(pedidoId, transaction);

  const item = await PedidoCompraItem.findOne({
    where: {
      id: Number(itemId),
      pedido_compra_id: Number(pedidoId)
    },
    transaction
  });

  if (!item) {
    throw new Error('Item do pedido nao encontrado.');
  }

  if (!item.removido) {
    await item.update({ removido: true }, { transaction });
    await registrarLogPedidoItem({
      pedidoCompraId: Number(pedidoId),
      pedidoCompraItemId: item.id,
      usuarioId,
      acao: 'REMOVIDO',
      descricao: `Item ${item.descricao} removido do pedido`,
      dadosAnteriores: {
        removido: false,
        quantidade_pedido: item.quantidade_pedido,
        preco_unitario: item.preco_unitario
      },
      dadosNovos: {
        removido: true
      },
      transaction
    });
  }

  return recalcularPedidoPorId(pedidoId, transaction);
}

async function adicionarRespostaAoPedido({ pedidoId, respostaItemId, usuarioId, transaction }) {
  const pedido = await PedidoCompra.findByPk(pedidoId, { transaction });
  if (!pedido) {
    throw new Error('Pedido nao encontrado.');
  }

  await assertPedidoEditavel(pedido, transaction);

  const solicitacao = await carregarSolicitacaoPedidos(pedido.solicitacao_compra_id, transaction);
  const vinculacaoFornecedor = (solicitacao?.fornecedores || []).find(
    (item) => Number(item.fornecedor_compra_id) === Number(pedido.fornecedor_compra_id)
  );

  if (!vinculacaoFornecedor) {
    throw new Error('Fornecedor do pedido nao esta vinculado a cotacao.');
  }

  return adicionarRespostasAoPedido({
    pedido,
    solicitacao,
    vinculacaoFornecedor,
    respostaItemIds: [Number(respostaItemId)],
    usuarioId,
    acaoLog: 'ITEM_ADICIONADO_MANUAL',
    descricaoLog: 'Item adicionado manualmente ao pedido',
    transaction
  });
}

async function atualizarStatusPedido({ pedidoId, status, usuarioId, transaction }) {
  const pedido = await PedidoCompra.findByPk(Number(pedidoId), { transaction });
  if (!pedido) {
    throw new Error('Pedido nao encontrado.');
  }

  const statusList = await getPedidoCompraStatusConfig();
  const normalizedStatus = normalizeStatusCode(status);
  const statusConfig = statusList.find(
    (item) => item.codigo === normalizedStatus && item.ativo !== false
  );

  if (!statusConfig) {
    throw new Error('Status do pedido invalido ou inativo.');
  }

  const statusAnterior = String(pedido.status || '');
  if (statusAnterior === statusConfig.codigo) {
    return pedido;
  }
  if (isPedidoCancelado(statusAnterior)) {
    throw new Error('Pedido cancelado nao pode ter o status alterado.');
  }

  await pedido.update(
    {
      status: statusConfig.codigo,
      encerrado_em: statusConfig.bloqueia_edicao ? new Date() : null
    },
    { transaction }
  );

  await registrarLogSolicitacaoCompra({
    solicitacaoCompraId: pedido.solicitacao_compra_id,
    usuarioId,
    fornecedorCompraId: pedido.fornecedor_compra_id,
    tipoAcao: 'PEDIDO_STATUS_ALTERADO',
    descricao: `${buildPedidoCodigo(pedido.id)} alterado de ${statusAnterior || '-'} para ${statusConfig.codigo}`,
    metadados: {
      pedido_compra_id: pedido.id,
      status_anterior: statusAnterior || null,
      status_novo: statusConfig.codigo,
      bloqueia_edicao: statusConfig.bloqueia_edicao
    },
    transaction
  });

  const solicitacao = await SolicitacaoCompra.findByPk(pedido.solicitacao_compra_id, {
    transaction,
    attributes: ['id', 'solicitacao_principal_id']
  });
  const isStatusFinal = Boolean(statusConfig.bloqueia_edicao) || ['ENCERRADO', 'CANCELADO'].includes(statusConfig.codigo);
  const statusSolicitacaoCompra = `PEDIDO_${statusConfig.codigo}`;

  if (solicitacao) {
    await SolicitacaoCompra.update(
      { status: statusSolicitacaoCompra },
      { where: { id: solicitacao.id }, transaction }
    );

    if (Number(solicitacao.solicitacao_principal_id || 0) > 0) {
      await Solicitacao.update(
        { status_global: statusSolicitacaoCompra },
        { where: { id: solicitacao.solicitacao_principal_id }, transaction }
      );
    }
  }

  await registrarHistoricoPedidoNaSolicitacaoPrincipal({
    solicitacao,
    pedido,
    usuarioId,
    acao: isStatusFinal ? 'PEDIDO_COMPRA_ENCERRADO' : 'PEDIDO_COMPRA_STATUS_ALTERADO',
    descricao: `${buildPedidoCodigo(pedido.id)} ${isStatusFinal ? 'finalizado' : 'alterado'} de ${statusAnterior || '-'} para ${statusConfig.codigo}`,
    statusAnterior: statusAnterior || null,
    statusNovo: statusConfig.codigo,
    metadados: {
      status_anterior: statusAnterior || null,
      status_novo: statusConfig.codigo,
      bloqueia_edicao: statusConfig.bloqueia_edicao
    },
    transaction
  });

  return pedido;
}

async function assertPedidoSemVinculoFinanceiroParaCancelamento(pedidoId, transaction) {
  const pedidoCompraId = Number(pedidoId);
  const [alocacoesComTitulo, fretesComTitulo] = await Promise.all([
    SolicitacaoCompraAlocacao.count({
      where: {
        pedido_compra_id: pedidoCompraId,
        titulo_financeiro_id: { [Op.ne]: null },
        [Op.or]: [
          { status: { [Op.ne]: 'CANCELADA' } },
          { status: null }
        ]
      },
      transaction
    }),
    PedidoCompraFrete.count({
      where: {
        pedido_compra_id: pedidoCompraId,
        [Op.and]: [
          {
            [Op.or]: [
              { status_financeiro: { [Op.ne]: 'CANCELADO' } },
              { status_financeiro: null }
            ]
          },
          {
            [Op.or]: [
              { titulo_financeiro_id: { [Op.ne]: null } },
              { status_financeiro: 'TITULO_GERADO' }
            ]
          }
        ]
      },
      transaction
    })
  ]);

  if (alocacoesComTitulo > 0 || fretesComTitulo > 0) {
    throw new Error('Este pedido possui titulo financeiro vinculado. Estorne ou cancele o financeiro antes de cancelar o pedido.');
  }
}

async function cancelarPedidoCompra({ pedidoId, motivo, usuarioId, transaction }) {
  const pedido = await PedidoCompra.findByPk(Number(pedidoId), {
    transaction,
    lock: transaction?.LOCK?.UPDATE
  });
  if (!pedido) {
    throw new Error('Pedido de compra nao encontrado.');
  }
  if (isPedidoCancelado(pedido.status)) {
    throw new Error('Pedido de compra ja esta cancelado.');
  }
  const motivoNormalizado = String(motivo || '').trim();
  if (!motivoNormalizado) {
    throw new Error('Informe o motivo do cancelamento do pedido.');
  }

  await assertPedidoSemVinculoFinanceiroParaCancelamento(pedido.id, transaction);

  const statusAnterior = pedido.status;

  await pedido.update(
    {
      status: 'CANCELADO',
      cancelado_por: usuarioId || null,
      cancelado_em: new Date(),
      encerrado_em: new Date(),
      motivo_cancelamento: motivoNormalizado
    },
    { transaction }
  );

  const itens = await PedidoCompraItem.findAll({
    where: { pedido_compra_id: pedido.id, removido: false },
    transaction
  });

  for (const item of itens) {
    await item.update(
      {
        removido: true,
        quantidade_cancelada: item.quantidade_pedido,
        cancelado_por: usuarioId || null,
        cancelado_em: new Date(),
        motivo_cancelamento: motivoNormalizado
      },
      { transaction }
    );

    await registrarLogPedidoItem({
      pedidoCompraId: pedido.id,
      pedidoCompraItemId: item.id,
      usuarioId,
      acao: 'PEDIDO_CANCELADO',
      descricao: `Item ${item.descricao} cancelado junto com o pedido`,
      dadosAnteriores: { removido: false, quantidade_pedido: item.quantidade_pedido },
      dadosNovos: { removido: true, motivo: motivoNormalizado },
      transaction
    });
  }

  await SolicitacaoCompraAlocacao.update(
    {
      status: 'CANCELADA',
      cancelado_por: usuarioId || null,
      cancelado_em: new Date(),
      motivo_cancelamento: motivoNormalizado
    },
    { where: { pedido_compra_id: pedido.id, status: 'ATIVA' }, transaction }
  );

  const [fretesCancelados] = await PedidoCompraFrete.update(
    { status_financeiro: 'CANCELADO' },
    {
      where: {
        pedido_compra_id: pedido.id,
        titulo_financeiro_id: null,
        [Op.or]: [
          { status_financeiro: { [Op.ne]: 'CANCELADO' } },
          { status_financeiro: null }
        ]
      },
      transaction
    }
  );

  await registrarLogSolicitacaoCompra({
    solicitacaoCompraId: pedido.solicitacao_compra_id,
    usuarioId,
    fornecedorCompraId: pedido.fornecedor_compra_id,
    tipoAcao: 'PEDIDO_CANCELADO',
    descricao: `${buildPedidoCodigo(pedido.id)} cancelado: ${motivoNormalizado}`,
    metadados: {
      pedido_compra_id: pedido.id,
      motivo: motivoNormalizado,
      fretes_cancelados: Number(fretesCancelados || 0)
    },
    transaction
  });

  const solicitacao = await SolicitacaoCompra.findByPk(pedido.solicitacao_compra_id, { transaction });
  await registrarHistoricoPedidoNaSolicitacaoPrincipal({
    solicitacao,
    pedido,
    usuarioId,
    acao: 'PEDIDO_COMPRA_CANCELADO',
    descricao: `${buildPedidoCodigo(pedido.id)} cancelado: ${motivoNormalizado}`,
    statusAnterior,
    statusNovo: 'CANCELADO',
    metadados: {
      motivo: motivoNormalizado,
      fretes_cancelados: Number(fretesCancelados || 0)
    },
    transaction
  });

  return recalcularPedidoPorId(pedido.id, transaction);
}

async function cancelarFluxoPedidoCompra({
  pedidoId,
  motivo,
  usuarioId,
  cancelarCotacao = false,
  cancelarSolicitacaoCompra = false,
  cancelarSolicitacaoPrincipal = false,
  transaction
}) {
  const motivoNormalizado = String(motivo || '').trim();
  if (!motivoNormalizado) {
    throw new Error('Informe o motivo do cancelamento do pedido.');
  }

  const pedidoCancelado = await cancelarPedidoCompra({
    pedidoId,
    motivo: motivoNormalizado,
    usuarioId,
    transaction
  });

  const solicitacaoCompra = await SolicitacaoCompra.findByPk(Number(pedidoCancelado.solicitacao_compra_id), {
    transaction,
    lock: transaction?.LOCK?.UPDATE
  });

  if (!solicitacaoCompra) {
    return pedidoCancelado;
  }

  if (cancelarCotacao) {
    await SolicitacaoCompraFornecedor.update(
      {
        status: 'CANCELADA'
      },
      {
        where: {
          solicitacao_compra_id: solicitacaoCompra.id,
          status: { [Op.notIn]: ['CANCELADA', 'CANCELADO'] }
        },
        transaction
      }
    );

    await registrarLogSolicitacaoCompra({
      solicitacaoCompraId: solicitacaoCompra.id,
      usuarioId,
      tipoAcao: 'COTACAO_CANCELADA',
      descricao: `Cotacao cancelada junto com ${buildPedidoCodigo(pedidoCancelado.id)}: ${motivoNormalizado}`,
      metadados: {
        pedido_compra_id: pedidoCancelado.id,
        motivo: motivoNormalizado
      },
      transaction
    });

    await registrarHistoricoCompraNaSolicitacaoPrincipal({
      solicitacao: solicitacaoCompra,
      usuarioId,
      acao: 'COTACAO_COMPRA_CANCELADA',
      descricao: `Cotacao da ${solicitacaoCompra.codigo || `SC-${String(solicitacaoCompra.id).padStart(5, '0')}`} cancelada: ${motivoNormalizado}`,
      statusAnterior: solicitacaoCompra.status,
      statusNovo: cancelarSolicitacaoCompra ? 'CANCELADA' : solicitacaoCompra.status,
      metadados: {
        pedido_compra_id: pedidoCancelado.id,
        motivo: motivoNormalizado
      },
      transaction
    });
  }

  if (cancelarSolicitacaoCompra) {
    const statusAnteriorCompra = solicitacaoCompra.status;
    await solicitacaoCompra.update(
      {
        status: 'CANCELADA',
        encerrado_em: new Date()
      },
      { transaction }
    );

    await registrarLogSolicitacaoCompra({
      solicitacaoCompraId: solicitacaoCompra.id,
      usuarioId,
      tipoAcao: 'SOLICITACAO_COMPRA_CANCELADA',
      descricao: `${solicitacaoCompra.codigo || `SC-${String(solicitacaoCompra.id).padStart(5, '0')}`} cancelada junto com ${buildPedidoCodigo(pedidoCancelado.id)}: ${motivoNormalizado}`,
      metadados: {
        pedido_compra_id: pedidoCancelado.id,
        motivo: motivoNormalizado
      },
      transaction
    });

    await registrarHistoricoCompraNaSolicitacaoPrincipal({
      solicitacao: solicitacaoCompra,
      usuarioId,
      acao: 'SOLICITACAO_COMPRA_CANCELADA',
      descricao: `${solicitacaoCompra.codigo || `SC-${String(solicitacaoCompra.id).padStart(5, '0')}`} cancelada: ${motivoNormalizado}`,
      statusAnterior: statusAnteriorCompra,
      statusNovo: 'CANCELADA',
      metadados: {
        pedido_compra_id: pedidoCancelado.id,
        motivo: motivoNormalizado
      },
      transaction
    });
  }

  if (cancelarSolicitacaoPrincipal) {
    const solicitacaoPrincipalId = Number(solicitacaoCompra.solicitacao_principal_id || 0);
    if (solicitacaoPrincipalId) {
      const titulosAtivos = await TituloFinanceiro.count({
        where: {
          solicitacao_id: solicitacaoPrincipalId,
          deleted_at: null
        },
        transaction
      });

      if (titulosAtivos > 0) {
        throw new Error('A solicitacao principal possui titulo financeiro vinculado. Cancele apenas o pedido/compra ou trate o financeiro antes.');
      }

      const solicitacaoPrincipal = await Solicitacao.findByPk(solicitacaoPrincipalId, {
        transaction,
        lock: transaction?.LOCK?.UPDATE
      });

      if (solicitacaoPrincipal && normalizeText(solicitacaoPrincipal.status_global) !== 'CANCELADA') {
        const statusAnteriorPrincipal = solicitacaoPrincipal.status_global;
        await solicitacaoPrincipal.update(
          {
            status_global: 'CANCELADA'
          },
          { transaction }
        );

        await Historico.create(
          {
            solicitacao_id: solicitacaoPrincipal.id,
            usuario_responsavel_id: usuarioId || null,
            setor: 'COMPRAS',
            acao: 'SOLICITACAO_CANCELADA_POR_COMPRA',
            status_anterior: statusAnteriorPrincipal || null,
            status_novo: 'CANCELADA',
            observacao: `Solicitacao cancelada junto com ${buildPedidoCodigo(pedidoCancelado.id)}: ${motivoNormalizado}`,
            descricao: `Solicitacao cancelada junto com ${buildPedidoCodigo(pedidoCancelado.id)}: ${motivoNormalizado}`,
            metadata: JSON.stringify({
              tipo: 'CANCELAMENTO_FLUXO_COMPRA',
              pedido_compra_id: pedidoCancelado.id,
              solicitacao_compra_id: solicitacaoCompra.id,
              motivo: motivoNormalizado
            })
          },
          { transaction }
        );
      }
    }
  }

  return recalcularPedidoPorId(pedidoCancelado.id, transaction);
}

async function cancelarPedidoItens({ pedidoId, itens = [], motivo, usuarioId, transaction }) {
  await assertPedidoEditavel(pedidoId, transaction);
  const ids = [...new Set((Array.isArray(itens) ? itens : [itens])
    .map((item) => Number(item?.item_id || item?.id || item))
    .filter((item) => item > 0))];

  if (!ids.length) {
    throw new Error('Selecione ao menos um item para cancelar.');
  }

  const motivoNormalizado = String(motivo || '').trim();
  const pedido = await PedidoCompra.findByPk(Number(pedidoId), { transaction });
  const itensPedido = await PedidoCompraItem.findAll({
    where: { pedido_compra_id: Number(pedidoId), id: { [Op.in]: ids } },
    transaction
  });

  for (const item of itensPedido) {
    if (item.removido) continue;

    await item.update(
      {
        removido: true,
        quantidade_cancelada: item.quantidade_pedido,
        cancelado_por: usuarioId || null,
        cancelado_em: new Date(),
        motivo_cancelamento: motivoNormalizado || null
      },
      { transaction }
    );

    await SolicitacaoCompraAlocacao.update(
      {
        status: 'CANCELADA',
        cancelado_por: usuarioId || null,
        cancelado_em: new Date(),
        motivo_cancelamento: motivoNormalizado || null
      },
      { where: { pedido_compra_item_id: item.id, status: 'ATIVA' }, transaction }
    );

    await registrarLogPedidoItem({
      pedidoCompraId: Number(pedidoId),
      pedidoCompraItemId: item.id,
      usuarioId,
      acao: 'ITEM_CANCELADO',
      descricao: motivoNormalizado
        ? `Item ${item.descricao} cancelado: ${motivoNormalizado}`
        : `Item ${item.descricao} cancelado`,
      dadosAnteriores: { removido: false, quantidade_pedido: item.quantidade_pedido },
      dadosNovos: { removido: true, motivo: motivoNormalizado || null },
      transaction
    });
  }

  if (pedido && itensPedido.length) {
    const solicitacao = await SolicitacaoCompra.findByPk(pedido.solicitacao_compra_id, { transaction });
    await registrarHistoricoPedidoNaSolicitacaoPrincipal({
      solicitacao,
      pedido,
      usuarioId,
      acao: 'PEDIDO_COMPRA_ITENS_CANCELADOS',
      descricao: motivoNormalizado
        ? `${buildPedidoCodigo(pedido.id)} teve item(ns) cancelado(s): ${motivoNormalizado}`
        : `${buildPedidoCodigo(pedido.id)} teve item(ns) cancelado(s)`,
      metadados: {
        itens_ids: itensPedido.map((item) => item.id),
        motivo: motivoNormalizado || null
      },
      transaction
    });
  }

  return recalcularPedidoPorId(pedidoId, transaction);
}

async function registrarComentarioPedido({ pedidoId, comentario, usuarioId, transaction }) {
  const pedido = await PedidoCompra.findByPk(Number(pedidoId), { transaction });
  if (!pedido) {
    throw new Error('Pedido nao encontrado.');
  }

  const texto = String(comentario || '').trim();
  if (!texto) {
    throw new Error('Informe um comentario.');
  }

  await registrarLogSolicitacaoCompra({
    solicitacaoCompraId: pedido.solicitacao_compra_id,
    usuarioId,
    fornecedorCompraId: pedido.fornecedor_compra_id,
    tipoAcao: 'COMENTARIO_PEDIDO',
    descricao: texto,
    metadados: { pedido_compra_id: pedido.id },
    transaction
  });

  const solicitacao = await SolicitacaoCompra.findByPk(pedido.solicitacao_compra_id, { transaction });
  await registrarHistoricoPedidoNaSolicitacaoPrincipal({
    solicitacao,
    pedido,
    usuarioId,
    acao: 'PEDIDO_COMPRA_COMENTARIO',
    descricao: texto,
    metadados: { comentario: texto },
    transaction
  });

  return true;
}

async function anexarEspelhoFornecedorPedido({ pedidoId, arquivoUrl, arquivoNome, usuarioId, transaction }) {
  const pedido = await PedidoCompra.findByPk(Number(pedidoId), { transaction });
  if (!pedido) {
    throw new Error('Pedido nao encontrado.');
  }

  const url = String(arquivoUrl || '').trim();
  if (!url) {
    throw new Error('Informe o arquivo do espelho do fornecedor.');
  }

  await pedido.update(
    {
      espelho_fornecedor_url: url,
      espelho_fornecedor_nome: String(arquivoNome || '').trim() || null,
      espelho_fornecedor_em: new Date()
    },
    { transaction }
  );

  await registrarLogSolicitacaoCompra({
    solicitacaoCompraId: pedido.solicitacao_compra_id,
    usuarioId,
    fornecedorCompraId: pedido.fornecedor_compra_id,
    tipoAcao: 'ESPELHO_PEDIDO_ANEXADO',
    descricao: `${buildPedidoCodigo(pedido.id)} recebeu espelho do pedido do fornecedor`,
    metadados: {
      pedido_compra_id: pedido.id,
      arquivo_url: url,
      arquivo_nome: arquivoNome || null
    },
    transaction
  });

  const solicitacao = await SolicitacaoCompra.findByPk(pedido.solicitacao_compra_id, { transaction });
  await registrarHistoricoPedidoNaSolicitacaoPrincipal({
    solicitacao,
    pedido,
    usuarioId,
    acao: 'PEDIDO_COMPRA_ESPELHO_ANEXADO',
    descricao: `${buildPedidoCodigo(pedido.id)} recebeu espelho do pedido do fornecedor`,
    metadados: {
      arquivo_url: url,
      arquivo_nome: arquivoNome || null
    },
    transaction
  });

  return pedido;
}

async function delegarSolicitacaoCompra({
  solicitacaoId,
  responsavelId,
  prazoCompra,
  motivoAtraso,
  motivoDelegacaoVencida,
  usuarioId,
  somenteMotivo = false,
  transaction
}) {
  const solicitacao = await SolicitacaoCompra.findByPk(Number(solicitacaoId), { transaction });
  if (!solicitacao) {
    throw new Error('Solicitacao de compra nao encontrada.');
  }
  if (normalizeText(solicitacao.origem) === 'COMPRA_DIRETA') {
    throw new Error('Compra Direta segue pelo fluxo da solicitacao principal e nao deve ser delegada no modulo de Compras.');
  }

  const motivoNormalizado = motivoAtraso ? String(motivoAtraso).trim() : '';
  const motivoDelegacaoVencidaNormalizado = motivoDelegacaoVencida ? String(motivoDelegacaoVencida).trim() : '';

  if (somenteMotivo) {
    if (!motivoNormalizado) {
      throw new Error('Informe o motivo do atraso.');
    }

    await solicitacao.update(
      {
        motivo_atraso: motivoNormalizado,
        motivo_atraso_em: new Date()
      },
      { transaction }
    );

    await PedidoCompra.update(
      {
        motivo_atraso: motivoNormalizado,
        motivo_atraso_em: new Date()
      },
      { where: { solicitacao_compra_id: solicitacao.id }, transaction }
    );

    await registrarLogSolicitacaoCompra({
      solicitacaoCompraId: solicitacao.id,
      usuarioId,
      tipoAcao: 'MOTIVO_ATRASO_COMPRA',
      descricao: 'Motivo de atraso informado pelo responsavel da compra',
      metadados: {
        motivo_atraso: motivoNormalizado
      },
      transaction
    });

    return solicitacao;
  }

  if (isDateOnlyPast(prazoCompra) && !motivoDelegacaoVencidaNormalizado) {
    throw new Error('Informe o motivo para delegar uma solicitacao com prazo ja vencido.');
  }

  await solicitacao.update(
    {
      comprador_responsavel_id: responsavelId ? Number(responsavelId) : null,
      prazo_compra: prazoCompra || null,
      delegado_por: usuarioId || null,
      delegado_em: new Date(),
      motivo_atraso: motivoNormalizado || solicitacao.motivo_atraso,
      motivo_atraso_em: motivoNormalizado ? new Date() : solicitacao.motivo_atraso_em,
      motivo_delegacao_vencida: motivoDelegacaoVencidaNormalizado || solicitacao.motivo_delegacao_vencida,
      motivo_delegacao_vencida_em: motivoDelegacaoVencidaNormalizado
        ? new Date()
        : solicitacao.motivo_delegacao_vencida_em
    },
    { transaction }
  );

  const pedidoUpdate = {
    atribuido_a: responsavelId ? Number(responsavelId) : null,
    prazo_finalizacao: prazoCompra || null,
    delegado_por: usuarioId || null,
    delegado_em: new Date()
  };
  if (motivoNormalizado) {
    pedidoUpdate.motivo_atraso = motivoNormalizado;
    pedidoUpdate.motivo_atraso_em = new Date();
  }
  if (motivoDelegacaoVencidaNormalizado) {
    pedidoUpdate.motivo_delegacao_vencida = motivoDelegacaoVencidaNormalizado;
    pedidoUpdate.motivo_delegacao_vencida_em = new Date();
  }

  await PedidoCompra.update(pedidoUpdate, { where: { solicitacao_compra_id: solicitacao.id }, transaction });

  await registrarLogSolicitacaoCompra({
    solicitacaoCompraId: solicitacao.id,
    usuarioId,
    tipoAcao: 'DELEGACAO_COMPRA',
    descricao: responsavelId
      ? `Solicitacao atribuida ao usuario #${responsavelId}`
      : 'Responsavel de compras removido da solicitacao',
    metadados: {
      responsavel_id: responsavelId || null,
      prazo_compra: prazoCompra || null,
      motivo_atraso: motivoNormalizado || null,
      motivo_delegacao_vencida: motivoDelegacaoVencidaNormalizado || null
    },
    transaction
  });

  await registrarHistoricoCompraNaSolicitacaoPrincipal({
    solicitacao,
    usuarioId,
    acao: 'SOLICITACAO_COMPRA_DELEGADA',
    descricao: responsavelId
      ? `Compras atribuiu a solicitacao ao usuario #${responsavelId}${prazoCompra ? ` com prazo ${prazoCompra}` : ''}`
      : 'Compras removeu o responsavel da solicitacao',
    metadados: {
      responsavel_id: responsavelId || null,
      prazo_compra: prazoCompra || null,
      motivo_atraso: motivoNormalizado || null,
      motivo_delegacao_vencida: motivoDelegacaoVencidaNormalizado || null
    },
    transaction
  });

  return solicitacao;
}

async function atualizarStatusPedidosEmLote({ pedidoIds = [], status, usuarioId, transaction }) {
  const ids = [...new Set((Array.isArray(pedidoIds) ? pedidoIds : [])
    .map((item) => Number(item))
    .filter((item) => item > 0))];

  if (!ids.length) {
    throw new Error('Selecione ao menos um pedido.');
  }

  const atualizados = [];
  for (const pedidoId of ids) {
    await atualizarStatusPedido({ pedidoId, status, usuarioId, transaction });
    atualizados.push(pedidoId);
  }

  return atualizados;
}

async function reduzirAlocacoesAtivasDoItem({ pedidoItemId, quantidade, usuarioId, motivo, transaction }) {
  let restante = roundQty(quantidade);
  const alocacoes = await SolicitacaoCompraAlocacao.findAll({
    where: {
      pedido_compra_item_id: Number(pedidoItemId),
      status: 'ATIVA'
    },
    order: [['id', 'ASC']],
    transaction
  });

  for (const alocacao of alocacoes) {
    if (restante <= 0) break;
    const quantidadeAtual = roundQty(alocacao.quantidade_alocada);
    const reduzir = Math.min(quantidadeAtual, restante);
    const proximaQuantidade = roundQty(quantidadeAtual - reduzir);
    restante = roundQty(restante - reduzir);

    if (proximaQuantidade <= 0) {
      await alocacao.update(
        {
          status: 'CANCELADA',
          cancelado_por: usuarioId || null,
          cancelado_em: new Date(),
          motivo_cancelamento: motivo || 'Item remanejado para outro fornecedor'
        },
        { transaction }
      );
    } else {
      await alocacao.update(
        {
          quantidade_alocada: proximaQuantidade,
          valor_total: roundMoney(proximaQuantidade * asNumber(alocacao.preco_unitario))
        },
        { transaction }
      );
    }
  }
}

async function remanejarPedidoItem({ pedidoId, itemId, respostaItemIdDestino, quantidade, motivo, usuarioId, transaction }) {
  const pedidoOrigem = await assertPedidoEditavel(pedidoId, transaction);
  const itemOrigem = await PedidoCompraItem.findOne({
    where: { id: Number(itemId), pedido_compra_id: Number(pedidoId), removido: false },
    transaction
  });
  if (!itemOrigem) {
    throw new Error('Item de origem nao encontrado.');
  }

  const quantidadeRemanejada = roundPedidoQty(quantidade || itemOrigem.quantidade_pedido);
  if (quantidadeRemanejada <= 0 || quantidadeRemanejada > roundPedidoQty(itemOrigem.quantidade_pedido)) {
    throw new Error('Quantidade remanejada invalida para o item de origem.');
  }

  const solicitacao = await carregarSolicitacaoPedidos(pedidoOrigem.solicitacao_compra_id, transaction);
  const respostaDestino = (solicitacao?.fornecedores || [])
    .flatMap((fornecedor) => (fornecedor.respostas || []).map((resposta) => ({ fornecedor, resposta })))
    .find(({ resposta }) => Number(resposta.id) === Number(respostaItemIdDestino));

  if (!respostaDestino) {
    throw new Error('Resposta de destino nao encontrada na cotacao.');
  }

  if (!fornecedorRespondeuCotacao(respostaDestino.fornecedor)) {
    throw new Error('Fornecedor de destino ainda nao respondeu esta cotacao.');
  }

  if (Number(respostaDestino.fornecedor.fornecedor_compra_id) === Number(pedidoOrigem.fornecedor_compra_id)) {
    throw new Error('Selecione um fornecedor de destino diferente do fornecedor atual.');
  }

  if (buildItemKeyFromResposta(respostaDestino.resposta) !== buildItemKeyFromPedidoItem(itemOrigem)) {
    throw new Error('Resposta de destino nao pertence ao mesmo item do pedido.');
  }

  if (!respostaDestino.resposta.disponivel || asNumber(respostaDestino.resposta.preco) <= 0) {
    throw new Error('Resposta de destino precisa estar disponivel e possuir preco.');
  }

  const fornecedorDestino = respostaDestino.fornecedor;
  const pedidoDestino = await obterOuCriarPedidoPorFornecedor({
    solicitacao,
    vinculacaoFornecedor: fornecedorDestino,
    usuarioId,
    transaction
  });

  await adicionarRespostasAoPedido({
    pedido: pedidoDestino,
    solicitacao,
    vinculacaoFornecedor: fornecedorDestino,
    respostaItemIds: [Number(respostaItemIdDestino)],
    quantidadesPorResposta: new Map([[Number(respostaItemIdDestino), quantidadeRemanejada]]),
    somarQuantidadeExistente: true,
    usuarioId,
    acaoLog: 'ITEM_REMANEJADO_ENTRADA',
    descricaoLog: 'Item recebido por remanejamento',
    transaction
  });

  const pedidoDestinoAtualizado = await recalcularPedidoPorId(pedidoDestino.id, transaction);
  const itemDestino = (pedidoDestinoAtualizado?.itens || []).find(
    (item) => Number(item.resposta_item_id || 0) === Number(respostaItemIdDestino)
  );
  const baseDestino = obterBaseItemPorResposta(solicitacao, respostaDestino.resposta);
  if (itemDestino && baseDestino) {
    await SolicitacaoCompraAlocacao.create(
      {
        solicitacao_compra_id: solicitacao.id,
        resposta_item_id: Number(respostaItemIdDestino),
        fornecedor_compra_id: fornecedorDestino.fornecedor_compra_id,
        item_tipo: baseDestino.item_tipo,
        solicitacao_compra_item_id: baseDestino.solicitacao_compra_item_id,
        solicitacao_compra_item_manual_id: baseDestino.solicitacao_compra_item_manual_id,
        quantidade_alocada: quantidadeRemanejada,
        preco_unitario: roundMoney(respostaDestino.resposta.preco),
        valor_total: roundMoney(quantidadeRemanejada * asNumber(respostaDestino.resposta.preco)),
        pedido_compra_id: pedidoDestino.id,
        pedido_compra_item_id: itemDestino.id,
        status: 'ATIVA',
        criado_por: usuarioId || null
      },
      { transaction }
    );
  }

  const quantidadeRestante = roundPedidoQty(asNumber(itemOrigem.quantidade_pedido) - quantidadeRemanejada);
  await itemOrigem.update(
    {
      quantidade_pedido: quantidadeRestante,
      valor_total: roundMoney(quantidadeRestante * asNumber(itemOrigem.preco_unitario)),
      removido: quantidadeRestante <= 0,
      quantidade_cancelada: roundPedidoQty(asNumber(itemOrigem.quantidade_cancelada) + quantidadeRemanejada),
      motivo_cancelamento: String(motivo || '').trim() || itemOrigem.motivo_cancelamento || null
    },
    { transaction }
  );

  await reduzirAlocacoesAtivasDoItem({
    pedidoItemId: itemOrigem.id,
    quantidade: quantidadeRemanejada,
    usuarioId,
    motivo: String(motivo || '').trim() || 'Item remanejado para outro fornecedor',
    transaction
  });

  await registrarLogPedidoItem({
    pedidoCompraId: pedidoOrigem.id,
    pedidoCompraItemId: itemOrigem.id,
    usuarioId,
    acao: 'ITEM_REMANEJADO_SAIDA',
    descricao: `Remanejados ${quantidadeRemanejada} de ${itemOrigem.descricao} para outro fornecedor`,
    dadosNovos: {
      quantidade_remanejada: quantidadeRemanejada,
      resposta_item_destino_id: respostaItemIdDestino,
      motivo: motivo || null
    },
    transaction
  });

  await recalcularPedidoPorId(pedidoDestino.id, transaction);
  return recalcularPedidoPorId(pedidoOrigem.id, transaction);
}

module.exports = {
  atualizarPedidoItem,
  atualizarStatusPedido,
  atualizarStatusPedidosEmLote,
  anexarEspelhoFornecedorPedido,
  cancelarFluxoPedidoCompra,
  cancelarPedidoCompra,
  cancelarPedidoItens,
  criarPedidoParaFornecedor,
  delegarSolicitacaoCompra,
  fecharPedidosDaSolicitacaoCompraAutomaticamente,
  gerarPedidosDosVencedores,
  isSolicitacaoCompraComPedidosFechadosComFornecedor,
  listarAuditoriaItensPedido,
  listarPedidos,
  obterPedidoDetalhe,
  reabrirPedidoParaCotacao,
  registrarComentarioPedido,
  remanejarPedidoItem,
  removerPedidoItem,
  adicionarRespostaAoPedido
};
