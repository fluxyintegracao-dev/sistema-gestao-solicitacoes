'use strict';

const fs = require('fs');
const path = require('path');
const { EsocialCertificateLog } = require('../../../models');
const { getAmbiente } = require('../environments/EsocialEnvironmentService');
const { sha256 } = require('../utils/xmlUtils');

function getCertConfig() {
  return {
    certPath: process.env.ESOCIAL_CERT_PATH || '',
    passwordConfigured: Boolean(process.env.ESOCIAL_CERT_PASSWORD),
    certType: process.env.ESOCIAL_CERT_TYPE || 'pfx',
    ambiente: getAmbiente()
  };
}

async function logCertificate(status, details = {}, user = null) {
  try {
    return await EsocialCertificateLog.create({
      empresa_id: details.empresa_id || null,
      ambiente: details.ambiente || getAmbiente(),
      status,
      cert_type: details.certType || process.env.ESOCIAL_CERT_TYPE || 'pfx',
      cert_path_hash: details.certPath ? sha256(path.normalize(details.certPath)) : null,
      subject: details.subject || null,
      issuer: details.issuer || null,
      valid_from: details.valid_from || null,
      valid_to: details.valid_to || null,
      erro: details.erro || null,
      metadados_json: JSON.stringify(details.metadados || {}),
      criado_por: user?.id || null,
      atualizado_por: user?.id || null
    });
  } catch (error) {
    console.warn('[esocial-certificate-log] falha ao persistir log:', error.message);
    return null;
  }
}

async function validateCertificate({ empresa_id = null } = {}, user = null) {
  const config = getCertConfig();
  const certPath = config.certPath;
  if (!certPath) {
    await logCertificate('BLOQUEADO_CONFIGURACAO', { ...config, empresa_id, erro: 'ESOCIAL_CERT_PATH nao configurado.' }, user);
    return { valid: false, status: 'BLOQUEADO_CONFIGURACAO', errors: ['ESOCIAL_CERT_PATH nao configurado.'] };
  }

  if (!['pfx', 'p12'].includes(String(config.certType).toLowerCase())) {
    await logCertificate('TIPO_NAO_SUPORTADO', { ...config, empresa_id, erro: 'Apenas certificado A1 PFX/P12 suportado nesta fase.' }, user);
    return { valid: false, status: 'TIPO_NAO_SUPORTADO', errors: ['Apenas certificado A1 PFX/P12 suportado nesta fase.'] };
  }

  if (!fs.existsSync(certPath)) {
    await logCertificate('CERTIFICADO_AUSENTE', { ...config, empresa_id, erro: 'Arquivo de certificado nao encontrado.' }, user);
    return { valid: false, status: 'CERTIFICADO_AUSENTE', errors: ['Arquivo de certificado nao encontrado.'] };
  }

  if (!config.passwordConfigured) {
    await logCertificate('SENHA_AUSENTE', { ...config, empresa_id, erro: 'ESOCIAL_CERT_PASSWORD nao configurada.' }, user);
    return { valid: false, status: 'SENHA_AUSENTE', errors: ['ESOCIAL_CERT_PASSWORD nao configurada.'] };
  }

  const stats = fs.statSync(certPath);
  await logCertificate('CERTIFICADO_PRESENTE', {
    ...config,
    empresa_id,
    metadados: {
      size_bytes: stats.size,
      modified_at: stats.mtime,
      observacao: 'Validacao criptografica completa depende do signer XMLDSig/PKCS12 habilitado.'
    }
  }, user);

  return {
    valid: true,
    status: 'CERTIFICADO_PRESENTE',
    certType: config.certType,
    metadados: {
      size_bytes: stats.size,
      modified_at: stats.mtime
    }
  };
}

module.exports = {
  getCertConfig,
  validateCertificate
};
