'use strict';

const {
  Obra,
  SstAcidente,
  SstRisco,
  SstTreinamento
} = require('../../../models');

function buildWhere(query = {}) {
  const where = {};
  if (query.empresa_id) where.empresa_id = Number(query.empresa_id);
  if (query.obra_id) where.obra_id = Number(query.obra_id);
  if (query.colaborador_id) where.colaborador_id = Number(query.colaborador_id);
  return where;
}

function groupByObra(rows) {
  return rows.reduce((acc, item) => {
    const obraId = item.obra_id || 'sem_obra';
    const label = item.obra?.nome || item.obra?.codigo || 'Sem obra';
    if (!acc[obraId]) acc[obraId] = { obra_id: item.obra_id || null, obra: label, total: 0 };
    acc[obraId].total += 1;
    return acc;
  }, {});
}

async function gerarAnalyticsSst(query = {}) {
  const where = buildWhere(query);
  const [acidentes, riscos, treinamentos] = await Promise.all([
    SstAcidente.findAll({
      where,
      include: [{ model: Obra, as: 'obra', attributes: ['id', 'codigo', 'nome'] }],
      limit: 1000
    }),
    SstRisco.findAll({
      where,
      include: [{ model: Obra, as: 'obra', attributes: ['id', 'codigo', 'nome'] }],
      limit: 1000
    }),
    SstTreinamento.findAll({ where, limit: 1000 })
  ]);

  return {
    acidentes_por_obra: Object.values(groupByObra(acidentes)),
    riscos_por_obra: Object.values(groupByObra(riscos)),
    acidentes_por_gravidade: acidentes.reduce((acc, item) => {
      const key = item.gravidade || 'SEM_GRAVIDADE';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    riscos_por_severidade: riscos.reduce((acc, item) => {
      const key = item.severidade || 'SEM_SEVERIDADE';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    treinamentos_por_status: treinamentos.reduce((acc, item) => {
      const key = item.status || 'SEM_STATUS';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  };
}

module.exports = {
  gerarAnalyticsSst
};
