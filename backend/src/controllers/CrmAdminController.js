const {
  listarCanais: listarCanaisService,
  obterCanal: obterCanalService,
  criarCanal: criarCanalService,
  atualizarCanal: atualizarCanalService,
  excluirCanal: excluirCanalService,
  listarPhoneAssets: listarPhoneAssetsService,
  obterPhoneAsset: obterPhoneAssetService,
  criarPhoneAsset: criarPhoneAssetService,
  atualizarPhoneAsset: atualizarPhoneAssetService,
  excluirPhoneAsset: excluirPhoneAssetService
} = require('../services/crmChannelService');
const {
  obterConfiguracoesIntegracoes,
  atualizarConfiguracoesIntegracoes
} = require('../services/crmIntegrationAdminService');
const {
  listarEventosMeta: listarEventosMetaService,
  reprocessarEventoMeta: reprocessarEventoMetaService
} = require('../services/crmWebhookMetaService');
const {
  listarEventosGoogle: listarEventosGoogleService,
  reprocessarEventoGoogle: reprocessarEventoGoogleService
} = require('../services/crmWebhookGoogleService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async listarCanais(req, res) {
    try {
      return res.json(await listarCanaisService(req.query || {}));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao listar canais CRM');
    }
  },

  async obterCanal(req, res) {
    try {
      return res.json(await obterCanalService(req.params.id));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao buscar canal CRM');
    }
  },

  async criarCanal(req, res) {
    try {
      return res.status(201).json(await criarCanalService(req.body || {}));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao criar canal CRM');
    }
  },

  async atualizarCanal(req, res) {
    try {
      return res.json(await atualizarCanalService(req.params.id, req.body || {}));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao atualizar canal CRM');
    }
  },

  async excluirCanal(req, res) {
    try {
      await excluirCanalService(req.params.id);
      return res.json({ ok: true });
    } catch (error) {
      return responderErroController(res, error, 'Erro ao excluir canal CRM');
    }
  },

  async listarNumeros(req, res) {
    try {
      return res.json(await listarPhoneAssetsService(req.query || {}));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao listar numeros CRM');
    }
  },

  async obterNumero(req, res) {
    try {
      return res.json(await obterPhoneAssetService(req.params.id));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao buscar numero CRM');
    }
  },

  async criarNumero(req, res) {
    try {
      return res.status(201).json(await criarPhoneAssetService(req.body || {}));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao criar numero CRM');
    }
  },

  async atualizarNumero(req, res) {
    try {
      return res.json(await atualizarPhoneAssetService(req.params.id, req.body || {}));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao atualizar numero CRM');
    }
  },

  async excluirNumero(req, res) {
    try {
      await excluirPhoneAssetService(req.params.id);
      return res.json({ ok: true });
    } catch (error) {
      return responderErroController(res, error, 'Erro ao excluir numero CRM');
    }
  },

  async obterIntegracoes(req, res) {
    try {
      return res.json(await obterConfiguracoesIntegracoes());
    } catch (error) {
      return responderErroController(res, error, 'Erro ao buscar integracoes CRM');
    }
  },

  async atualizarIntegracoes(req, res) {
    try {
      return res.json(await atualizarConfiguracoesIntegracoes(req.body || {}));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao atualizar integracoes CRM');
    }
  },

  async listarEventosMeta(req, res) {
    try {
      return res.json(await listarEventosMetaService(req.query || {}));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao listar eventos Meta CRM');
    }
  },

  async reprocessarEventoMeta(req, res) {
    try {
      return res.json(await reprocessarEventoMetaService(req.params.id));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao reprocessar evento Meta CRM');
    }
  },

  async listarEventosGoogle(req, res) {
    try {
      return res.json(await listarEventosGoogleService(req.query || {}));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao listar eventos Google CRM');
    }
  },

  async reprocessarEventoGoogle(req, res) {
    try {
      return res.json(await reprocessarEventoGoogleService(req.params.id));
    } catch (error) {
      return responderErroController(res, error, 'Erro ao reprocessar evento Google CRM');
    }
  }
};
