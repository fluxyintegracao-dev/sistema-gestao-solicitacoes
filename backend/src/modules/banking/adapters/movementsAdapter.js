const { MovimentoFinanceiro, sequelize } = require('../../../models');
const { buildStatusCounters, toNumber } = require('../services/bankingUtils');

async function getMovementsSnapshot() {
  const [statusRows, byAccountRows, recent] = await Promise.all([
    MovimentoFinanceiro.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count'], [sequelize.fn('SUM', sequelize.col('valor_quitacao')), 'total_value']],
      group: ['status'],
      raw: true
    }),
    MovimentoFinanceiro.findAll({
      attributes: ['conta_bancaria_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count'], [sequelize.fn('SUM', sequelize.col('valor_quitacao')), 'total_value']],
      where: { status: 'ATIVO' },
      group: ['conta_bancaria_id'],
      raw: true
    }),
    MovimentoFinanceiro.findAll({
      attributes: ['id', 'titulo_financeiro_id', 'conta_bancaria_id', 'empresa_id', 'tipo_movimento', 'status', 'valor', 'valor_quitacao', 'data_movimento', 'forma_recebimento', 'documento_referencia', 'createdAt'],
      order: [['data_movimento', 'DESC'], ['id', 'DESC']],
      limit: 12
    })
  ]);

  const status = buildStatusCounters(statusRows);
  const valueByStatus = statusRows.reduce((acc, row) => {
    acc[String(row.status || 'INDEFINIDO').toUpperCase()] = toNumber(row.total_value);
    return acc;
  }, {});

  return {
    source: 'FINANCIAL_MOVEMENTS',
    totals: {
      total: Object.values(status).reduce((sum, value) => sum + toNumber(value), 0),
      active: status.ATIVO || 0,
      reversed: status.ESTORNADO || 0,
      active_value: valueByStatus.ATIVO || 0
    },
    status,
    by_account: byAccountRows.map((row) => ({
      conta_bancaria_id: row.conta_bancaria_id,
      count: toNumber(row.count),
      total_value: toNumber(row.total_value)
    })),
    recent: recent.map((item) => item.toJSON())
  };
}

module.exports = {
  getMovementsSnapshot
};
