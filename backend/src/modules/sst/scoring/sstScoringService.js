'use strict';

const { SstComplianceScore } = require('../../../models');
const { calcularScoresSst } = require('../analytics/sstExecutiveAnalyticsService');

function nivelScore(score) {
  if (score >= 90) return 'EXCELENTE';
  if (score >= 75) return 'CONTROLADO';
  if (score >= 50) return 'ATENCAO';
  return 'CRITICO';
}

function average(values) {
  const nums = values.map((item) => Number(item || 0)).filter((item) => Number.isFinite(item));
  return nums.length ? Math.round(nums.reduce((sum, item) => sum + item, 0) / nums.length) : 100;
}

async function upsertScore({ escopo_tipo, escopo_id = null, empresa_id = null, obra_id = null, colaborador_id = null, setor_id = null, score, componentes = {}, pendencias_total = 0, pendencias_criticas = 0 }) {
  const [registro] = await SstComplianceScore.findOrCreate({
    where: { escopo_tipo, escopo_id },
    defaults: {
      empresa_id,
      obra_id,
      colaborador_id,
      setor_id,
      escopo_tipo,
      escopo_id,
      score,
      nivel: nivelScore(score),
      calculado_em: new Date(),
      componentes_json: JSON.stringify(componentes),
      pendencias_total,
      pendencias_criticas
    }
  });

  await registro.update({
    empresa_id,
    obra_id,
    colaborador_id,
    setor_id,
    score,
    nivel: nivelScore(score),
    calculado_em: new Date(),
    componentes_json: JSON.stringify(componentes),
    pendencias_total,
    pendencias_criticas
  });

  return registro;
}

async function recalcularScoreSst(query = {}) {
  const scoreData = await calcularScoresSst(query);
  const colaboradorScores = scoreData.scores || [];
  const gruposEmpresa = new Map();
  const gruposObra = new Map();

  for (const item of colaboradorScores) {
    if (item.empresa_id) {
      if (!gruposEmpresa.has(item.empresa_id)) gruposEmpresa.set(item.empresa_id, []);
      gruposEmpresa.get(item.empresa_id).push(item);
    }
    if (item.obra_id) {
      if (!gruposObra.has(item.obra_id)) gruposObra.set(item.obra_id, []);
      gruposObra.get(item.obra_id).push(item);
    }
  }

  const empresas = [];
  for (const [empresaId, items] of gruposEmpresa.entries()) {
    empresas.push(await upsertScore({
      escopo_tipo: 'EMPRESA',
      escopo_id: Number(empresaId),
      empresa_id: Number(empresaId),
      score: average(items.map((item) => item.score)),
      componentes: { colaboradores: items.length },
      pendencias_total: items.reduce((sum, item) => sum + Number(item.pendencias_total || 0), 0),
      pendencias_criticas: items.reduce((sum, item) => sum + Number(item.pendencias_criticas || 0), 0)
    }));
  }

  const obras = [];
  for (const [obraId, items] of gruposObra.entries()) {
    obras.push(await upsertScore({
      escopo_tipo: 'OBRA',
      escopo_id: Number(obraId),
      obra_id: Number(obraId),
      score: average(items.map((item) => item.score)),
      componentes: { colaboradores: items.length },
      pendencias_total: items.reduce((sum, item) => sum + Number(item.pendencias_total || 0), 0),
      pendencias_criticas: items.reduce((sum, item) => sum + Number(item.pendencias_criticas || 0), 0)
    }));
  }

  const corporativoScore = average([
    ...empresas.map((item) => item.score),
    ...obras.map((item) => item.score),
    ...colaboradorScores.map((item) => item.score)
  ]);
  const corporativo = await upsertScore({
    escopo_tipo: 'CORPORATIVO',
    escopo_id: 0,
    score: corporativoScore,
    componentes: {
      colaboradores: colaboradorScores.length,
      empresas: empresas.length,
      obras: obras.length
    },
    pendencias_total: scoreData.conformidade?.pendencias_total || 0,
    pendencias_criticas: scoreData.conformidade?.pendencias_criticas || 0
  });

  return {
    corporativo,
    empresas,
    obras,
    colaboradores: colaboradorScores,
    conformidade: scoreData.conformidade
  };
}

module.exports = {
  recalcularScoreSst
};
