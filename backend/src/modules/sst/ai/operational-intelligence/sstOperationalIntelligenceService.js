'use strict';

const { gerarDashboardExecutivoSst, gerarHeatmapSst } = require('../../analytics/sstExecutiveAnalyticsService');
const { gerarRecomendacoesSst } = require('../../recommendations/sstRecommendationService');

async function gerarInteligenciaOperacionalSst(query = {}) {
  const [dashboard, heatmap, recomendacoes] = await Promise.all([
    gerarDashboardExecutivoSst(query),
    gerarHeatmapSst(query),
    gerarRecomendacoesSst(query)
  ]);

  const sinais = [];
  if (dashboard.compliance_geral < 50) {
    sinais.push({
      tipo: 'RISCO_CORPORATIVO',
      criticidade: 'CRITICA',
      mensagem: 'Compliance geral abaixo de 50%. Priorizar saneamento de ASO, treinamentos e EPIs.'
    });
  }
  for (const item of heatmap.heatmap.slice(0, 5)) {
    if (item.criticidade === 'CRITICA') {
      sinais.push({
        tipo: 'OBRA_CRITICA',
        criticidade: 'CRITICA',
        obra_id: item.obra_id,
        mensagem: `Obra ${item.obra} concentra risco operacional SST critico.`
      });
    }
  }

  return {
    status: 'INTELIGENCIA_OPERACIONAL_DETERMINISTICA',
    usa_modelo_ia: false,
    sinais,
    recomendacoes: recomendacoes.recomendacoes,
    dashboard,
    heatmap
  };
}

module.exports = {
  gerarInteligenciaOperacionalSst
};
