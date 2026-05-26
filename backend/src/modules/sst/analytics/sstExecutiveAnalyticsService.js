'use strict';

const { Op } = require('sequelize');
const {
  Obra,
  RhColaborador,
  SstAcidente,
  SstBloqueioOperacional,
  SstComplianceScore,
  SstPendenciaOperacional,
  SstRisco
} = require('../../../models');
const { analisarConformidadeSst } = require('../compliance/sstComplianceEngine');

function buildWhere(query = {}) {
  const where = {};
  if (query.empresa_id) where.empresa_id = Number(query.empresa_id);
  if (query.obra_id) where.obra_id = Number(query.obra_id);
  if (query.colaborador_id) where.colaborador_id = Number(query.colaborador_id);
  return where;
}

function scoreNivel(score) {
  if (score >= 90) return 'EXCELENTE';
  if (score >= 75) return 'CONTROLADO';
  if (score >= 50) return 'ATENCAO';
  return 'CRITICO';
}

function agruparPorObra(rows, field = 'obra_id') {
  const map = new Map();
  for (const row of rows) {
    const plain = typeof row?.toJSON === 'function' ? row.toJSON() : row;
    const id = plain?.[field] || 'sem_obra';
    const current = map.get(id) || {
      obra_id: plain?.[field] || null,
      obra: plain?.obra?.nome || plain?.obra?.codigo || 'Sem obra',
      total: 0
    };
    current.total += 1;
    map.set(id, current);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

async function calcularScoresSst(query = {}) {
  const conformidade = await analisarConformidadeSst(query);
  const byColaborador = new Map();
  for (const pendencia of conformidade.pendencias || []) {
    const key = pendencia.colaborador_id || 0;
    if (!byColaborador.has(key)) byColaborador.set(key, []);
    byColaborador.get(key).push(pendencia);
  }

  const colaboradores = await RhColaborador.findAll({
    where: {
      status: 'ATIVO',
      ...(query.empresa_id ? { empresa_grupo_id: Number(query.empresa_id) } : {}),
      ...(query.obra_id ? { obra_id: Number(query.obra_id) } : {}),
      ...(query.colaborador_id ? { id: Number(query.colaborador_id) } : {})
    },
    attributes: ['id', 'nome', 'cargo', 'empresa_grupo_id', 'obra_id'],
    limit: 1000
  });

  const scores = [];
  for (const colaborador of colaboradores) {
    const pendencias = byColaborador.get(colaborador.id) || [];
    const criticas = pendencias.filter((item) => item.severidade === 'CRITICA').length;
    const alertas = pendencias.length - criticas;
    const score = Math.max(0, 100 - (criticas * 25) - (alertas * 10));
    const [registro] = await SstComplianceScore.findOrCreate({
      where: {
        escopo_tipo: 'COLABORADOR',
        colaborador_id: colaborador.id
      },
      defaults: {
        empresa_id: colaborador.empresa_grupo_id || null,
        obra_id: colaborador.obra_id || null,
        colaborador_id: colaborador.id,
        escopo_tipo: 'COLABORADOR',
        escopo_id: colaborador.id,
        score,
        nivel: scoreNivel(score),
        componentes_json: JSON.stringify({ pendencias }),
        pendencias_total: pendencias.length,
        pendencias_criticas: criticas
      }
    });
    await registro.update({
      empresa_id: colaborador.empresa_grupo_id || null,
      obra_id: colaborador.obra_id || null,
      score,
      nivel: scoreNivel(score),
      calculado_em: new Date(),
      componentes_json: JSON.stringify({ pendencias }),
      pendencias_total: pendencias.length,
      pendencias_criticas: criticas
    });
    scores.push(registro);
  }

  return {
    conformidade,
    scores
  };
}

async function gerarHeatmapSst(query = {}) {
  await calcularScoresSst(query);
  const where = buildWhere(query);
  const [pendencias, bloqueios, acidentes, riscos, scores] = await Promise.all([
    SstPendenciaOperacional.findAll({
      where: { ...where, status: { [Op.in]: ['ABERTA', 'EM_TRATAMENTO'] } },
      include: [{ model: Obra, as: 'obra', attributes: ['id', 'codigo', 'nome'] }],
      limit: 1000
    }),
    SstBloqueioOperacional.findAll({
      where: { ...where, status: 'ABERTO' },
      include: [{ model: Obra, as: 'obra', attributes: ['id', 'codigo', 'nome'] }],
      limit: 1000
    }),
    SstAcidente.findAll({
      where,
      include: [{ model: Obra, as: 'obra', attributes: ['id', 'codigo', 'nome'] }],
      limit: 1000
    }),
    SstRisco.findAll({
      where: { ...where, severidade: { [Op.in]: ['ALTA', 'CRITICA'] }, ativo: true },
      include: [{ model: Obra, as: 'obra', attributes: ['id', 'codigo', 'nome'] }],
      limit: 1000
    }),
    SstComplianceScore.findAll({ where, limit: 1000 })
  ]);

  const pendenciasPorObra = agruparPorObra(pendencias);
  const bloqueiosPorObra = agruparPorObra(bloqueios);
  const acidentesPorObra = agruparPorObra(acidentes);
  const riscosPorObra = agruparPorObra(riscos);

  const obrasMap = new Map();
  for (const group of [...pendenciasPorObra, ...bloqueiosPorObra, ...acidentesPorObra, ...riscosPorObra]) {
    const key = group.obra_id || 'sem_obra';
    const current = obrasMap.get(key) || { obra_id: group.obra_id, obra: group.obra, pendencias: 0, bloqueios: 0, acidentes: 0, riscos: 0 };
    obrasMap.set(key, current);
  }
  for (const item of pendenciasPorObra) obrasMap.get(item.obra_id || 'sem_obra').pendencias = item.total;
  for (const item of bloqueiosPorObra) obrasMap.get(item.obra_id || 'sem_obra').bloqueios = item.total;
  for (const item of acidentesPorObra) obrasMap.get(item.obra_id || 'sem_obra').acidentes = item.total;
  for (const item of riscosPorObra) obrasMap.get(item.obra_id || 'sem_obra').riscos = item.total;

  const heatmap = Array.from(obrasMap.values()).map((item) => {
    const indice = (item.pendencias * 2) + (item.bloqueios * 3) + (item.acidentes * 4) + (item.riscos * 3);
    return {
      ...item,
      indice_risco: indice,
      criticidade: indice >= 20 ? 'CRITICA' : indice >= 10 ? 'ALTA' : indice >= 4 ? 'MEDIA' : 'BAIXA'
    };
  }).sort((a, b) => b.indice_risco - a.indice_risco);

  return {
    heatmap,
    scores,
    totais: {
      pendencias: pendencias.length,
      bloqueios: bloqueios.length,
      acidentes: acidentes.length,
      riscos_criticos: riscos.length
    }
  };
}

async function gerarDashboardExecutivoSst(query = {}) {
  const [scoreData, heatmapData] = await Promise.all([
    calcularScoresSst(query),
    gerarHeatmapSst(query)
  ]);
  const scores = scoreData.scores || [];
  const media = scores.length
    ? Math.round(scores.reduce((sum, item) => sum + Number(item.score || 0), 0) / scores.length)
    : scoreData.conformidade.compliance_score;

  return {
    compliance_geral: media,
    nivel: scoreNivel(media),
    cards: {
      colaboradores_avaliados: scores.length,
      pendencias_total: scoreData.conformidade.pendencias_total,
      pendencias_criticas: scoreData.conformidade.pendencias_criticas,
      obras_criticas: heatmapData.heatmap.filter((item) => item.criticidade === 'CRITICA').length,
      bloqueios_abertos: heatmapData.totais.bloqueios
    },
    heatmap: heatmapData.heatmap.slice(0, 10),
    colaboradores_criticos: scores
      .filter((item) => Number(item.score || 0) < 50)
      .sort((a, b) => Number(a.score || 0) - Number(b.score || 0))
      .slice(0, 20),
    conformidade: scoreData.conformidade
  };
}

module.exports = {
  calcularScoresSst,
  gerarDashboardExecutivoSst,
  gerarHeatmapSst
};
