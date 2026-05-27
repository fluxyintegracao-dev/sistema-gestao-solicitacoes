'use strict';

const {
  EsocialEvento,
  EsocialLote,
  EsocialRetorno
} = require('../../../models');
const { buildXmlForEvent } = require('../builders/s1_3');
const { getAmbiente, assertProductionBlocked } = require('../environments/EsocialEnvironmentService');
const { validateCertificate } = require('../certificates/EsocialCertificateService');
const { signXml } = require('../signers/EsocialXmlSignerService');
const { validateXml } = require('../validators/EsocialXmlValidationService');
const { createOrUpdateLote } = require('./EsocialLoteBuilderService');
const { enviarLoteParaRestrita, consultarRetornoRestrita } = require('../transmitters/EsocialRestritaTransmissionService');
const { parseJson, sha256 } = require('../utils/xmlUtils');

function buildEventIdempotency(evento, payload = {}) {
  const data = evento.data_referencia || payload.data_referencia || new Date().toISOString().slice(0, 10);
  return sha256([
    evento.tipo_evento,
    evento.empresa_id,
    evento.colaborador_id || 'sem-colaborador',
    data,
    process.env.ESOCIAL_LAYOUT_VERSION || 'S-1.3'
  ].join('|'));
}

async function listarEventosControlados(query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(Math.max(1, Number(query.limit || 50)), 200);
  const where = {};
  if (query.empresa_id) where.empresa_id = query.empresa_id;
  if (query.colaborador_id) where.colaborador_id = query.colaborador_id;
  if (query.tipo_evento) where.tipo_evento = query.tipo_evento;
  if (query.status) where.status = query.status;
  const { count, rows } = await EsocialEvento.findAndCountAll({
    where,
    order: [['updatedAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true
  });
  return { rows, total: count, page, limit };
}

async function gerarXmlEvento(evento_id, user = null) {
  assertProductionBlocked();
  const evento = await EsocialEvento.findByPk(evento_id);
  if (!evento) throw new Error('Evento eSocial nao encontrado.');
  const payload = parseJson(evento.payload_json, {});
  const built = buildXmlForEvent(evento.tipo_evento, payload);
  const idempotency_key = evento.idempotency_key || buildEventIdempotency(evento, payload);
  const xml_hash = sha256(built.xml);
  await evento.update({
    ambiente: getAmbiente(),
    xml_original: built.xml,
    xml_hash,
    idempotency_key,
    data_referencia: evento.data_referencia || payload.data_referencia || new Date().toISOString().slice(0, 10),
    validation_errors_json: JSON.stringify(built.pendencias || []),
    status: built.pendencias?.length ? 'XML_COM_PENDENCIAS' : 'XML_GERADO',
    atualizado_por: user?.id || null
  });
  return {
    evento: await EsocialEvento.findByPk(evento.id),
    xml: built.xml,
    pendencias: built.pendencias || [],
    xml_hash
  };
}

async function validarXmlEvento(evento_id, user = null) {
  const evento = await EsocialEvento.findByPk(evento_id);
  if (!evento) throw new Error('Evento eSocial nao encontrado.');
  const xml = evento.xml_original || (await gerarXmlEvento(evento_id, user)).xml;
  const validation = await validateXml({
    xml,
    tipo_evento: evento.tipo_evento,
    evento_id: evento.id,
    empresa_id: evento.empresa_id,
    user
  });
  await evento.update({
    status: validation.valid ? 'XML_VALIDADO' : 'XML_INVALIDO',
    validation_errors_json: JSON.stringify(validation.errors || []),
    atualizado_por: user?.id || null
  });
  return validation;
}

async function assinarXmlEvento(evento_id, user = null) {
  const evento = await EsocialEvento.findByPk(evento_id);
  if (!evento) throw new Error('Evento eSocial nao encontrado.');
  const xml = evento.xml_original || (await gerarXmlEvento(evento_id, user)).xml;
  const signer = await signXml({ xml, empresa_id: evento.empresa_id }, user);
  if (signer.signed) {
    await evento.update({
      xml_assinado: signer.xml_assinado,
      status: 'XML_ASSINADO',
      atualizado_por: user?.id || null
    });
  } else {
    await evento.update({
      transmission_blocked_reason: (signer.errors || []).join('; '),
      atualizado_por: user?.id || null
    });
  }
  return signer;
}

async function criarLoteRestrita({ evento_ids = [] } = {}, user = null) {
  assertProductionBlocked();
  if (!Array.isArray(evento_ids) || !evento_ids.length) throw new Error('Informe evento_ids para gerar lote eSocial.');
  const eventos = await EsocialEvento.findAll({ where: { id: evento_ids } });
  if (!eventos.length) throw new Error('Nenhum evento eSocial encontrado para lote.');
  for (const evento of eventos) {
    if (!evento.xml_original) await gerarXmlEvento(evento.id, user);
  }
  const refreshed = await EsocialEvento.findAll({ where: { id: evento_ids } });
  const lote = await createOrUpdateLote({
    eventos: refreshed,
    empresa_id: refreshed[0].empresa_id,
    user
  });
  return EsocialLote.findByPk(lote.id, { include: [{ association: 'eventos' }] });
}

async function enviarRestrita(lote_id, user = null) {
  return enviarLoteParaRestrita(lote_id, user);
}

async function consultarRetorno(lote_id, user = null) {
  return consultarRetornoRestrita(lote_id, user);
}

async function listarLotes(query = {}) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(Math.max(1, Number(query.limit || 50)), 200);
  const where = {};
  if (query.empresa_id) where.empresa_id = query.empresa_id;
  if (query.status) where.status = query.status;
  if (query.ambiente) where.ambiente = query.ambiente;
  const { count, rows } = await EsocialLote.findAndCountAll({
    where,
    include: [{ association: 'eventos' }, { association: 'retornos' }],
    order: [['updatedAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true
  });
  return { rows, total: count, page, limit };
}

async function listarRetornos(query = {}) {
  const where = {};
  if (query.lote_id) where.lote_id = query.lote_id;
  if (query.evento_id) where.evento_id = query.evento_id;
  return EsocialRetorno.findAll({ where, order: [['createdAt', 'DESC']], limit: 100 });
}

module.exports = {
  assinarXmlEvento,
  consultarRetorno,
  criarLoteRestrita,
  enviarRestrita,
  gerarXmlEvento,
  listarEventosControlados,
  listarLotes,
  listarRetornos,
  validateCertificate,
  validarXmlEvento
};
