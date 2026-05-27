'use strict';

const { envEnabled } = require('../environments/EsocialEnvironmentService');
const { validateCertificate } = require('../certificates/EsocialCertificateService');
const { sha256 } = require('../utils/xmlUtils');

function isXmlCryptoAvailable() {
  try {
    require.resolve('xml-crypto');
    return true;
  } catch (_) {
    return false;
  }
}

async function signXml({ xml, empresa_id = null } = {}, user = null) {
  if (!envEnabled('ESOCIAL_XML_SIGN_ENABLED')) {
    return {
      signed: false,
      status: 'BLOQUEADO_FLAG_ASSINATURA',
      xml_assinado: null,
      xml_hash: xml ? sha256(xml) : null,
      errors: ['ESOCIAL_XML_SIGN_ENABLED=false.']
    };
  }

  const cert = await validateCertificate({ empresa_id }, user);
  if (!cert.valid) {
    return {
      signed: false,
      status: cert.status,
      xml_assinado: null,
      xml_hash: xml ? sha256(xml) : null,
      errors: cert.errors || ['Certificado invalido.']
    };
  }

  if (!isXmlCryptoAvailable()) {
    return {
      signed: false,
      status: 'DEPENDENCIA_XMLDSIG_AUSENTE',
      xml_assinado: null,
      xml_hash: xml ? sha256(xml) : null,
      errors: ['Dependencia xml-crypto nao instalada. Assinatura real permanece bloqueada sem fake signature.']
    };
  }

  return {
    signed: false,
    status: 'ASSINADOR_XMLDSIG_NAO_ATIVADO',
    xml_assinado: null,
    xml_hash: xml ? sha256(xml) : null,
    errors: ['Servico preparado para XMLDSig, mas a rotina de assinatura deve ser homologada com certificado A1 real antes de ativar.']
  };
}

module.exports = {
  signXml
};
