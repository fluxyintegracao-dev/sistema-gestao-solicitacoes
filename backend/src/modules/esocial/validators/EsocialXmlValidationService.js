'use strict';

const fs = require('fs');
const path = require('path');
const { EsocialXmlValidationLog } = require('../../../models');
const { sha256 } = require('../utils/xmlUtils');

const XSD_BY_EVENT = {
  'S-2210': 'evtCAT.xsd',
  S2210: 'evtCAT.xsd',
  'S-2220': 'evtMonit.xsd',
  S2220: 'evtMonit.xsd',
  'S-2240': 'evtExpRisco.xsd',
  S2240: 'evtExpRisco.xsd'
};

function getXsdRoot() {
  return path.resolve(process.cwd(), 'SST ARQUIVOS', '2026-04-27_esquemas_xsd_v_s_01_03_00');
}

function getXsdPath(tipoEvento) {
  const file = XSD_BY_EVENT[String(tipoEvento || '').toUpperCase()] || XSD_BY_EVENT[String(tipoEvento || '').replace('_', '-')];
  return file ? path.join(getXsdRoot(), file) : null;
}

async function validateXml({ xml, tipo_evento, evento_id = null, lote_id = null, empresa_id = null, user = null } = {}) {
  const startedAt = Date.now();
  const erros = [];
  const isLote = String(tipo_evento || '').toUpperCase() === 'LOTE';
  const xsdPath = isLote ? null : getXsdPath(tipo_evento);
  if (!xml || !String(xml).trim().startsWith('<')) erros.push('XML vazio ou invalido estruturalmente.');
  if (!String(xml || '').includes(isLote ? '<eSocialLote' : '<eSocial')) erros.push(`Elemento raiz ${isLote ? 'eSocialLote' : 'eSocial'} nao encontrado.`);
  if (!isLote && !xsdPath) erros.push(`XSD nao mapeado para evento ${tipo_evento}.`);
  if (xsdPath && !fs.existsSync(xsdPath)) erros.push(`XSD oficial nao encontrado: ${path.basename(xsdPath)}.`);

  const status = erros.length ? 'INVALIDO' : 'VALIDADO_ESTRUTURALMENTE';
  try {
    await EsocialXmlValidationLog.create({
      evento_id,
      lote_id,
      empresa_id,
      tipo_evento,
      layout_version: process.env.ESOCIAL_LAYOUT_VERSION || 'S-1.3',
      schema_version: process.env.ESOCIAL_SCHEMA_VERSION || 'v_s_01_03_00',
      status,
      erros_json: JSON.stringify(erros),
      xml_hash: xml ? sha256(xml) : null,
      duracao_ms: Date.now() - startedAt,
      criado_por: user?.id || null,
      atualizado_por: user?.id || null
    });
  } catch (error) {
    console.warn('[esocial-xml-validation-log] falha ao persistir log:', error.message);
  }

  return {
    valid: !erros.length,
    status,
    xsdPath: xsdPath || null,
    xsdValidationMode: 'ESTRUTURAL_COM_XSD_PRESENTE',
    errors: erros
  };
}

module.exports = {
  getXsdPath,
  validateXml
};
