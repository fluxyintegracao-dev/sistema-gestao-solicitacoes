const { Op } = require('sequelize');
const { CrmConfig } = require('../models');

const CONFIG_META_WEBHOOK_SECRET = 'CRM_META_WEBHOOK_SECRET';
const CONFIG_META_VERIFY_TOKEN = 'CRM_META_VERIFY_TOKEN';
const CONFIG_GOOGLE_WEBHOOK_SECRET = 'CRM_GOOGLE_WEBHOOK_SECRET';

const DESCRICOES = {
  [CONFIG_META_WEBHOOK_SECRET]: 'Token secreto para validacao de assinatura do webhook Meta',
  [CONFIG_META_VERIFY_TOKEN]: 'Token de verificacao para handshake inicial do webhook Meta',
  [CONFIG_GOOGLE_WEBHOOK_SECRET]: 'Token secreto para validacao do webhook Google Ads'
};

async function getConfigMap() {
  const rows = await CrmConfig.findAll({
    where: {
      chave: {
        [Op.in]: [
          CONFIG_META_WEBHOOK_SECRET,
          CONFIG_META_VERIFY_TOKEN,
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
      webhook_secret_configurado: Boolean(config[CONFIG_META_WEBHOOK_SECRET])
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
  if (Object.prototype.hasOwnProperty.call(dados, 'google_webhook_secret')) {
    await salvarConfig(CONFIG_GOOGLE_WEBHOOK_SECRET, dados.google_webhook_secret);
  }

  return obterConfiguracoesIntegracoes();
}

module.exports = {
  obterConfiguracoesIntegracoes,
  atualizarConfiguracoesIntegracoes
};
