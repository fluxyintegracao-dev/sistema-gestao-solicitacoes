const { FinanciamentoBancario, FinanciamentoBancarioParcela, sequelize } = require('../../../models');
const { buildStatusCounters, sumCounters, toNumber } = require('../services/bankingUtils');

async function getFinancingSnapshot() {
  const [statusRows, parcelasRows, recent] = await Promise.all([
    FinanciamentoBancario.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count'], [sequelize.fn('SUM', sequelize.col('valor_total')), 'total_value']],
      group: ['status'],
      raw: true
    }),
    FinanciamentoBancarioParcela.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count'], [sequelize.fn('SUM', sequelize.col('valor_parcela')), 'total_value']],
      group: ['status'],
      raw: true
    }),
    FinanciamentoBancario.findAll({
      attributes: ['id', 'codigo', 'status', 'empresa_id', 'conta_bancaria_id', 'parceiro_id', 'numero_contrato', 'tipo_contrato', 'quantidade_parcelas', 'valor_credito', 'valor_total', 'titulos_gerados_em', 'createdAt', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
      limit: 8
    })
  ]);

  const status = buildStatusCounters(statusRows);
  const parcelasStatus = buildStatusCounters(parcelasRows);
  const valueByStatus = statusRows.reduce((acc, row) => {
    acc[String(row.status || 'INDEFINIDO').toUpperCase()] = toNumber(row.total_value);
    return acc;
  }, {});

  return {
    source: 'BANK_FINANCING',
    totals: {
      total: Object.values(status).reduce((sum, value) => sum + toNumber(value), 0),
      active: sumCounters(status, ['ATIVO']),
      draft: sumCounters(status, ['RASCUNHO']),
      total_value_active: valueByStatus.ATIVO || 0,
      installments_pending_titles: sumCounters(parcelasStatus, ['PREVISTA'])
    },
    status,
    installments_status: parcelasStatus,
    recent: recent.map((item) => item.toJSON())
  };
}

module.exports = {
  getFinancingSnapshot
};
