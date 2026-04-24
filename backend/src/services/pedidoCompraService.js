const { Op } = require('sequelize');
const {
  FornecedorCompra,
  Obra,
  PedidoCompra,
  PedidoCompraItem,
  PedidoCompraItemLog,
  SolicitacaoCompra,
  SolicitacaoCompraFornecedor,
  SolicitacaoCompraItem,
  SolicitacaoCompraItemManual,
  SolicitacaoCompraRespostaItem,
  Unidade,
  User
} = require('../models');
const { registrarLogSolicitacaoCompra } = require('./comprasCotacao');
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

function buildRespostaKey(itemTipo, itemReferenciaId) {
  return `${normalizeText(itemTipo)}:${Number(itemReferenciaId)}`;
}

function buildPedidoCodigo(id) {
  return `PC-${String(id).padStart(5, '0')}`;
}

async function carregarSolicitacaoPedidos(id, transaction) {
  return SolicitacaoCompra.findByPk(id, {
    transaction,
    include: [
      { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo'] },
      {
        model: SolicitacaoCompraItem,
        as: 'itens',
        include: [{ model: Unidade, as: 'unidade', attributes: ['id', 'sigla'] }]
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
      }
    ]
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

  for (const item of itensAtivos) {
    const valorItem = roundMoney(asNumber(item.quantidade_pedido) * asNumber(item.preco_unitario));
    if (roundMoney(item.valor_total) !== valorItem) {
      await item.update({ valor_total: valorItem }, { transaction });
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

  return PedidoCompra.findByPk(pedidoId, {
    transaction,
    include: [
      { model: PedidoCompraItem, as: 'itens' },
      { model: FornecedorCompra, as: 'fornecedor', attributes: ['id', 'nome', 'email', 'whatsapp'] },
      { model: SolicitacaoCompra, as: 'solicitacao', attributes: ['id', 'status'] }
    ]
  });
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

  return pedido;
}

async function adicionarRespostasAoPedido({
  pedido,
  solicitacao,
  vinculacaoFornecedor,
  respostaItemIds = [],
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

  const respostasAtuais = new Set(
    itensAtuais
      .filter((item) => !item.removido)
      .map((item) => Number(item.resposta_item_id || 0))
      .filter((id) => id > 0)
  );

  for (const resposta of respostasSelecionadas) {
    if (respostasAtuais.has(Number(resposta.id))) {
      continue;
    }

    const baseItem = obterBaseItemPorResposta(solicitacao, resposta);
    if (!baseItem) {
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
        quantidade_pedido: baseItem.quantidade_solicitada,
        preco_unitario: roundMoney(resposta.preco),
        valor_total: roundMoney(baseItem.quantidade_solicitada * asNumber(resposta.preco)),
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

async function gerarPedidosDosVencedores({ solicitacaoId, usuarioId, transaction }) {
  const solicitacao = await carregarSolicitacaoPedidos(solicitacaoId, transaction);
  if (!solicitacao) {
    throw new Error('Solicitacao de compra nao encontrada.');
  }

  for (const vinculacaoFornecedor of solicitacao.fornecedores || []) {
    const respostaItemIds = (vinculacaoFornecedor.respostas || [])
      .filter((resposta) => resposta.vencedor)
      .map((resposta) => Number(resposta.id));

    if (!respostaItemIds.length) {
      continue;
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
      respostaItemIds,
      usuarioId,
      acaoLog: 'GERADO_DA_COTACAO',
      descricaoLog: 'Item gerado a partir da cotacao encerrada',
      transaction
    });
  }
}

async function criarPedidoParaFornecedor({ solicitacaoId, fornecedorCompraId, usuarioId, transaction }) {
  const solicitacao = await carregarSolicitacaoPedidos(solicitacaoId, transaction);
  if (!solicitacao) {
    throw new Error('Solicitacao de compra nao encontrada.');
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

async function listarPedidos({ solicitacaoId, obraId, status, q, obraIds = null } = {}) {
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
  }

  const pedidos = await PedidoCompra.findAll({
    where,
    include: [
      { model: FornecedorCompra, as: 'fornecedor', attributes: ['id', 'nome', 'email', 'whatsapp'] },
      { model: SolicitacaoCompra, as: 'solicitacao', attributes: ['id', 'status', 'numero_sienge'] },
      { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo'] },
      { model: PedidoCompraItem, as: 'itens', attributes: ['id', 'descricao', 'valor_total', 'removido'] }
    ],
    order: [['updatedAt', 'DESC']]
  });

  const filtro = String(q || '').trim().toLowerCase();
  return pedidos.filter((pedido) => {
    if (!filtro) return true;
    const haystack = [
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

async function obterPedidoDetalhe(id) {
  const pedido = await PedidoCompra.findByPk(id, {
    include: [
      { model: FornecedorCompra, as: 'fornecedor', attributes: ['id', 'nome', 'email', 'whatsapp', 'contato'] },
      { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo'] },
      { model: User, as: 'criador', attributes: ['id', 'nome', 'email'] },
      {
        model: SolicitacaoCompra,
        as: 'solicitacao',
        attributes: ['id', 'status', 'numero_sienge', 'necessario_para']
      },
      {
        model: PedidoCompraItem,
        as: 'itens',
        include: [
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
      }
    ]
  });

  if (!pedido) {
    return null;
  }

  const statusConfig = await findPedidoCompraStatusConfig(pedido.status);
  const solicitacao = await carregarSolicitacaoPedidos(pedido.solicitacao_compra_id);
  const respostaIdsAtuais = new Set(
    (pedido.itens || [])
      .filter((item) => !item.removido)
      .map((item) => Number(item.resposta_item_id || 0))
      .filter((idAtual) => idAtual > 0)
  );

  const vinculacaoFornecedor = (solicitacao?.fornecedores || []).find(
    (item) => Number(item.fornecedor_compra_id) === Number(pedido.fornecedor_compra_id)
  );

  const candidatos = (vinculacaoFornecedor?.respostas || [])
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

  return {
    ...pedido.toJSON(),
    status_configuracao: statusConfig,
    edicao_bloqueada: Boolean(statusConfig?.bloqueia_edicao),
    candidatos_adicao: candidatos
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

  return pedido;
}

module.exports = {
  atualizarPedidoItem,
  atualizarStatusPedido,
  criarPedidoParaFornecedor,
  gerarPedidosDosVencedores,
  listarAuditoriaItensPedido,
  listarPedidos,
  obterPedidoDetalhe,
  removerPedidoItem,
  adicionarRespostaAoPedido
};
