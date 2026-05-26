'use strict';

const { Op } = require('sequelize');
const { Obra, SstBloqueioOperacional, SstPendenciaOperacional, SstRisco } = require('../../../../models');
const { ValidationError } = require('../../../../middlewares/validation');
const { gerarHeatmapSst } = require('../../analytics/sstExecutiveAnalyticsService');
const { recalcularScoreSst } = require('../../scoring/sstScoringService');

async function gerarVisaoOperacionalObraSst(obra_id) {
  if (!obra_id) throw new ValidationError('Obra e obrigatoria para visao operacional SST.');
  const obra = await Obra.findByPk(obra_id, { attributes: ['id', 'codigo', 'nome', 'tipo_centro_custo'] });
  if (!obra) throw new ValidationError('Obra nao encontrada para visao SST.', 404);

  const [heatmap, score, pendenciasCriticas, bloqueiosAtivos, riscosCriticos] = await Promise.all([
    gerarHeatmapSst({ obra_id }),
    recalcularScoreSst({ obra_id }),
    SstPendenciaOperacional.count({ where: { obra_id, status: 'ABERTA', criticidade: { [Op.in]: ['CRITICA', 'EMERGENCIAL'] } } }),
    SstBloqueioOperacional.count({ where: { obra_id, status: 'ABERTO' } }),
    SstRisco.count({ where: { obra_id, severidade: { [Op.in]: ['ALTA', 'CRITICA'] }, ativo: true } })
  ]);

  return {
    obra,
    score_obra: score.obras?.[0] || null,
    pendencias_criticas: pendenciasCriticas,
    bloqueios_ativos: bloqueiosAtivos,
    riscos_criticos: riscosCriticos,
    heatmap
  };
}

module.exports = {
  gerarVisaoOperacionalObraSst
};
