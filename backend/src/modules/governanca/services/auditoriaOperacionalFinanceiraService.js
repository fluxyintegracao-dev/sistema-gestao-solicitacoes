'use strict';

const { Op, fn, col, literal } = require('sequelize');
const {
  ConciliacaoBancaria,
  ConciliacaoBancariaImportacao,
  MovimentoFinanceiro,
  Setor,
  TituloFinanceiro,
  User
} = require('../../../models');
const { normalizeFilters } = require('./auditoriaOperacionalService');

const EMPTY_METRICS = Object.freeze({
  titulos_criados: 0,
  titulos_baixados: 0,
  baixas_registradas: 0,
  ofx_lancamentos_importados: 0,
  matches_automaticos: 0,
  matches_ambiguos: 0,
  sem_match: 0,
  sem_classificacao: 0,
  conciliacoes_confirmadas: 0,
  conciliacoes_auto_confirmadas: 0,
  conciliacoes_manuais: 0,
  titulos_criados_via_conciliacao: 0
});

function number(value) {
  return Number(value || 0);
}

function emptyMetrics() {
  return { ...EMPTY_METRICS };
}

function mergeMetrics(target, source) {
  Object.keys(EMPTY_METRICS).forEach((key) => {
    target[key] = number(target[key]) + number(source?.[key]);
  });
  return target;
}

function periodWhere(filters, field = 'createdAt') {
  return { [field]: { [Op.between]: [filters.start, filters.end] } };
}

function applyUserScope(where, field, userIds) {
  if (!userIds) return where;
  return { ...where, [field]: { [Op.in]: userIds.length ? userIds : [-1] } };
}

async function resolveUserScope(filters) {
  if (filters.usuario_id) return [filters.usuario_id];
  if (!filters.setor_id) return null;
  const rows = await User.findAll({ where: { setor_id: filters.setor_id }, attributes: ['id'], raw: true });
  return rows.map((item) => Number(item.id)).filter(Boolean);
}

function pushRows(target, rows, mapper) {
  rows.forEach((row) => {
    const userId = number(row.usuario_id) || null;
    const metrics = mapper(row);
    if (!target.has(userId)) target.set(userId, emptyMetrics());
    mergeMetrics(target.get(userId), metrics);
  });
}

async function collectMetrics(filters, { accumulated = false } = {}) {
  const userScope = await resolveUserScope(filters);
  const createdPeriod = accumulated ? {} : periodWhere(filters);
  const confirmedPeriod = accumulated ? {} : periodWhere(filters, 'confirmado_em');

  const [titles, movements, imports, importedMatches, confirmations] = await Promise.all([
    TituloFinanceiro.findAll({
      attributes: ['criado_por', [fn('COUNT', col('id')), 'quantidade']],
      where: applyUserScope(createdPeriod, 'criado_por', userScope),
      group: ['criado_por'],
      raw: true
    }),
    MovimentoFinanceiro.findAll({
      attributes: [
        'criado_por',
        [fn('COUNT', col('id')), 'baixas'],
        [literal('COUNT(DISTINCT titulo_financeiro_id)'), 'titulos']
      ],
      where: applyUserScope({
        ...createdPeriod,
        tipo_movimento: 'BAIXA',
        status: 'ATIVO',
        titulo_financeiro_id: { [Op.ne]: null }
      }, 'criado_por', userScope),
      group: ['criado_por'],
      raw: true
    }),
    ConciliacaoBancariaImportacao.findAll({
      attributes: ['criado_por', [fn('SUM', col('importados')), 'quantidade']],
      where: applyUserScope(createdPeriod, 'criado_por', userScope),
      group: ['criado_por'],
      raw: true
    }),
    ConciliacaoBancaria.findAll({
      attributes: [
        'criado_por',
        [literal("SUM(CASE WHEN match_inicial_tipo = 'AUTO_UNICO' THEN 1 ELSE 0 END)"), 'automaticos'],
        [literal("SUM(CASE WHEN match_inicial_tipo = 'AMBIGUO' THEN 1 ELSE 0 END)"), 'ambiguos'],
        [literal("SUM(CASE WHEN match_inicial_tipo = 'SEM_MATCH' THEN 1 ELSE 0 END)"), 'sem_match'],
        [literal('SUM(CASE WHEN match_inicial_tipo IS NULL THEN 1 ELSE 0 END)'), 'sem_classificacao']
      ],
      where: applyUserScope({
        ...createdPeriod,
        deleted_at: null,
        ofx_uid: { [Op.ne]: null }
      }, 'criado_por', userScope),
      group: ['criado_por'],
      raw: true
    }),
    ConciliacaoBancaria.findAll({
      attributes: [
        'confirmado_por',
        [fn('COUNT', col('id')), 'confirmadas'],
        [literal("SUM(CASE WHEN resolucao_tipo IN ('AUTO_CONFIRMADO','AUTO_LOTE') THEN 1 ELSE 0 END)"), 'automaticas'],
        [literal("SUM(CASE WHEN resolucao_tipo = 'MANUAL_EXISTENTE' THEN 1 ELSE 0 END)"), 'manuais'],
        [literal("SUM(CASE WHEN resolucao_tipo = 'TITULO_CRIADO' THEN 1 ELSE 0 END)"), 'titulos_criados']
      ],
      where: applyUserScope({
        ...confirmedPeriod,
        status: 'CONCILIADO',
        deleted_at: null,
        confirmado_por: { [Op.ne]: null }
      }, 'confirmado_por', userScope),
      group: ['confirmado_por'],
      raw: true
    })
  ]);

  const byUser = new Map();
  pushRows(byUser, titles, (row) => ({ titulos_criados: row.quantidade }));
  pushRows(byUser, movements, (row) => ({ titulos_baixados: row.titulos, baixas_registradas: row.baixas }));
  pushRows(byUser, imports, (row) => ({ ofx_lancamentos_importados: row.quantidade }));
  pushRows(byUser, importedMatches, (row) => ({
    matches_automaticos: row.automaticos,
    matches_ambiguos: row.ambiguos,
    sem_match: row.sem_match,
    sem_classificacao: row.sem_classificacao
  }));
  pushRows(byUser, confirmations, (row) => ({
    conciliacoes_confirmadas: row.confirmadas,
    conciliacoes_auto_confirmadas: row.automaticas,
    conciliacoes_manuais: row.manuais,
    titulos_criados_via_conciliacao: row.titulos_criados
  }));
  return byUser;
}

function totalMetrics(map) {
  return [...map.values()].reduce((total, item) => mergeMetrics(total, item), emptyMetrics());
}

async function getFinancialIndicators(query = {}) {
  const filters = normalizeFilters(query);
  const [period, accumulated] = await Promise.all([
    collectMetrics(filters),
    collectMetrics(filters, { accumulated: true })
  ]);
  const userIds = [...new Set([...period.keys(), ...accumulated.keys()].filter(Boolean))];
  const users = userIds.length
    ? await User.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ['id', 'nome', 'email', 'perfil', 'setor_id'],
      include: [{ model: Setor, as: 'setor', attributes: ['id', 'nome', 'codigo'], required: false }],
      raw: true,
      nest: true
    })
    : [];

  const bySector = new Map();
  const byUser = users.map((user) => {
    const item = {
      usuario: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil },
      setor: user.setor?.id ? user.setor : null,
      periodo: period.get(Number(user.id)) || emptyMetrics(),
      acumulado: accumulated.get(Number(user.id)) || emptyMetrics()
    };
    const sectorId = Number(user.setor?.id || 0) || null;
    if (!bySector.has(sectorId)) {
      bySector.set(sectorId, {
        setor: sectorId ? user.setor : { id: null, nome: 'Sem setor atual', codigo: null },
        periodo: emptyMetrics(),
        acumulado: emptyMetrics()
      });
    }
    mergeMetrics(bySector.get(sectorId).periodo, item.periodo);
    mergeMetrics(bySector.get(sectorId).acumulado, item.acumulado);
    return item;
  }).sort((a, b) => b.periodo.titulos_criados - a.periodo.titulos_criados || a.usuario.nome.localeCompare(b.usuario.nome));

  return {
    periodo: { inicio: filters.start, fim: filters.end },
    geral: { periodo: totalMetrics(period), acumulado: totalMetrics(accumulated) },
    por_setor: [...bySector.values()].sort((a, b) => a.setor.nome.localeCompare(b.setor.nome)),
    por_usuario: byUser,
    cobertura: {
      match_ofx_a_partir_de: '2026-08-14',
      observacao: 'A qualidade do match OFX e registrada no instante da importacao a partir desta implantacao; registros anteriores permanecem sem classificacao.',
      atribuicao_setor: 'Os agrupamentos por setor usam o setor atual do usuario.'
    }
  };
}

module.exports = { EMPTY_METRICS, getFinancialIndicators };
