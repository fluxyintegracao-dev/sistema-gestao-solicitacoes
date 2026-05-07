module.exports = {
  async authenticate() {
    return {
      mode: 'MOCK_HOMOLOGACAO',
      authenticated: true
    };
  },

  async submitBatch(batch) {
    return {
      mode: 'MOCK_HOMOLOGACAO',
      accepted: true,
      provider_batch_id: `MOCK-BB-${batch.codigo}`
    };
  },

  async getBatchStatus(providerBatchId) {
    return {
      provider_batch_id: providerBatchId,
      status: 'PROCESSANDO_BANCO'
    };
  },

  async getPaymentStatus(providerTransactionId) {
    return {
      provider_transaction_id: providerTransactionId,
      status: 'PROCESSANDO_BANCO'
    };
  },

  async cancelPayment(intent) {
    return {
      provider_transaction_id: intent?.correlation_id || null,
      status: 'CANCELADO'
    };
  },

  normalizeError(error) {
    return {
      code: error?.code || 'BB_MOCK_ERROR',
      message: error?.message || 'Erro mockado no provider Banco do Brasil'
    };
  },

  normalizeStatus(response) {
    return String(response?.status || 'PROCESSANDO_BANCO').trim().toUpperCase();
  }
};
