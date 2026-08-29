const { Op } = require('sequelize');
const {
  Apropriacao,
  CartaoRecarga,
  CartaoRecargaPrestacao,
  CartaoRecargaPrestacaoRateio,
  CartaoRecargaUsuario,
  Historico,
  Obra,
  Parceiro,
  Solicitacao,
  SolicitacaoRecargaCartao,
  TituloFinanceiro,
  TituloFinanceiroRateio,
  User,
  UsuarioObra,
  sequelize
} = require('../models');

const STATUS_CICLO = {
  PENDENTE: 'PENDENTE',
  AGUARDANDO_PAGAMENTO: 'AGUARDANDO_PAGAMENTO',
  PRESTACAO_PENDENTE: 'PRESTACAO_PENDENTE',
  PRESTACAO_ENVIADA: 'PRESTACAO_ENVIADA',
  VALIDADA: 'VALIDADA',
  CANCELADA: 'CANCELADA'
};

function erro(statusCode, message, code = null) {
  return Object.assign(new Error(message), { statusCode, code });
}

function normalizarToken(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
}

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function tipoEhRecargaCartao(tipo = {}) {
  const codigo = normalizarToken(tipo.codigo_interno || tipo.nome);
  if (codigo === 'RECARGA_DE_CARTAO' || codigo === 'RECARGA_CARTAO') return true;
  try {
    const comportamento = typeof tipo.comportamento === 'string'
      ? JSON.parse(tipo.comportamento || '{}')
      : (tipo.comportamento || {});
    return comportamento.usa_fluxo_recarga_cartao === true;
  } catch {
    return false;
  }
}

function isSuperadmin(user = {}) {
  return normalizarToken(user.perfil) === 'SUPERADMIN';
}

function isGerenciaProcessos(user = {}) {
  if (isSuperadmin(user)) return true;
  const tokens = [user.area, user.setor?.codigo, user.setor?.nome].map(normalizarToken);
  return tokens.some((token) => token === 'GEO' || (token.includes('GERENCIA') && token.includes('PROCESS')));
}

function assertSuperadmin(user) {
  if (!isSuperadmin(user)) throw erro(403, 'Somente SUPERADMIN pode gerenciar os cartoes de recarga.');
}

async function assertCartaoVinculado(cartaoId, userId, { transaction = null, lock = false } = {}) {
  const cartao = await CartaoRecarga.findOne({
    where: { id: Number(cartaoId), ativo: true },
    include: [{ model: Parceiro, as: 'parceiro', attributes: ['id', 'nome', 'ativo', 'fornecedor'] }],
    transaction,
    lock: lock && transaction ? transaction.LOCK.UPDATE : undefined
  });
  if (!cartao) throw erro(404, 'Cartao de recarga nao encontrado ou inativo.');
  if (!cartao.parceiro || cartao.parceiro.ativo === false || cartao.parceiro.fornecedor === false) {
    throw erro(400, 'O cartao precisa estar vinculado a um fornecedor ativo.');
  }

  const vinculo = await CartaoRecargaUsuario.findOne({
    where: { cartao_recarga_id: cartao.id, user_id: Number(userId), ativo: true },
    transaction,
    lock: lock && transaction ? transaction.LOCK.UPDATE : undefined
  });
  if (!vinculo) throw erro(403, 'Este cartao nao esta vinculado ao usuario.');
  return cartao;
}

const includeRecarga = [
  { model: CartaoRecarga, as: 'cartao', include: [{ model: Parceiro, as: 'parceiro', attributes: ['id', 'nome'] }] },
  { model: Solicitacao, as: 'solicitacao', attributes: ['id', 'codigo', 'criado_por', 'data_vencimento', 'status_global', 'obra_id'] },
  { model: TituloFinanceiro, as: 'titulo', attributes: ['id', 'codigo', 'status', 'valor_original', 'valor_baixado', 'valor_saldo', 'data_vencimento', 'considera_dre'] },
  {
    model: CartaoRecargaPrestacao,
    as: 'prestacao',
    required: false,
    include: [{
      model: CartaoRecargaPrestacaoRateio,
      as: 'rateios',
      required: false,
      include: [
        { model: Obra, as: 'obra', attributes: ['id', 'codigo', 'nome'] },
        { model: Apropriacao, as: 'apropriacao', attributes: ['id', 'codigo', 'descricao'] }
      ]
    }]
  }
];

async function buscarUltimaRecarga(cartaoId, options = {}) {
  return SolicitacaoRecargaCartao.findOne({
    where: { cartao_recarga_id: Number(cartaoId) },
    include: includeRecarga,
    order: [['createdAt', 'DESC']],
    transaction: options.transaction || null,
    lock: options.lock && options.transaction ? options.transaction.LOCK.UPDATE : undefined
  });
}

function motivoBloqueio(recarga) {
  if (!recarga) return null;
  const ciclo = normalizarToken(recarga.status_ciclo);
  if (ciclo === STATUS_CICLO.CANCELADA || ciclo === STATUS_CICLO.VALIDADA) return null;
  const tituloStatus = normalizarToken(recarga.titulo?.status);
  if (tituloStatus === 'PREVISAO') return 'A recarga anterior ainda esta em analise.';
  if (tituloStatus === 'ABERTO' || tituloStatus === 'PARCIAL') return 'A recarga anterior ainda possui pagamento pendente.';
  if (Number(recarga.valor_efetivo || recarga.titulo?.valor_baixado || 0) > 0) {
    const statusPrestacao = normalizarToken(recarga.prestacao?.status || 'PENDENTE');
    if (statusPrestacao === 'ENVIADA') return 'A prestacao de contas anterior aguarda validacao da Gerencia de Processos.';
    if (statusPrestacao === 'REJEITADA') return 'A prestacao de contas anterior foi rejeitada e precisa ser corrigida.';
    return 'Preste contas da recarga anterior antes de solicitar uma nova.';
  }
  return 'Ja existe uma solicitacao ativa para este cartao.';
}

async function listarObrasDoUsuario(userId, transaction = null) {
  const vinculos = await UsuarioObra.findAll({
    where: { user_id: Number(userId) },
    include: [{ model: Obra, as: 'obra', attributes: ['id', 'codigo', 'nome', 'tipo_centro_custo'] }],
    order: [[{ model: Obra, as: 'obra' }, 'nome', 'ASC']],
    transaction
  });
  return vinculos.map((item) => item.obra).filter(Boolean);
}

async function calcularMedia(cartaoId) {
  const ciclos = await SolicitacaoRecargaCartao.findAll({
    where: {
      cartao_recarga_id: Number(cartaoId),
      status_ciclo: STATUS_CICLO.VALIDADA,
      valor_efetivo: { [Op.gt]: 0 }
    },
    attributes: ['valor_efetivo', 'updatedAt'],
    order: [['updatedAt', 'DESC']],
    limit: 6,
    raw: true
  });
  const total = ciclos.reduce((acc, item) => acc + Number(item.valor_efetivo || 0), 0);
  return {
    valor: ciclos.length ? roundCurrency(total / ciclos.length) : 0,
    quantidade: ciclos.length,
    criterio: 'ULTIMAS_6_VALIDADAS'
  };
}

function serializarContexto(recarga, { obras = [], media = null, podeValidar = false } = {}) {
  const bloqueio = motivoBloqueio(recarga);
  return {
    bloqueado: Boolean(bloqueio),
    motivo_bloqueio: bloqueio,
    ultima_recarga: recarga || null,
    obras_disponiveis: obras,
    media_recarga: media,
    pode_validar: podeValidar
  };
}

async function listarMeusCartoes(user) {
  const vinculos = await CartaoRecargaUsuario.findAll({
    where: { user_id: Number(user.id), ativo: true },
    include: [{
      model: CartaoRecarga,
      as: 'cartao',
      where: { ativo: true },
      include: [{ model: Parceiro, as: 'parceiro', attributes: ['id', 'nome'] }]
    }],
    order: [[{ model: CartaoRecarga, as: 'cartao' }, 'nome', 'ASC']]
  });
  return vinculos.map((item) => item.cartao).filter(Boolean);
}

async function obterContextoCartao(cartaoId, user) {
  await assertCartaoVinculado(cartaoId, user.id);
  const recarga = await buscarUltimaRecarga(cartaoId);
  const obras = recarga ? await listarObrasDoUsuario(recarga.solicitacao?.criado_por || user.id) : [];
  return serializarContexto(recarga, { obras });
}

async function executarCriacaoRecargaComControle({ cartaoId, user, dadosSolicitacao, transaction: externalTransaction = null }) {
  const executar = async (transaction) => {
    const cartao = await assertCartaoVinculado(cartaoId, user.id, { transaction, lock: true });
    const anterior = await buscarUltimaRecarga(cartao.id, { transaction, lock: true });
    const bloqueio = motivoBloqueio(anterior);
    if (bloqueio) throw erro(409, bloqueio, 'RECARGA_CARTAO_BLOQUEADA');

    const valor = roundCurrency(dadosSolicitacao.valor);
    if (valor <= 0) throw erro(400, 'Informe um valor de recarga maior que zero.');
    if (!dadosSolicitacao.data_vencimento) throw erro(400, 'Informe a data prevista para recarga.');

    const obra = await Obra.findByPk(dadosSolicitacao.obra_id, {
      attributes: ['id', 'empresa_grupo_id'],
      transaction
    });
    if (!obra?.empresa_grupo_id) {
      throw erro(400, 'A obra de origem precisa ter uma empresa do grupo vinculada para gerar o titulo.');
    }

    const solicitacao = await Solicitacao.create({
      ...dadosSolicitacao,
      parceiro_id: cartao.parceiro_id,
      apropriacao_id: null,
      descricao: `Recarga ${cartao.nome} final ${cartao.ultimos_quatro}`
    }, { transaction });

    const titulo = await TituloFinanceiro.create({
      solicitacao_id: solicitacao.id,
      obra_id: null,
      apropriacao_id: null,
      empresa_id: obra.empresa_grupo_id,
      parceiro_id: cartao.parceiro_id,
      categoria_financeira_id: null,
      forma_pagamento_id: null,
      competencia_data: dadosSolicitacao.data_vencimento,
      considera_dre: false,
      possui_rateio: false,
      origem_titulo: 'RECARGA_CARTAO',
      tipo: 'PAGAR',
      status: 'PREVISAO',
      descricao: `Recarga Flash - ${cartao.nome} final ${cartao.ultimos_quatro}`.slice(0, 255),
      valor_original: valor,
      valor_bruto: valor,
      valor_impostos: 0,
      valor_liquido: valor,
      valor_saldo: valor,
      valor_baixado: 0,
      data_emissao: new Date().toISOString().slice(0, 10),
      data_vencimento: dadosSolicitacao.data_vencimento,
      data_quitacao: null,
      criado_por: user.id,
      atualizado_por: user.id
    }, { transaction });

    const recarga = await SolicitacaoRecargaCartao.create({
      solicitacao_id: solicitacao.id,
      cartao_recarga_id: cartao.id,
      titulo_financeiro_id: titulo.id,
      valor_solicitado: valor,
      valor_efetivo: 0,
      valor_nao_recarregado: 0,
      status_ciclo: STATUS_CICLO.PENDENTE,
      criado_por: user.id,
      atualizado_por: user.id
    }, { transaction });

    return { resultado: solicitacao, titulo, recarga, cartao };
  };
  return externalTransaction ? executar(externalTransaction) : sequelize.transaction(executar);
}

async function sincronizarTituloComStatusSolicitacao(solicitacaoId, status, userId = null, externalTransaction = null) {
  const statusNormalizado = normalizarToken(status);
  if (!['LIBERADO', 'APROVADA', 'CANCELADA', 'REJEITADA'].includes(statusNormalizado)) return null;
  const executar = async (transaction) => {
    const recarga = await SolicitacaoRecargaCartao.findOne({
      where: { solicitacao_id: Number(solicitacaoId) },
      include: [{ model: TituloFinanceiro, as: 'titulo' }],
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!recarga?.titulo) return null;

    if (['LIBERADO', 'APROVADA'].includes(statusNormalizado) && recarga.titulo.status === 'PREVISAO') {
      await recarga.titulo.update({ status: 'ABERTO', atualizado_por: userId }, { transaction });
      await recarga.update({ status_ciclo: STATUS_CICLO.AGUARDANDO_PAGAMENTO, atualizado_por: userId }, { transaction });
      return 'ABERTO';
    }

    if (['CANCELADA', 'REJEITADA'].includes(statusNormalizado) && Number(recarga.titulo.valor_baixado || 0) <= 0) {
      await recarga.titulo.update({ status: 'CANCELADO', valor_saldo: 0, atualizado_por: userId }, { transaction });
      await recarga.update({ status_ciclo: STATUS_CICLO.CANCELADA, atualizado_por: userId }, { transaction });
      return 'CANCELADO';
    }
    return null;
  };
  return externalTransaction ? executar(externalTransaction) : sequelize.transaction(executar);
}

async function sincronizarCicloAposBaixa({ solicitacaoId, usuarioId, setor, transaction }) {
  const recarga = await SolicitacaoRecargaCartao.findOne({
    where: { solicitacao_id: Number(solicitacaoId) },
    include: [{ model: TituloFinanceiro, as: 'titulo' }],
    transaction,
    lock: transaction?.LOCK?.UPDATE
  });
  if (!recarga?.titulo) return null;

  const pago = roundCurrency(recarga.titulo.valor_baixado);
  if (pago <= 0) return null;
  const solicitado = roundCurrency(recarga.valor_solicitado);
  const parcial = pago < solicitado;

  if (parcial) {
    await recarga.titulo.update({
      valor_original: pago,
      valor_bruto: pago,
      valor_liquido: pago,
      valor_saldo: 0,
      status: 'QUITADO',
      data_quitacao: new Date().toISOString().slice(0, 10),
      atualizado_por: usuarioId
    }, { transaction });
  }

  await recarga.update({
    valor_efetivo: pago,
    valor_nao_recarregado: roundCurrency(Math.max(solicitado - pago, 0)),
    status_ciclo: STATUS_CICLO.PRESTACAO_PENDENTE,
    atualizado_por: usuarioId
  }, { transaction });

  const [prestacao] = await CartaoRecargaPrestacao.findOrCreate({
    where: { solicitacao_recarga_id: recarga.id },
    defaults: { valor_base: pago, status: 'PENDENTE' },
    transaction
  });
  if (roundCurrency(prestacao.valor_base) !== pago || prestacao.status === 'VALIDADA') {
    await prestacao.update({
      valor_base: pago,
      status: 'PENDENTE',
      motivo_rejeicao: null,
      validado_por: null,
      validado_em: null
    }, { transaction });
  }

  const solicitacao = await Solicitacao.findByPk(solicitacaoId, { transaction, lock: transaction?.LOCK?.UPDATE });
  const statusNovo = parcial ? 'PARCIALMENTE PAGO' : 'PAGA';
  const statusAnterior = solicitacao?.status_global || null;
  if (solicitacao && normalizarToken(statusAnterior) !== normalizarToken(statusNovo)) {
    await solicitacao.update({ status_global: statusNovo }, { transaction });
    await Historico.create({
      solicitacao_id: solicitacao.id,
      usuario_responsavel_id: usuarioId || null,
      setor: setor || solicitacao.area_responsavel || 'FINANCEIRO',
      acao: 'RECARGA_CARTAO_ENCERRADA',
      status_anterior: statusAnterior,
      status_novo: statusNovo,
      observacao: parcial
        ? `Recarga encerrada pelo valor efetivamente pago: R$ ${pago.toFixed(2)}.`
        : 'Recarga paga integralmente. Prestacao de contas pendente.'
    }, { transaction });
  }
  return statusNovo;
}

async function carregarRecargaPorSolicitacao(solicitacaoId, transaction = null) {
  return SolicitacaoRecargaCartao.findOne({
    where: { solicitacao_id: Number(solicitacaoId) },
    include: includeRecarga,
    transaction
  });
}

async function obterContextoSolicitacao(solicitacaoId, user) {
  const recarga = await carregarRecargaPorSolicitacao(solicitacaoId);
  if (!recarga) throw erro(404, 'Esta solicitacao nao pertence ao fluxo de Recarga de Cartao.');
  const vinculado = await CartaoRecargaUsuario.findOne({
    where: { cartao_recarga_id: recarga.cartao_recarga_id, user_id: Number(user.id), ativo: true }
  });
  const podeValidar = isGerenciaProcessos(user);
  if (!vinculado && !podeValidar && Number(recarga.solicitacao?.criado_por) !== Number(user.id)) {
    throw erro(403, 'Acesso negado a esta recarga.');
  }
  const obras = await listarObrasDoUsuario(recarga.solicitacao?.criado_por || recarga.criado_por);
  const media = podeValidar ? await calcularMedia(recarga.cartao_recarga_id) : null;
  return serializarContexto(recarga, { obras, media, podeValidar });
}

function normalizarRateios(rateios = []) {
  if (!Array.isArray(rateios) || rateios.length === 0) throw erro(400, 'Informe ao menos um rateio da prestacao de contas.');
  if (rateios.length > 50) throw erro(400, 'A prestacao excede o limite de 50 linhas de rateio.');
  return rateios.map((item, index) => {
    const obraId = Number(item?.obra_id);
    const apropriacaoId = Number(item?.apropriacao_id);
    const valor = roundCurrency(item?.valor_rateio);
    if (!Number.isInteger(obraId) || obraId <= 0) throw erro(400, `Selecione a obra da linha ${index + 1}.`);
    if (!Number.isInteger(apropriacaoId) || apropriacaoId <= 0) throw erro(400, `Selecione a apropriacao da linha ${index + 1}.`);
    if (valor <= 0) throw erro(400, `Informe um valor maior que zero na linha ${index + 1}.`);
    return { obra_id: obraId, apropriacao_id: apropriacaoId, valor_rateio: valor };
  });
}

async function salvarPrestacao(solicitacaoId, payload, user, externalTransaction = null) {
  const rateios = normalizarRateios(payload.rateios);
  const executar = async (transaction) => {
    const recarga = await SolicitacaoRecargaCartao.findOne({
      where: { solicitacao_id: Number(solicitacaoId) },
      include: [
        { model: Solicitacao, as: 'solicitacao', attributes: ['id', 'criado_por', 'area_responsavel'] },
        { model: CartaoRecargaPrestacao, as: 'prestacao', required: false }
      ],
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!recarga?.prestacao) throw erro(409, 'A prestacao so fica disponivel depois de um pagamento da recarga.');
    const statusPrestacaoAtual = normalizarToken(recarga.prestacao.status);
    if (statusPrestacaoAtual === 'ENVIADA') throw erro(409, 'A prestacao ja foi enviada e aguarda validacao.');
    if (statusPrestacaoAtual === 'VALIDADA') throw erro(409, 'A prestacao desta recarga ja foi validada.');
    const vinculo = await CartaoRecargaUsuario.findOne({
      where: { cartao_recarga_id: recarga.cartao_recarga_id, user_id: Number(user.id), ativo: true },
      transaction
    });
    if (!vinculo && !isGerenciaProcessos(user) && Number(recarga.solicitacao?.criado_por) !== Number(user.id)) {
      throw erro(403, 'Acesso negado para prestar contas deste cartao.');
    }

    const obrasPermitidas = await UsuarioObra.findAll({
      where: { user_id: Number(recarga.solicitacao.criado_por) },
      attributes: ['obra_id'],
      raw: true,
      transaction
    });
    const idsPermitidos = new Set(obrasPermitidas.map((item) => Number(item.obra_id)));
    for (const item of rateios) {
      if (!idsPermitidos.has(item.obra_id)) throw erro(403, 'Uma das obras informadas nao esta vinculada ao solicitante da recarga.');
      const apropriacao = await Apropriacao.findOne({
        where: { id: item.apropriacao_id, obra_id: item.obra_id, ativo: true, somadora: false },
        transaction
      });
      if (!apropriacao) throw erro(400, 'Uma das apropriacoes nao pertence a obra informada ou nao aceita lancamentos.');
    }

    const total = roundCurrency(rateios.reduce((acc, item) => acc + item.valor_rateio, 0));
    const base = roundCurrency(recarga.prestacao.valor_base);
    if (total !== base) throw erro(400, `O rateio deve totalizar R$ ${base.toFixed(2)}.`);

    const [prestacaoReservada] = await CartaoRecargaPrestacao.update(
      { status: 'ENVIANDO' },
      {
        where: {
          id: recarga.prestacao.id,
          status: { [Op.in]: ['PENDENTE', 'REJEITADA'] }
        },
        transaction
      }
    );
    if (prestacaoReservada !== 1) {
      throw erro(409, 'A prestacao ja foi enviada ou esta sendo processada.');
    }

    await CartaoRecargaPrestacaoRateio.destroy({ where: { prestacao_id: recarga.prestacao.id }, transaction });
    await CartaoRecargaPrestacaoRateio.bulkCreate(rateios.map((item) => ({
      prestacao_id: recarga.prestacao.id,
      ...item,
      percentual: roundCurrency((item.valor_rateio / base) * 100),
      criado_por: user.id
    })), { transaction });
    await recarga.prestacao.update({
      status: 'ENVIADA',
      observacoes: String(payload.observacoes || '').trim() || null,
      motivo_rejeicao: null,
      enviado_por: user.id,
      enviado_em: new Date(),
      validado_por: null,
      validado_em: null
    }, { transaction });
    await recarga.update({ status_ciclo: STATUS_CICLO.PRESTACAO_ENVIADA, atualizado_por: user.id }, { transaction });
    await Historico.create({
      solicitacao_id: recarga.solicitacao_id,
      usuario_responsavel_id: user.id,
      setor: user.area || recarga.solicitacao.area_responsavel,
      acao: 'PRESTACAO_RECARGA_ENVIADA',
      observacao: `Prestacao de contas enviada com ${rateios.length} rateio(s), total R$ ${base.toFixed(2)}.`
    }, { transaction });
    return carregarRecargaPorSolicitacao(solicitacaoId, transaction);
  };
  return externalTransaction ? executar(externalTransaction) : sequelize.transaction(executar);
}

async function decidirPrestacao(solicitacaoId, payload, user, externalTransaction = null) {
  if (!isGerenciaProcessos(user)) throw erro(403, 'Somente a Gerencia de Processos pode validar a prestacao de contas.');
  const aprovar = payload.aprovar === true;
  const motivo = String(payload.motivo || '').trim();
  if (!aprovar && !motivo) throw erro(400, 'Informe o motivo da rejeicao da prestacao.');

  const executar = async (transaction) => {
    const recarga = await SolicitacaoRecargaCartao.findOne({
      where: { solicitacao_id: Number(solicitacaoId) },
      include: [
        { model: TituloFinanceiro, as: 'titulo' },
        {
          model: CartaoRecargaPrestacao,
          as: 'prestacao',
          required: true,
          include: [{ model: CartaoRecargaPrestacaoRateio, as: 'rateios', required: false }]
        }
      ],
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!recarga) throw erro(404, 'Prestacao de contas nao encontrada.');
    if (normalizarToken(recarga.prestacao.status) !== 'ENVIADA') throw erro(409, 'A prestacao precisa estar enviada para ser validada.');

    const [prestacaoReservada] = await CartaoRecargaPrestacao.update(
      { status: 'VALIDANDO' },
      { where: { id: recarga.prestacao.id, status: 'ENVIADA' }, transaction }
    );
    if (prestacaoReservada !== 1) {
      throw erro(409, 'A prestacao ja foi validada ou esta sendo processada.');
    }

    if (!aprovar) {
      await recarga.prestacao.update({ status: 'REJEITADA', motivo_rejeicao: motivo, validado_por: user.id, validado_em: new Date() }, { transaction });
      await recarga.update({ status_ciclo: STATUS_CICLO.PRESTACAO_PENDENTE, atualizado_por: user.id }, { transaction });
    } else {
      const rateios = recarga.prestacao.rateios || [];
      if (rateios.length === 0) throw erro(409, 'A prestacao nao possui rateios para validar.');
      await TituloFinanceiroRateio.destroy({ where: { titulo_financeiro_id: recarga.titulo_financeiro_id }, transaction });
      await TituloFinanceiroRateio.bulkCreate(rateios.map((item) => ({
        titulo_financeiro_id: recarga.titulo_financeiro_id,
        obra_id: item.obra_id,
        apropriacao_id: item.apropriacao_id,
        tipo_rateio: 'VALOR',
        percentual: item.percentual,
        valor_rateio: item.valor_rateio,
        observacoes: 'Prestacao de contas de Recarga de Cartao validada pela Gerencia de Processos.',
        criado_por: user.id,
        atualizado_por: user.id
      })), { transaction });
      await recarga.titulo.update({
        obra_id: null,
        apropriacao_id: null,
        possui_rateio: true,
        considera_dre: true,
        atualizado_por: user.id
      }, { transaction });
      await recarga.prestacao.update({ status: 'VALIDADA', motivo_rejeicao: null, validado_por: user.id, validado_em: new Date() }, { transaction });
      await recarga.update({ status_ciclo: STATUS_CICLO.VALIDADA, atualizado_por: user.id }, { transaction });
    }

    await Historico.create({
      solicitacao_id: recarga.solicitacao_id,
      usuario_responsavel_id: user.id,
      setor: user.area || 'GEO',
      acao: aprovar ? 'PRESTACAO_RECARGA_VALIDADA' : 'PRESTACAO_RECARGA_REJEITADA',
      observacao: aprovar ? 'Prestacao validada e custo liberado para os relatorios das obras.' : motivo
    }, { transaction });
    return carregarRecargaPorSolicitacao(solicitacaoId, transaction);
  };
  return externalTransaction ? executar(externalTransaction) : sequelize.transaction(executar);
}

async function listarAdmin(user) {
  assertSuperadmin(user);
  const [cartoes, usuarios] = await Promise.all([
    CartaoRecarga.findAll({
      include: [
        { model: Parceiro, as: 'parceiro', attributes: ['id', 'nome', 'cpf_cnpj'] },
        { model: CartaoRecargaUsuario, as: 'vinculosUsuarios', required: false, include: [{ model: User, as: 'usuario', attributes: ['id', 'nome', 'email', 'ativo'] }] }
      ],
      order: [['nome', 'ASC']]
    }),
    User.findAll({ where: { ativo: true }, attributes: ['id', 'nome', 'email'], order: [['nome', 'ASC']] })
  ]);
  return { cartoes, usuarios };
}

function validarCartaoPayload(payload = {}) {
  const nome = String(payload.nome || '').trim();
  const identificador = String(payload.identificador || '').trim().toUpperCase();
  const ultimosQuatro = String(payload.ultimos_quatro || '').replace(/\D/g, '');
  const parceiroId = Number(payload.parceiro_id);
  const usuarioIds = [...new Set((Array.isArray(payload.usuario_ids) ? payload.usuario_ids : []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (!nome) throw erro(400, 'Informe o nome de identificacao do cartao.');
  if (!identificador) throw erro(400, 'Informe o identificador interno do cartao.');
  if (ultimosQuatro.length !== 4) throw erro(400, 'Informe os quatro ultimos digitos do cartao.');
  if (!Number.isInteger(parceiroId) || parceiroId <= 0) throw erro(400, 'Selecione o fornecedor do cartao.');
  if (usuarioIds.length === 0) throw erro(400, 'Vincule o cartao a pelo menos um usuario.');
  return { nome, identificador, ultimos_quatro: ultimosQuatro, parceiro_id: parceiroId, usuario_ids: usuarioIds };
}

async function salvarCartao(cartaoId, payload, user, externalTransaction = null) {
  assertSuperadmin(user);
  const dados = validarCartaoPayload(payload);
  const { usuario_ids: usuarioIds, ...dadosCartao } = dados;
  const executar = async (transaction) => {
    const [parceiro, usuarios, cartaoDuplicado] = await Promise.all([
      Parceiro.findOne({ where: { id: dados.parceiro_id, ativo: true, fornecedor: true }, transaction }),
      User.findAll({ where: { id: { [Op.in]: usuarioIds }, ativo: true }, attributes: ['id'], transaction }),
      CartaoRecarga.findOne({
        where: {
          identificador: dados.identificador,
          ...(cartaoId ? { id: { [Op.ne]: Number(cartaoId) } } : {})
        },
        attributes: ['id'],
        transaction,
        lock: transaction.LOCK.UPDATE
      })
    ]);
    if (!parceiro) throw erro(400, 'Selecione um fornecedor ativo para o cartao.');
    if (usuarios.length !== usuarioIds.length) throw erro(400, 'Um ou mais usuarios informados estao inativos ou nao existem.');
    if (cartaoDuplicado) throw erro(409, 'Ja existe um cartao com este identificador interno.');

    let cartao = null;
    if (cartaoId) {
      cartao = await CartaoRecarga.findByPk(Number(cartaoId), { transaction, lock: transaction.LOCK.UPDATE });
      if (!cartao) throw erro(404, 'Cartao de recarga nao encontrado.');
      await cartao.update({
        ...dadosCartao,
        ativo: payload.ativo !== false,
        observacoes: String(payload.observacoes || '').trim() || null,
        atualizado_por: user.id
      }, { transaction });
    } else {
      cartao = await CartaoRecarga.create({
        ...dadosCartao,
        ativo: payload.ativo !== false,
        observacoes: String(payload.observacoes || '').trim() || null,
        criado_por: user.id,
        atualizado_por: user.id
      }, { transaction });
    }

    await CartaoRecargaUsuario.update({ ativo: false }, { where: { cartao_recarga_id: cartao.id }, transaction });
    for (const usuarioId of usuarioIds) {
      const [vinculo] = await CartaoRecargaUsuario.findOrCreate({
        where: { cartao_recarga_id: cartao.id, user_id: usuarioId },
        defaults: { ativo: true, criado_por: user.id },
        transaction
      });
      if (!vinculo.ativo) await vinculo.update({ ativo: true }, { transaction });
    }
    return cartao;
  };
  return externalTransaction ? executar(externalTransaction) : sequelize.transaction(executar);
}

module.exports = {
  STATUS_CICLO,
  calcularMedia,
  decidirPrestacao,
  executarCriacaoRecargaComControle,
  isGerenciaProcessos,
  listarAdmin,
  listarMeusCartoes,
  obterContextoCartao,
  obterContextoSolicitacao,
  salvarCartao,
  salvarPrestacao,
  sincronizarCicloAposBaixa,
  sincronizarTituloComStatusSolicitacao,
  tipoEhRecargaCartao
};
