'use strict';

const { Op } = require('sequelize');
const db = require('../../../models');
const { columnExists, quoteIdentifier, tableExists } = require('../../../database/schemaUtils');

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

function nowDateOnly(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getCache(key) {
  const item = cache.get(key);
  if (!item || item.expiresAt < Date.now()) return null;
  return item.value;
}

function setCache(key, value, ttl = CACHE_TTL_MS) {
  cache.set(key, { value, expiresAt: Date.now() + ttl });
}

function toInt(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

async function safeCountModel(model, options = {}) {
  try {
    if (!model?.count) return 0;
    return await model.count(options);
  } catch {
    return 0;
  }
}

async function safeRawCount(tableName, whereSql = '1 = 1') {
  try {
    if (!(await tableExists(db.sequelize, tableName))) return 0;
    const [rows] = await db.sequelize.query(
      `SELECT COUNT(*) AS total FROM ${quoteIdentifier(tableName)} WHERE ${whereSql}`
    );
    return toInt(rows?.[0]?.total);
  } catch {
    return 0;
  }
}

async function tableColumn(tableName, columnName) {
  try {
    return await columnExists(db.sequelize, tableName, columnName);
  } catch {
    return false;
  }
}

async function countSolicitacoesConcluidas() {
  if (!(await tableExists(db.sequelize, 'solicitacoes'))) return 0;
  if (await tableColumn('solicitacoes', 'status')) {
    return safeRawCount('solicitacoes', "UPPER(COALESCE(status, '')) IN ('CONCLUIDO', 'CONCLUIDA', 'FINALIZADO', 'FINALIZADA', 'ARQUIVADO', 'ARQUIVADA')");
  }
  return 0;
}

async function countSolicitacoesAbertas() {
  if (!(await tableExists(db.sequelize, 'solicitacoes'))) return 0;
  if (await tableColumn('solicitacoes', 'status')) {
    return safeRawCount('solicitacoes', "UPPER(COALESCE(status, '')) NOT IN ('CONCLUIDO', 'CONCLUIDA', 'FINALIZADO', 'FINALIZADA', 'ARQUIVADO', 'ARQUIVADA', 'CANCELADO', 'CANCELADA')");
  }
  return safeRawCount('solicitacoes');
}

async function countDocumentos() {
  const candidates = [
    ['anexos', 'id'],
    ['comprovantes', 'id'],
    ['fiscal_dfe_documents', 'id'],
    ['sst_documentos', 'id'],
    ['rh_documentos', 'id'],
    ['contrato_documentos', 'id']
  ];
  let total = 0;
  for (const [table] of candidates) {
    total += await safeRawCount(table);
  }
  return total;
}

async function countActiveUsers(periodDays = 30) {
  const since = new Date(Date.now() - Number(periodDays || 30) * 24 * 60 * 60 * 1000);
  try {
    if (db.User?.rawAttributes?.ultimo_login) {
      return await db.User.count({
        where: { ultimo_login: { [Op.gte]: since } }
      });
    }
    return await db.User.count({
      where: { updatedAt: { [Op.gte]: since } }
    });
  } catch {
    return 0;
  }
}

async function resolveEnabledModules() {
  const fallbackModules = [
    'SOLICITACOES',
    'COMPRAS',
    'FINANCEIRO',
    'FISCAL',
    'SST',
    'RH_DP',
    'CRM',
    'COMERCIAL',
    'CONTRATOS',
    'BOLETOS'
  ];

  try {
    const item = await db.ConfiguracaoSistema?.findOne?.({ where: { chave: 'MODULOS_HABILITADOS' } });
    const parsed = item?.valor ? JSON.parse(item.valor) : null;
    const modules = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.modulos)
        ? parsed.modulos
        : [];
    const active = modules
      .filter((module) => module?.enabled !== false)
      .map((module) => module?.key || module?.codigo || module)
      .filter(Boolean);
    return active.length ? active : fallbackModules;
  } catch {
    return fallbackModules;
  }
}

async function getExecutiveOverview() {
  const cacheKey = 'executive';
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const [
    usuariosAtivos,
    usuariosTotais,
    empresasAtivas,
    obrasAtivas,
    processosAbertos,
    processosConcluidos,
    documentos,
    modules
  ] = await Promise.all([
    countActiveUsers(30),
    safeCountModel(db.User),
    safeCountModel(db.EmpresaGrupo),
    safeCountModel(db.Obra),
    countSolicitacoesAbertas(),
    countSolicitacoesConcluidas(),
    countDocumentos(),
    resolveEnabledModules()
  ]);

  const value = {
    usuarios_ativos: usuariosAtivos,
    usuarios_totais: usuariosTotais,
    empresas_ativas: empresasAtivas,
    obras_ativas: obrasAtivas,
    processos_abertos: processosAbertos,
    processos_concluidos: processosConcluidos,
    documentos,
    modulos_ativos: modules.length,
    modulos: modules
  };

  setCache(cacheKey, value);
  return value;
}

async function getAdoptionMetrics() {
  const modules = await resolveEnabledModules();
  const logs30 = await safeRawCount('governanca_access_logs', "createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
  const usuariosAtivos = await countActiveUsers(30);
  const usuariosTotais = await safeCountModel(db.User);
  return {
    taxa_adocao_usuarios: usuariosTotais ? Math.round((usuariosAtivos / usuariosTotais) * 100) : 0,
    usuarios_ativos_30d: usuariosAtivos,
    acessos_governanca_30d: logs30,
    modulos_em_uso: modules.map((module) => ({ modulo: module, ativo: true }))
  };
}

async function getOperationalEfficiency() {
  const [solicitacoesAbertas, solicitacoesConcluidas, titulosAbertos, titulosBaixados, pedidosCompra] = await Promise.all([
    countSolicitacoesAbertas(),
    countSolicitacoesConcluidas(),
    safeRawCount('titulos_financeiros', "UPPER(COALESCE(status, '')) IN ('ABERTO', 'PENDENTE')"),
    safeRawCount('titulos_financeiros', "UPPER(COALESCE(status, '')) IN ('BAIXADO', 'PAGO', 'QUITADO')"),
    safeRawCount('pedidos_compra')
  ]);

  return {
    processos_abertos: solicitacoesAbertas,
    processos_concluidos: solicitacoesConcluidas,
    titulos_abertos: titulosAbertos,
    titulos_baixados: titulosBaixados,
    pedidos_compra: pedidosCompra,
    indice_conclusao: (solicitacoesAbertas + solicitacoesConcluidas)
      ? Math.round((solicitacoesConcluidas / (solicitacoesAbertas + solicitacoesConcluidas)) * 100)
      : 0
  };
}

async function getAuditGovernance({ page = 1, limit = 20 } = {}) {
  const offset = (Math.max(1, Number(page) || 1) - 1) * Math.min(100, Math.max(1, Number(limit) || 20));
  const pageLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const [securityEvents, accessLogs, latestLogs] = await Promise.all([
    safeRawCount('security_event_logs'),
    safeRawCount('governanca_access_logs'),
    db.GovernancaAccessLog?.findAndCountAll
      ? db.GovernancaAccessLog.findAndCountAll({
        order: [['createdAt', 'DESC']],
        offset,
        limit: pageLimit,
        raw: true
      }).catch(() => ({ count: 0, rows: [] }))
      : { count: 0, rows: [] }
  ]);

  return {
    eventos_seguranca: securityEvents,
    acessos_governanca: accessLogs,
    logs: latestLogs.rows,
    pagination: {
      page: Math.max(1, Number(page) || 1),
      limit: pageLimit,
      total: latestLogs.count || 0
    }
  };
}

async function getTechnicalHealth() {
  const started = Date.now();
  let database = 'ok';
  try {
    await db.sequelize.authenticate();
  } catch {
    database = 'erro';
  }

  const storageConfigured = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.S3_BUCKET);
  const integrations = {
    banco_do_brasil: process.env.BB_PAYMENTS_ENABLED === 'true' ? 'habilitado' : 'desabilitado',
    caixa_cnab: 'habilitado',
    fiscal: 'habilitado',
    sst: 'habilitado',
    esocial: process.env.ESOCIAL_INTEGRACAO_ENABLED === 'true' ? 'habilitado' : 'controlado'
  };

  return {
    api: 'ok',
    database,
    storage: storageConfigured ? 'configurado' : 'pendente',
    integrations,
    latency_ms: Date.now() - started,
    uptime_seconds: Math.round(process.uptime())
  };
}

async function getProductEvolution() {
  const modules = await resolveEnabledModules();
  const snapshots = db.GovernancaSnapshot?.findAll
    ? await db.GovernancaSnapshot.findAll({
      order: [['data_referencia', 'DESC']],
      limit: 12,
      raw: true
    }).catch(() => [])
    : [];

  return {
    modulos_consolidados: modules.length,
    modulos: modules,
    snapshots,
    proximas_frentes: [
      'Consolidar importacao de retornos CNAB por banco',
      'Aprimorar conciliacao bancaria automatica com idempotencia',
      'Expandir telemetria historica por modulo',
      'Evoluir governanca de releases e roadmap operacional'
    ]
  };
}

async function getDashboard({ page, limit } = {}) {
  const [executiva, adocao, eficiencia, auditoria, saude_tecnica, evolucao_produto] = await Promise.all([
    getExecutiveOverview(),
    getAdoptionMetrics(),
    getOperationalEfficiency(),
    getAuditGovernance({ page, limit }),
    getTechnicalHealth(),
    getProductEvolution()
  ]);

  return {
    generated_at: new Date().toISOString(),
    executiva,
    adocao,
    eficiencia,
    auditoria,
    saude_tecnica,
    evolucao_produto
  };
}

async function createDailySnapshot({ dataReferencia = nowDateOnly() } = {}) {
  const overview = await getExecutiveOverview();
  const payload = {
    data_referencia: dataReferencia,
    usuarios_ativos: overview.usuarios_ativos,
    processos_abertos: overview.processos_abertos,
    processos_concluidos: overview.processos_concluidos,
    documentos: overview.documentos,
    modulos_ativos: overview.modulos_ativos,
    empresas_ativas: overview.empresas_ativas,
    obras_ativas: overview.obras_ativas,
    metricas_json: JSON.stringify(overview)
  };

  if (!db.GovernancaSnapshot?.findOrCreate) return payload;
  const [snapshot, created] = await db.GovernancaSnapshot.findOrCreate({
    where: { data_referencia: dataReferencia },
    defaults: payload
  });

  if (!created) {
    await snapshot.update(payload);
  }

  cache.delete('executive');
  return { ...snapshot.get({ plain: true }), created };
}

async function listSnapshots({ page = 1, limit = 30 } = {}) {
  if (!db.GovernancaSnapshot?.findAndCountAll) return { rows: [], pagination: { page, limit, total: 0 } };
  const pageNumber = Math.max(1, Number(page) || 1);
  const pageLimit = Math.min(100, Math.max(1, Number(limit) || 30));
  const result = await db.GovernancaSnapshot.findAndCountAll({
    order: [['data_referencia', 'DESC']],
    offset: (pageNumber - 1) * pageLimit,
    limit: pageLimit,
    raw: true
  });
  return {
    rows: result.rows,
    pagination: { page: pageNumber, limit: pageLimit, total: result.count }
  };
}

async function exportRows(type = 'dashboard') {
  const dashboard = await getDashboard();
  if (type === 'auditoria') {
    return dashboard.auditoria.logs;
  }
  if (type === 'snapshots') {
    return (await listSnapshots({ limit: 100 })).rows;
  }
  return [
    { indicador: 'Usuarios ativos', valor: dashboard.executiva.usuarios_ativos },
    { indicador: 'Empresas ativas', valor: dashboard.executiva.empresas_ativas },
    { indicador: 'Obras ativas', valor: dashboard.executiva.obras_ativas },
    { indicador: 'Processos abertos', valor: dashboard.executiva.processos_abertos },
    { indicador: 'Processos concluidos', valor: dashboard.executiva.processos_concluidos },
    { indicador: 'Documentos', valor: dashboard.executiva.documentos },
    { indicador: 'Modulos ativos', valor: dashboard.executiva.modulos_ativos },
    { indicador: 'Saude API', valor: dashboard.saude_tecnica.api },
    { indicador: 'Saude banco', valor: dashboard.saude_tecnica.database },
    { indicador: 'Saude storage', valor: dashboard.saude_tecnica.storage }
  ];
}

module.exports = {
  createDailySnapshot,
  exportRows,
  getAdoptionMetrics,
  getAuditGovernance,
  getDashboard,
  getExecutiveOverview,
  getOperationalEfficiency,
  getProductEvolution,
  getTechnicalHealth,
  listSnapshots
};
