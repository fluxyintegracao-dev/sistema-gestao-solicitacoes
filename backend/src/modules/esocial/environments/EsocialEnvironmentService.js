'use strict';

function envEnabled(key) {
  return ['true', '1', 'sim', 'yes'].includes(String(process.env[key] || '').trim().toLowerCase());
}

function getAmbiente() {
  return String(process.env.ESOCIAL_AMBIENTE || 'restrita').trim().toLowerCase();
}

function getEnvironmentConfig() {
  const ambiente = getAmbiente();
  const isRestrita = ambiente === 'restrita';
  const isProducao = ambiente === 'producao';

  return {
    ambiente,
    integracaoEnabled: envEnabled('ESOCIAL_INTEGRACAO_ENABLED'),
    restritaEnabled: envEnabled('ESOCIAL_TRANSMISSAO_RESTRITA_ENABLED'),
    producaoEnabled: envEnabled('ESOCIAL_TRANSMISSAO_PRODUCAO_ENABLED'),
    xmlSignEnabled: envEnabled('ESOCIAL_XML_SIGN_ENABLED'),
    soapEnabled: envEnabled('ESOCIAL_SOAP_ENABLED'),
    envioUrl: isRestrita ? process.env.ESOCIAL_RESTRITA_ENVIO_URL || '' : process.env.ESOCIAL_PRODUCAO_ENVIO_URL || '',
    consultaUrl: isRestrita ? process.env.ESOCIAL_RESTRITA_CONSULTA_URL || '' : process.env.ESOCIAL_PRODUCAO_CONSULTA_URL || '',
    isRestrita,
    isProducao
  };
}

function assertProductionBlocked(config = getEnvironmentConfig()) {
  if (config.isProducao) {
    throw new Error('Envio para producao oficial do eSocial permanece bloqueado nesta fase.');
  }
}

function assertRestritaTransmissionAllowed(config = getEnvironmentConfig()) {
  assertProductionBlocked(config);
  if (!config.integracaoEnabled) throw new Error('ESOCIAL_INTEGRACAO_ENABLED=false.');
  if (!config.isRestrita) throw new Error('Nesta fase somente ESOCIAL_AMBIENTE=restrita e permitido.');
  if (!config.restritaEnabled) throw new Error('ESOCIAL_TRANSMISSAO_RESTRITA_ENABLED=false.');
  if (!config.soapEnabled) throw new Error('ESOCIAL_SOAP_ENABLED=false.');
}

module.exports = {
  assertProductionBlocked,
  assertRestritaTransmissionAllowed,
  envEnabled,
  getAmbiente,
  getEnvironmentConfig
};
