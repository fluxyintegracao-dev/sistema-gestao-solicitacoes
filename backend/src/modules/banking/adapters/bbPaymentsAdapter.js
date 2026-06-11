const {
  PaymentAccount,
  PaymentBatch,
  PaymentEvent,
  PaymentJob,
  PaymentProvider,
  PaymentTransaction,
  sequelize
} = require('../../../models');
const { buildStatusCounters, sumCounters, toNumber } = require('../services/bankingUtils');

async function getBbPaymentsSnapshot() {
  const [providers, accounts, batchRows, jobRows, recentBatches, recentTransactions, recentEvents] = await Promise.all([
    PaymentProvider.findAll({
      attributes: ['id', 'codigo', 'nome', 'ambiente', 'ativo', 'config_ref', 'updatedAt'],
      order: [['ativo', 'DESC'], ['codigo', 'ASC']]
    }),
    PaymentAccount.findAll({
      attributes: ['id', 'provider_id', 'conta_bancaria_id', 'empresa_id', 'banco_codigo', 'agencia', 'conta', 'tipo_conta', 'convenio', 'ambiente', 'ativo', 'updatedAt'],
      order: [['ativo', 'DESC'], ['id', 'DESC']]
    }),
    PaymentBatch.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count'], [sequelize.fn('SUM', sequelize.col('valor_total')), 'total_value']],
      group: ['status'],
      raw: true
    }),
    PaymentJob.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true
    }),
    PaymentBatch.findAll({
      attributes: ['id', 'codigo', 'provider_id', 'payment_account_id', 'empresa_id', 'status', 'quantidade_itens', 'valor_total', 'data_programada', 'aprovacao_status', 'sent_at', 'closed_at', 'createdAt', 'updatedAt'],
      order: [['updatedAt', 'DESC']],
      limit: 10
    }),
    PaymentTransaction.findAll({
      attributes: ['id', 'payment_batch_id', 'payment_intent_id', 'provider_id', 'status', 'http_status', 'provider_batch_id', 'error_code', 'error_message', 'started_at', 'finished_at', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 10
    }),
    PaymentEvent.findAll({
      attributes: ['id', 'payment_batch_id', 'payment_intent_id', 'provider_id', 'event_type', 'processing_status', 'provider_event_id', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 10
    })
  ]);

  const batchStatus = buildStatusCounters(batchRows);
  const batchValueByStatus = batchRows.reduce((acc, row) => {
    acc[String(row.status || 'INDEFINIDO').toUpperCase()] = toNumber(row.total_value);
    return acc;
  }, {});
  const jobStatus = buildStatusCounters(jobRows);

  return {
    source: 'BANCO_DO_BRASIL_PAYMENTS',
    contracts: {
      service: 'PIX_EM_MASSA_API',
      provider: 'BANCO_DO_BRASIL',
      preserves_existing_engine: true
    },
    totals: {
      providers: providers.length,
      providers_active: providers.filter((item) => item.ativo).length,
      accounts: accounts.length,
      accounts_active: accounts.filter((item) => item.ativo).length,
      batches: Object.values(batchStatus).reduce((sum, value) => sum + toNumber(value), 0),
      batches_failed: sumCounters(batchStatus, ['FALHA_INTEGRACAO', 'REJEITADO', 'PARCIALMENTE_REJEITADO']),
      batches_processing: sumCounters(batchStatus, ['ENFILEIRADO', 'ENVIANDO', 'ENVIADO_AO_BANCO', 'PROCESSANDO_BANCO']),
      awaiting_baixa: sumCounters(batchStatus, ['AGUARDANDO_CONFIRMACAO_BAIXA', 'CONFIRMADO_BANCO']),
      awaiting_baixa_value: (batchValueByStatus.AGUARDANDO_CONFIRMACAO_BAIXA || 0) + (batchValueByStatus.CONFIRMADO_BANCO || 0),
      jobs_pending: sumCounters(jobStatus, ['PENDENTE', 'PROCESSANDO']),
      jobs_failed: sumCounters(jobStatus, ['ERRO'])
    },
    status: {
      batches: batchStatus,
      jobs: jobStatus
    },
    providers: providers.map((item) => item.toJSON()),
    accounts: accounts.map((item) => item.toJSON()),
    recent_batches: recentBatches.map((item) => item.toJSON()),
    recent_transactions: recentTransactions.map((item) => item.toJSON()),
    recent_events: recentEvents.map((item) => item.toJSON())
  };
}

module.exports = {
  getBbPaymentsSnapshot
};
