const { Op } = require('sequelize');
const {
  Historico,
  Obra,
  Solicitacao,
  TipoSolicitacao,
  User,
  UsuarioObra
} = require('../models');
const {
  buildSetorComparisonTokens,
  resolveSetorPersistenciaValue,
  resolveUserSetor
} = require('./setorCapabilityService');
const { obterTokensSetoresUsuario } = require('./usuariosSetores');

const STATUS_CONCLUIDOS = new Set([
  'PAGA',
  'PAGO',
  'CONCLUIDA',
  'CONCLUIDO',
  'FINALIZADA',
  'FINALIZADO',
  'ENCERRADA',
  'ENCERRADO'
]);

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function diffDays(start, end = new Date()) {
  const startedAt = toDate(start);
  const endedAt = toDate(end);
  if (!startedAt || !endedAt || endedAt < startedAt) return null;
  return Number(((endedAt.getTime() - startedAt.getTime()) / 864e5).toFixed(1));
}

function getPeriodRange({ periodo, dataInicio, dataFim }) {
  const today = new Date();
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  if (dataInicio || dataFim) {
    return {
      dataInicial: dataInicio ? new Date(`${dataInicio}T00:00:00.000`) : null,
      dataFinal: dataFim ? new Date(`${dataFim}T23:59:59.999`) : null
    };
  }

  const normalized = String(periodo || '30_DIAS').toUpperCase();
  if (normalized === 'HOJE') {
    return { dataInicial: startOfDay(today), dataFinal: endOfDay(today) };
  }
  if (normalized === 'MES_ATUAL') {
    return {
      dataInicial: new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0),
      dataFinal: endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0))
    };
  }
  if (normalized === '90_DIAS') {
    const start = startOfDay(today);
    start.setDate(start.getDate() - 89);
    return { dataInicial: start, dataFinal: endOfDay(today) };
  }

  const start = startOfDay(today);
  start.setDate(start.getDate() - 29);
  return { dataInicial: start, dataFinal: endOfDay(today) };
}

function buildDateWhere(range) {
  const where = {};
  if (range.dataInicial || range.dataFinal) {
    where.createdAt = {};
    if (range.dataInicial) where.createdAt[Op.gte] = range.dataInicial;
    if (range.dataFinal) where.createdAt[Op.lte] = range.dataFinal;
  }
  return where;
}

function incrementMap(map, key, seed = {}) {
  const mapKey = key || 'NAO_INFORMADO';
  if (!map.has(mapKey)) {
    map.set(mapKey, { key: mapKey, total: 0, valor_total: 0, ...seed });
  }
  const item = map.get(mapKey);
  item.total += 1;
  return item;
}

function sortByTotalDesc(items) {
  return Array.from(items.values()).sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
}

function isConcluida(status) {
  return STATUS_CONCLUIDOS.has(normalizeToken(status));
}

async function getSolicitacaoScopeWhere(user) {
  const perfil = normalizeToken(user?.perfil);
  const isSuperadmin = perfil === 'SUPERADMIN';
  const isAdministrador = perfil === 'ADMINISTRADOR';

  const setorAtual = await resolveUserSetor(user, {
    attributes: ['id', 'codigo', 'nome', 'eh_setor_obra', 'eh_setor_geo']
  });
  const areaUsuario = resolveSetorPersistenciaValue(setorAtual, user?.area);
  const tokens = new Set(buildSetorComparisonTokens(setorAtual));
  if (areaUsuario) tokens.add(String(areaUsuario).trim().toUpperCase());
  if (user?.setor_id) tokens.add(String(user.setor_id).trim().toUpperCase());

  const tokensMultiSetor = await obterTokensSetoresUsuario(user, areaUsuario ? [areaUsuario] : []);
  tokensMultiSetor.forEach((token) => {
    if (token) tokens.add(String(token).trim().toUpperCase());
  });

  const tokenList = Array.from(tokens).filter(Boolean);
  const isAdminGeo =
    perfil === 'ADMIN' &&
    tokenList.some((token) => ['GEO', 'GERENCIA_PROCESSOS', 'GERENCIA_DE_PROCESSOS'].includes(normalizeToken(token)));

  if (isSuperadmin || isAdministrador || isAdminGeo) {
    return {};
  }

  const isSetorObra = Boolean(setorAtual?.eh_setor_obra);
  if (isSetorObra) {
    const vinculos = await UsuarioObra.findAll({
      where: { user_id: user.id },
      attributes: ['obra_id']
    });
    const obraIds = vinculos.map((item) => Number(item.obra_id)).filter(Boolean);
    return { obra_id: { [Op.in]: obraIds.length ? obraIds : [-1] } };
  }

  const areaTokens = tokenList.map((token) => String(token).trim().toUpperCase()).filter(Boolean);
  if (areaTokens.length) {
    return {
      [Op.or]: [
        { criado_por: user.id },
        { area_responsavel: { [Op.in]: areaTokens } }
      ]
    };
  }

  return { criado_por: user.id };
}

async function relatorioSolicitacoesOperacional({ user, periodo, dataInicio, dataFim, obraId, status, area } = {}) {
  const range = getPeriodRange({ periodo, dataInicio, dataFim });
  const scopeWhere = await getSolicitacaoScopeWhere(user);
  const where = {
    cancelada: false,
    ...buildDateWhere(range),
    ...scopeWhere
  };

  if (obraId) {
    where.obra_id = Number(obraId);
  }
  if (status) {
    where.status_global = String(status).trim().toUpperCase();
  }
  if (area) {
    where.area_responsavel = String(area).trim().toUpperCase();
  }

  const solicitacoes = await Solicitacao.findAll({
    where,
    attributes: [
      'id',
      'codigo',
      'descricao',
      'valor',
      'status_global',
      'area_responsavel',
      'obra_id',
      'tipo_solicitacao_id',
      'criado_por',
      'aprovada_diretoria_em',
      'createdAt',
      'updatedAt'
    ],
    include: [
      { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo', 'tipo_centro_custo'] },
      { model: TipoSolicitacao, as: 'tipo', attributes: ['id', 'nome', 'codigo_interno'] },
      { model: User, as: 'criador', attributes: ['id', 'nome'] }
    ],
    order: [['createdAt', 'DESC']]
  });

  const ids = solicitacoes.map((item) => Number(item.id)).filter(Boolean);
  const historicos = ids.length
    ? await Historico.findAll({
        where: { solicitacao_id: { [Op.in]: ids } },
        attributes: ['solicitacao_id', 'acao', 'setor', 'createdAt'],
        order: [['createdAt', 'DESC']]
      })
    : [];

  const historicosPorSolicitacao = new Map();
  historicos.forEach((historico) => {
    const solicitacaoId = Number(historico.solicitacao_id);
    if (!historicosPorSolicitacao.has(solicitacaoId)) {
      historicosPorSolicitacao.set(solicitacaoId, []);
    }
    historicosPorSolicitacao.get(solicitacaoId).push(historico);
  });

  const statusMap = new Map();
  const setorMap = new Map();
  const obraMap = new Map();
  const tipoMap = new Map();
  const now = new Date();
  const gargalos = [];
  const resumo = {
    total_solicitacoes: solicitacoes.length,
    abertas: 0,
    concluidas: 0,
    valor_total: 0,
    valor_aberto: 0,
    dias_abertas_total: 0,
    abertas_com_data: 0,
    maior_tempo_parado_dias: 0,
    criadas: solicitacoes.length,
    assumidas: 0,
    enviadas: 0,
    aprovadas_diretoria: 0
  };

  solicitacoes.forEach((solicitacao) => {
    const plain = solicitacao.get({ plain: true });
    const valor = toNumber(plain.valor);
    const concluida = isConcluida(plain.status_global);
    const historicosItem = historicosPorSolicitacao.get(Number(plain.id)) || [];
    const ultimaMovimentacao = historicosItem[0]?.createdAt || plain.updatedAt || plain.createdAt;
    const diasParada = concluida ? 0 : diffDays(ultimaMovimentacao, now);
    const diasAberta = concluida ? 0 : diffDays(plain.createdAt, now);

    resumo.valor_total += valor;
    if (concluida) {
      resumo.concluidas += 1;
    } else {
      resumo.abertas += 1;
      resumo.valor_aberto += valor;
      if (diasAberta != null) {
        resumo.dias_abertas_total += diasAberta;
        resumo.abertas_com_data += 1;
      }
      if (diasParada != null) {
        resumo.maior_tempo_parado_dias = Math.max(resumo.maior_tempo_parado_dias, diasParada);
      }
    }

    if (plain.aprovada_diretoria_em) {
      resumo.aprovadas_diretoria += 1;
    }
    if (historicosItem.some((item) => ['RESPONSAVEL_ATRIBUIDO', 'RESPONSAVEL_ASSUMIU'].includes(String(item.acao || '').toUpperCase()))) {
      resumo.assumidas += 1;
    }
    if (historicosItem.some((item) => String(item.acao || '').toUpperCase() === 'ENVIADA_SETOR')) {
      resumo.enviadas += 1;
    }

    incrementMap(statusMap, plain.status_global, { status: plain.status_global }).valor_total += valor;
    incrementMap(setorMap, plain.area_responsavel, { setor: plain.area_responsavel }).valor_total += valor;
    incrementMap(obraMap, plain.obra_id || 'SEM_OBRA', {
      obra_id: plain.obra_id || null,
      obra_nome: plain.obra?.nome || 'Sem obra/centro',
      obra_codigo: plain.obra?.codigo || null,
      tipo_centro_custo: plain.obra?.tipo_centro_custo || null
    }).valor_total += valor;
    incrementMap(tipoMap, plain.tipo_solicitacao_id || 'SEM_TIPO', {
      tipo_solicitacao_id: plain.tipo_solicitacao_id || null,
      tipo_nome: plain.tipo?.nome || 'Sem tipo'
    }).valor_total += valor;

    if (!concluida && Number(diasParada || 0) >= 3) {
      gargalos.push({
        id: plain.id,
        codigo: plain.codigo,
        descricao: plain.descricao,
        status: plain.status_global,
        setor: plain.area_responsavel,
        obra_nome: plain.obra?.nome || null,
        tipo_nome: plain.tipo?.nome || null,
        criado_por_nome: plain.criador?.nome || null,
        criada_em: plain.createdAt,
        ultima_movimentacao_em: ultimaMovimentacao,
        dias_parada: diasParada,
        valor
      });
    }
  });

  const abertasComData = resumo.abertas_com_data || 0;
  const mediaDiasAbertas = abertasComData > 0 ? resumo.dias_abertas_total / abertasComData : 0;

  return {
    filtro: {
      periodo: periodo || '30_DIAS',
      data_inicial: range.dataInicial ? range.dataInicial.toISOString().slice(0, 10) : null,
      data_final: range.dataFinal ? range.dataFinal.toISOString().slice(0, 10) : null,
      obra_id: obraId || null,
      status: status || null,
      area: area || null
    },
    resumo: {
      total_solicitacoes: resumo.total_solicitacoes,
      abertas: resumo.abertas,
      concluidas: resumo.concluidas,
      valor_total: Number(resumo.valor_total.toFixed(2)),
      valor_aberto: Number(resumo.valor_aberto.toFixed(2)),
      media_dias_abertas: Number(mediaDiasAbertas.toFixed(1)),
      maior_tempo_parado_dias: Number(resumo.maior_tempo_parado_dias.toFixed(1)),
      criadas: resumo.criadas,
      assumidas: resumo.assumidas,
      enviadas: resumo.enviadas,
      aprovadas_diretoria: resumo.aprovadas_diretoria
    },
    por_status: sortByTotalDesc(statusMap),
    por_setor: sortByTotalDesc(setorMap),
    por_obra: sortByTotalDesc(obraMap).slice(0, 20),
    por_tipo: sortByTotalDesc(tipoMap).slice(0, 20),
    gargalos: gargalos
      .sort((a, b) => Number(b.dias_parada || 0) - Number(a.dias_parada || 0))
      .slice(0, 30)
  };
}

module.exports = {
  relatorioSolicitacoesOperacional
};
