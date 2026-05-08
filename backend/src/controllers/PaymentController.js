const {
  cancelBatch,
  createBatchFromTitulos,
  getBatchDetail,
  listBatches,
  listPaymentAccounts,
  listProviders,
  listarTitulosElegiveis,
  submitBatchForApproval
} = require('../services/paymentBatchService');
const {
  approveBatchWithMfa,
  rejectBatch
} = require('../services/paymentApprovalService');
const {
  enqueueSendBatch,
  markBatchAsBankConfirmedMock
} = require('../services/paymentExecutionService');
const {
  confirmBaixaFromPaymentIntent,
  listPaymentsAwaitingBaixaConfirmation
} = require('../services/paymentBaixaService');
const {
  createPaymentAccount,
  updatePaymentAccount
} = require('../services/paymentAccountService');
const { responderErroController } = require('../utils/controllerError');

function responderErro(res, error, fallbackMessage) {
  return responderErroController(res, error, fallbackMessage);
}

module.exports = {
  async titulosElegiveis(req, res) {
    try {
      const data = await listarTitulosElegiveis(req, req.query || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao listar titulos elegiveis para pagamento');
    }
  },

  async criarLote(req, res) {
    try {
      const data = await createBatchFromTitulos(req, req.body || {});
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao criar lote de pagamento');
    }
  },

  async lotes(req, res) {
    try {
      const data = await listBatches(req, req.query || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao listar lotes de pagamento');
    }
  },

  async loteDetalhe(req, res) {
    try {
      const data = await getBatchDetail(req, req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao buscar lote de pagamento');
    }
  },

  async submeterAprovacao(req, res) {
    try {
      const data = await submitBatchForApproval(req, req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao submeter lote para aprovacao');
    }
  },

  async aprovarLote(req, res) {
    try {
      const data = await approveBatchWithMfa(req, req.params.id, req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao aprovar lote de pagamento');
    }
  },

  async rejeitarLote(req, res) {
    try {
      const data = await rejectBatch(req, req.params.id, req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao rejeitar lote de pagamento');
    }
  },

  async cancelarLote(req, res) {
    try {
      const data = await cancelBatch(req, req.params.id, req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao cancelar lote de pagamento');
    }
  },

  async enviarBanco(req, res) {
    try {
      const data = await enqueueSendBatch(req, req.params.id, req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao enviar lote ao banco');
    }
  },

  async simularRetornoBanco(req, res) {
    try {
      const data = await markBatchAsBankConfirmedMock(req, req.params.id, req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao simular retorno bancario');
    }
  },

  async aguardandoBaixa(req, res) {
    try {
      const data = await listPaymentsAwaitingBaixaConfirmation(req);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao listar pagamentos aguardando baixa');
    }
  },

  async confirmarBaixa(req, res) {
    try {
      const data = await confirmBaixaFromPaymentIntent(req, req.params.id, req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao confirmar baixa do pagamento');
    }
  },

  async providers(req, res) {
    try {
      const data = await listProviders(req);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao listar providers de pagamento');
    }
  },

  async accounts(req, res) {
    try {
      const data = await listPaymentAccounts(req);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao listar contas pagadoras');
    }
  },

  async criarAccount(req, res) {
    try {
      const data = await createPaymentAccount(req, req.body || {});
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao criar conta pagadora');
    }
  },

  async atualizarAccount(req, res) {
    try {
      const data = await updatePaymentAccount(req, req.params.id, req.body || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao atualizar conta pagadora');
    }
  }
};
