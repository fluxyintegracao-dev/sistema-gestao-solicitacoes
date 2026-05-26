'use strict';

const { Op } = require('sequelize');
const {
  EmpresaGrupo,
  Obra,
  SstAcidente,
  SstBloqueioOperacional,
  SstComplianceScore,
  SstPendenciaOperacional,
  SstRisco
} = require('../../../models');
const { gerarDashboardExecutivoSst, gerarHeatmapSst } = require('./sstExecutiveAnalyticsService');
const { recalcularScoreSst } = require('../scoring/sstScoringService');
const { gerarInteligenciaOperacionalSst } = require('../ai/operational-intelligence/sstOperationalIntelligenceService');

async function gerarCentroOperacionalCorporativoSst(query = {}) {
  const [dashboard, heatmap, score, inteligencia] = await Promise.all([
    gerarDashboardExecutivoSst(query),
    gerarHeatmapSst(query),
    recalcularScoreSst(query),
    gerarInteligenciaOperacionalSst(query)
  ]);

  const where = {
    ...(query.empresa_id ? { empresa_id: Number(query.empresa_id) } : {}),
    ...(query.obra_id ? { obra_id: Number(query.obra_id) } : {})
  };

  const [empresas, obras, acidentes, pendencias, bloqueios, riscos, scores] = await Promise.all([
    EmpresaGrupo.findAll({ attributes: ['id', 'nome', 'razao_social', 'tipo_gerencial'], limit: 200 }),
    Obra.findAll({ attributes: ['id', 'codigo', 'nome', 'tipo_centro_custo'], limit: 500 }),
    SstAcidente.count({ where }),
    SstPendenciaOperacional.count({ where: { ...where, status: { [Op.in]: ['ABERTA', 'EM_TRATAMENTO'] } } }),
    SstBloqueioOperacional.count({ where: { ...where, status: 'ABERTO' } }),
    SstRisco.count({ where: { ...where, ativo: true, severidade: { [Op.in]: ['ALTA', 'CRITICA'] } } }),
    SstComplianceScore.findAll({ where, order: [['score', 'ASC']], limit: 100 })
  ]);

  return {
    resumo: {
      empresas_mapeadas: empresas.length,
      obras_mapeadas: obras.length,
      compliance_geral: dashboard.compliance_geral,
      nivel: dashboard.nivel,
      acidentes,
      pendencias_abertas: pendencias,
      bloqueios_abertos: bloqueios,
      riscos_criticos: riscos
    },
    score,
    heatmap_corporativo: heatmap.heatmap,
    empresas_criticas: scores.filter((item) => item.escopo_tipo === 'EMPRESA' && Number(item.score) < 50),
    obras_criticas: scores.filter((item) => item.escopo_tipo === 'OBRA' && Number(item.score) < 50),
    inteligencia,
    dashboard
  };
}

module.exports = {
  gerarCentroOperacionalCorporativoSst
};
