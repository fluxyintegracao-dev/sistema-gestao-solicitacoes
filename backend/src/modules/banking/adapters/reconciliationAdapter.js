const { ConciliacaoBancaria, ConciliacaoBancariaImportacao, sequelize } = require('../../../models');
const { buildStatusCounters, sumCounters, toNumber } = require('../services/bankingUtils');

async function getReconciliationSnapshot() {
  const statusRows = await ConciliacaoBancaria.findAll({
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count'], [sequelize.fn('SUM', sequelize.col('valor')), 'total_value']],
    group: ['status'],
    raw: true
  });

  const counters = buildStatusCounters(statusRows);
  const valueByStatus = statusRows.reduce((acc, row) => {
    acc[String(row.status || 'INDEFINIDO').toUpperCase()] = toNumber(row.total_value);
    return acc;
  }, {});

  const recentItems = await ConciliacaoBancaria.findAll({
    attributes: ['id', 'conta_bancaria_id', 'empresa_id', 'documento', 'descricao_banco', 'valor', 'data_movimento', 'status', 'createdAt', 'updatedAt'],
    order: [['updatedAt', 'DESC']],
    limit: 12
  });

  const importacoesRecentes = await ConciliacaoBancariaImportacao.findAll({
    attributes: ['id', 'conta_bancaria_id', 'empresa_id', 'arquivo_nome', 'total_lidos', 'importados', 'ignorados', 'createdAt'],
    order: [['createdAt', 'DESC']],
    limit: 6
  });

  return {
    source: 'OFX_RECONCILIATION',
    totals: {
      total: Object.values(counters).reduce((sum, value) => sum + toNumber(value), 0),
      pending: sumCounters(counters, ['PENDENTE']),
      reconciled: sumCounters(counters, ['CONCILIADO']),
      ignored: sumCounters(counters, ['IGNORADO']),
      pending_value: valueByStatus.PENDENTE || 0
    },
    status: counters,
    recent: recentItems.map((item) => item.toJSON()),
    imports: importacoesRecentes.map((item) => item.toJSON())
  };
}

module.exports = {
  getReconciliationSnapshot
};
