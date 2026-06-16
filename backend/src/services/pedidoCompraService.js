const { Op } = require('sequelize');
const {
  FornecedorCompra,
  Historico,
  Obra,
  PedidoCompra,
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
      preco: { [Op.not]: null }
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

async function carregarSolicitacaoPedidos(id, transaction) {
  return SolicitacaoCompra.findByPk(id, {
    transaction,
    include: [
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
        `Quantidade alocada para ${baseItem.descricao} excede a quantidade solicitada (${quantidadeBase}).`
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
        attributes: ['id', 'status', 'numero_sienge', 'necessario_para']
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

  const candidatosRemanejamento = (solicitacao?.fornecedores || [])
    .flatMap((fornecedor) => (fornecedor.respostas || []).map((resposta) => ({ fornecedor, resposta })))
    .filter(({ resposta }) => Boolean(resposta.disponivel) && asNumber(resposta.preco) > 0)
    .map(({ fornecedor, resposta }) => {
      const baseItem = obterBaseItemPorResposta(solicitacao, resposta);
      return {
        resposta_item_id: resposta.id,
        fornecedor_id: fornecedor.fornecedor_compra_id,
        fornecedor_nome: fornecedor.fornecedor?.nome || fornecedor.nome || 'Fornecedor',
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

  return {
    ...pedido.toJSON(),
    itens,
    status_configuracao: statusConfig,
    edicao_bloqueada: Boolean(statusConfig?.bloqueia_edicao),
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

async function cancelarPedidoCompra({ pedidoId, motivo, usuarioId, transaction }) {
  const pedido = await assertPedidoEditavel(pedidoId, transaction);
  const motivoNormalizado = String(motivo || '').trim();
  const statusAnterior = pedido.status;

  await pedido.update(
    {
      status: 'CANCELADO',
      cancelado_por: usuarioId || null,
      cancelado_em: new Date(),
      encerrado_em: new Date(),
      motivo_cancelamento: motivoNormalizado || null
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
        motivo_cancelamento: motivoNormalizado || null
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
      dadosNovos: { removido: true, motivo: motivoNormalizado || null },
      transaction
    });
  }

  await SolicitacaoCompraAlocacao.update(
    {
      status: 'CANCELADA',
      cancelado_por: usuarioId || null,
      cancelado_em: new Date(),
      motivo_cancelamento: motivoNormalizado || null
    },
    { where: { pedido_compra_id: pedido.id, status: 'ATIVA' }, transaction }
  );

  await registrarLogSolicitacaoCompra({
    solicitacaoCompraId: pedido.solicitacao_compra_id,
    usuarioId,
    fornecedorCompraId: pedido.fornecedor_compra_id,
    tipoAcao: 'PEDIDO_CANCELADO',
    descricao: motivoNormalizado
      ? `${buildPedidoCodigo(pedido.id)} cancelado: ${motivoNormalizado}`
      : `${buildPedidoCodigo(pedido.id)} cancelado`,
    metadados: { pedido_compra_id: pedido.id, motivo: motivoNormalizado || null },
    transaction
  });

  const solicitacao = await SolicitacaoCompra.findByPk(pedido.solicitacao_compra_id, { transaction });
  await registrarHistoricoPedidoNaSolicitacaoPrincipal({
    solicitacao,
    pedido,
    usuarioId,
    acao: 'PEDIDO_COMPRA_CANCELADO',
    descricao: motivoNormalizado
      ? `${buildPedidoCodigo(pedido.id)} cancelado: ${motivoNormalizado}`
      : `${buildPedidoCodigo(pedido.id)} cancelado`,
    statusAnterior,
    statusNovo: 'CANCELADO',
    metadados: { motivo: motivoNormalizado || null },
    transaction
  });

  return recalcularPedidoPorId(pedido.id, transaction);
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

async function delegarSolicitacaoCompra({ solicitacaoId, responsavelId, prazoCompra, motivoAtraso, usuarioId, transaction }) {
  const solicitacao = await SolicitacaoCompra.findByPk(Number(solicitacaoId), { transaction });
  if (!solicitacao) {
    throw new Error('Solicitacao de compra nao encontrada.');
  }

  await solicitacao.update(
    {
      comprador_responsavel_id: responsavelId ? Number(responsavelId) : null,
      prazo_compra: prazoCompra || null,
      delegado_por: usuarioId || null,
      delegado_em: new Date(),
      motivo_atraso: motivoAtraso ? String(motivoAtraso).trim() : solicitacao.motivo_atraso,
      motivo_atraso_em: motivoAtraso ? new Date() : solicitacao.motivo_atraso_em
    },
    { transaction }
  );

  await PedidoCompra.update(
    {
      atribuido_a: responsavelId ? Number(responsavelId) : null,
      prazo_finalizacao: prazoCompra || null,
      delegado_por: usuarioId || null,
      delegado_em: new Date(),
      motivo_atraso: motivoAtraso ? String(motivoAtraso).trim() : null,
      motivo_atraso_em: motivoAtraso ? new Date() : null
    },
    { where: { solicitacao_compra_id: solicitacao.id }, transaction }
  );

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
      motivo_atraso: motivoAtraso || null
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
      motivo_atraso: motivoAtraso || null
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
  cancelarPedidoCompra,
  cancelarPedidoItens,
  criarPedidoParaFornecedor,
  delegarSolicitacaoCompra,
  gerarPedidosDosVencedores,
  listarAuditoriaItensPedido,
  listarPedidos,
  obterPedidoDetalhe,
  registrarComentarioPedido,
  remanejarPedidoItem,
  removerPedidoItem,
  adicionarRespostaAoPedido
};
