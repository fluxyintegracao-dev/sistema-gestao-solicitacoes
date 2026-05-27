'use strict';

const { buildS2210Xml } = require('./S2210XmlBuilder');
const { buildS2220Xml } = require('./S2220XmlBuilder');
const { buildS2240Xml } = require('./S2240XmlBuilder');

function normalizeEventType(tipo) {
  return String(tipo || '').toUpperCase().replace(/_/g, '-');
}

function buildXmlForEvent(tipoEvento, dto = {}) {
  const tipo = normalizeEventType(tipoEvento);
  if (tipo === 'S-2210' || tipo === 'S2210') return buildS2210Xml(dto);
  if (tipo === 'S-2220' || tipo === 'S2220') return buildS2220Xml(dto);
  if (tipo === 'S-2240' || tipo === 'S2240') return buildS2240Xml(dto);
  throw new Error(`Evento SST eSocial nao suportado para XML: ${tipoEvento}`);
}

module.exports = {
  buildS2210Xml,
  buildS2220Xml,
  buildS2240Xml,
  buildXmlForEvent
};
