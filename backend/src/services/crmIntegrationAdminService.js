const { Op } = require('sequelize');
const { CrmConfig } = require('../models');

const CONFIG_META_WEBHOOK_SECRET = 'CRM_META_WEBHOOK_SECRET';
const CONFIG_META_VERIFY_TOKEN = 'CRM_META_VERIFY_TOKEN';
const CONFIG_META_PAGE_ACCESS_TOKEN = 'CRM_META_PAGE_ACCESS_TOKEN';
const CONFIG_META_GRAPH_API_VERSION = 'CRM_META_GRAPH_API_VERSION';
const CONFIG_META_PAGE_ID = 'CRM_META_PAGE_ID';
const CONFIG_GOOGLE_WEBHOOK_SECRET = 'CRM_GOOGLE_WEBHOOK_SECRET';

const DESCRICOES = {
  [CONFIG_META_WEBHOOK_SECRET]: 'Token secreto para validacao de assinatura do webhook Meta',
  [CONFIG_META_VERIFY_TOKEN]: 'Token de verificacao para handshake inicial do webhook Meta',
  [CONFIG_META_PAGE_ACCESS_TOKEN]: 'Page Access Token para consultar leadgen na Graph API da Meta',
  [CONFIG_META_GRAPH_API_VERSION]: 'Versao da Graph API usada na consulta de leads Meta',
  [CONFIG_META_PAGE_ID]: 'Page ID opcional usado como referencia da integracao Meta',
  [CONFIG_GOOGLE_WEBHOOK_SECRET]: 'Token secreto para validacao do webhook Google Ads'
};

async function getConfigMap() {
  const rows = await CrmConfig.findAll({
    where: {
      chave: {
        [Op.in]: [
          CONFIG_META_WEBHOOK_SECRET,
          CONFIG_META_VERIFY_TOKEN,
          CONFIG_META_PAGE_ACCESS_TOKEN,
          CONFIG_META_GRAPH_API_VERSION,
          CONFIG_META_PAGE_ID,
          CONFIG_GOOGLE_WEBHOOK_SECRET
        ]
      }
    }
  });

  return rows.reduce((acc, row) => {
    acc[row.chave] = row.valor;
    return acc;
  }, {});
}

async function salvarConfig(chave, valor) {
  const existente = await CrmConfig.findOne({ where: { chave } });
  const payload = {
    valor: valor === '' || valor == null ? null : String(valor),
    descricao: DESCRICOES[chave] || null
  };

  if (existente) {
    await existente.update(payload);
    return existente;
  }

  return CrmConfig.create({ chave, ...payload });
}

async function obterConfiguracoesIntegracoes() {
  const config = await getConfigMap();
  return {
    meta: {
      webhook_path: '/api/crm/webhooks/meta',
      verify_token: config[CONFIG_META_VERIFY_TOKEN] || '',
      graph_api_version: config[CONFIG_META_GRAPH_API_VERSION] || process.env.META_GRAPH_VERSION || 'v20.0',
      page_id: config[CONFIG_META_PAGE_ID] || '',
      webhook_secret_configurado: Boolean(config[CONFIG_META_WEBHOOK_SECRET]),
      page_access_token_configurado: Boolean(config[CONFIG_META_PAGE_ACCESS_TOKEN] || process.env.META_PAGE_ACCESS_TOKEN)
    },
    google: {
      webhook_path: '/api/crm/webhooks/google',
      webhook_secret_configurado: Boolean(config[CONFIG_GOOGLE_WEBHOOK_SECRET])
    }
  };
}

async function atualizarConfiguracoesIntegracoes(dados = {}) {
  if (Object.prototype.hasOwnProperty.call(dados, 'meta_verify_token')) {
    await salvarConfig(CONFIG_META_VERIFY_TOKEN, dados.meta_verify_token);
  }
  if (Object.prototype.hasOwnProperty.call(dados, 'meta_webhook_secret')) {
    await salvarConfig(CONFIG_META_WEBHOOK_SECRET, dados.meta_webhook_secret);
  }
  if (Object.prototype.hasOwnProperty.call(dados, 'meta_page_access_token') && String(dados.meta_page_access_token || '').trim()) {
    await salvarConfig(CONFIG_META_PAGE_ACCESS_TOKEN, dados.meta_page_access_token);
  }
  if (Object.prototype.hasOwnProperty.call(dados, 'meta_graph_api_version')) {
    await salvarConfig(CONFIG_META_GRAPH_API_VERSION, dados.meta_graph_api_version || 'v20.0');
  }
  if (Object.prototype.hasOwnProperty.call(dados, 'meta_page_id')) {
    await salvarConfig(CONFIG_META_PAGE_ID, dados.meta_page_id);
  }
  if (Object.prototype.hasOwnProperty.call(dados, 'google_webhook_secret')) {
    await salvarConfig(CONFIG_GOOGLE_WEBHOOK_SECRET, dados.google_webhook_secret);
  }

  return obterConfiguracoesIntegracoes();
}

module.exports = {
  obterConfiguracoesIntegracoes,
  atualizarConfiguracoesIntegracoes
};
