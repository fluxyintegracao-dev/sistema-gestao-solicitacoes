const { responderErroController } = require('../../../utils/controllerError');
const { getBankingDashboard } = require('../services/bankingDashboardService');
const { getCnab240PaymentSpec } = require('../services/cnab240PaymentSpecService');
const {
  gerarRemessaCaixaPagamento,
  listarConveniosCaixaPagamento,
  listarRemessasCaixaPagamento,
  listarTitulosElegiveisCaixaPagamento,
  obterRemessaCaixaPagamento,
  salvarConvenioCaixaPagamento
} = require('../services/caixaPagamentoCnab240Service');

module.exports = {
  async dashboard(req, res) {
    try {
      const data = await getBankingDashboard(req);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao carregar painel bancario enterprise');
    }
  },

  async cnab240Pagamentos(req, res) {
    try {
      return res.json(getCnab240PaymentSpec());
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao carregar contrato CNAB240 de pagamentos');
    }
  },

  async listarConveniosCaixaPagamento(req, res) {
    try {
      return res.json(await listarConveniosCaixaPagamento());
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar convenios Caixa de pagamentos');
    }
  },

  async criarConvenioCaixaPagamento(req, res) {
    try {
      const convenio = await salvarConvenioCaixaPagamento(req.body, req.user?.id || null);
      return res.status(201).json(convenio);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao criar convenio Caixa de pagamentos');
    }
  },

  async atualizarConvenioCaixaPagamento(req, res) {
    try {
      const convenio = await salvarConvenioCaixaPagamento(req.body, req.user?.id || null, req.params.id);
      return res.json(convenio);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao atualizar convenio Caixa de pagamentos');
    }
  },

  async listarTitulosElegiveisCaixaPagamento(req, res) {
    try {
      return res.json(await listarTitulosElegiveisCaixaPagamento(req.query));
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar titulos elegiveis para remessa Caixa');
    }
  },

  async listarRemessasCaixaPagamento(req, res) {
    try {
      return res.json(await listarRemessasCaixaPagamento());
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar remessas Caixa de pagamentos');
    }
  },

  async gerarRemessaCaixaPagamento(req, res) {
    try {
      const remessa = await gerarRemessaCaixaPagamento({
        convenio_id: req.body.convenio_id,
        titulo_ids: req.body.titulo_ids,
        data_pagamento: req.body.data_pagamento,
        usuario_id: req.user?.id || null
      });
      return res.status(201).json(remessa);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao gerar remessa Caixa de pagamentos');
    }
  },

  async downloadRemessaCaixaPagamento(req, res) {
    try {
      const remessa = await obterRemessaCaixaPagamento(req.params.id);
      res.setHeader('Content-Type', 'text/plain; charset=windows-1252');
      res.setHeader('Content-Disposition', `attachment; filename="${remessa.nome_arquivo}"`);
      return res.send(remessa.conteudo_cnab);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao baixar remessa Caixa de pagamentos');
    }
  }
};
