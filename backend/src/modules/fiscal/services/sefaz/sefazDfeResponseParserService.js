'use strict';

const zlib = require('zlib');

function decodeXmlEntities(value = '') {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

function pickTag(xml, tagName) {
  const pattern = new RegExp(`<[^:>/]*:?${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/[^:>]*:?${tagName}>`, 'i');
  const match = String(xml || '').match(pattern);
  return match ? decodeXmlEntities(match[1]) : null;
}

function getAttribute(tag, attribute) {
  const pattern = new RegExp(`\\b${attribute}=["']([^"']+)["']`, 'i');
  const match = String(tag || '').match(pattern);
  return match ? decodeXmlEntities(match[1]) : null;
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function parseDecimal(value) {
  const number = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function extractAccessKeyFromXml(xml) {
  const chNFe = onlyDigits(pickTag(xml, 'chNFe'));
  if (/^\d{44}$/.test(chNFe)) return chNFe;

  const idMatch = String(xml || '').match(/\bId=["'](?:NFe|ID)?(\d{44})["']/i);
  return idMatch ? idMatch[1] : null;
}

function deriveNfeNumberFromAccessKey(accessKey) {
  const key = onlyDigits(accessKey);
  if (!/^\d{44}$/.test(key)) return null;
  return String(Number(key.slice(25, 34)) || '').padStart(1, '0');
}

function deriveNfeSeriesFromAccessKey(accessKey) {
  const key = onlyDigits(accessKey);
  if (!/^\d{44}$/.test(key)) return null;
  return String(Number(key.slice(22, 25)) || '').padStart(1, '0');
}

function unzipDocZip(base64Content) {
  const buffer = Buffer.from(String(base64Content || '').replace(/\s/g, ''), 'base64');
  try {
    return zlib.gunzipSync(buffer).toString('utf8');
  } catch (error) {
    const customError = new Error('Nao foi possivel descompactar docZip retornado pela SEFAZ.');
    customError.statusCode = 400;
    customError.cause = error;
    throw customError;
  }
}

function extractDocZipEntries(responseXml) {
  const entries = [];
  const pattern = /<[^:>/]*:?docZip\b([^>]*)>([\s\S]*?)<\/[^:>]*:?docZip>/gi;
  let match;

  while ((match = pattern.exec(String(responseXml || ''))) !== null) {
    entries.push({
      attributes: match[1] || '',
      content: decodeXmlEntities(match[2] || '')
    });
  }

  return entries;
}

function normalizeResumoNfe({ xml, nsu, schemaVersion }) {
  const accessKey = extractAccessKeyFromXml(xml);
  return {
    nsu: nsu ? String(nsu) : null,
    document_type: 'nfe',
    access_key: accessKey,
    schema_version: schemaVersion || 'resNFe',
    summary: {
      nsu: nsu ? String(nsu) : null,
      access_key: accessKey,
      schema_version: schemaVersion || 'resNFe',
      issuer_cnpj: onlyDigits(pickTag(xml, 'CNPJ')) || null,
      issuer_name: pickTag(xml, 'xNome') || null,
      recipient_cnpj: null,
      recipient_name: null,
      emission_date: parseDate(pickTag(xml, 'dhEmi') || pickTag(xml, 'dEmi')),
      total_value: parseDecimal(pickTag(xml, 'vNF')),
      document_number: deriveNfeNumberFromAccessKey(accessKey),
      series: deriveNfeSeriesFromAccessKey(accessKey),
      operation_nature: null,
      sefaz_status_code: pickTag(xml, 'cSitNFe') || null,
      sefaz_status_description: pickTag(xml, 'xMotivo') || 'Resumo de NFe recebido',
      manifestation_status: 'pending'
    }
  };
}

function normalizeProcNfe({ xml, nsu, schemaVersion }) {
  return {
    nsu: nsu ? String(nsu) : null,
    document_type: 'nfe',
    access_key: extractAccessKeyFromXml(xml),
    schema_version: schemaVersion || 'procNFe',
    xml
  };
}

function normalizeProcEventoNfe({ xml, nsu, schemaVersion }) {
  return {
    nsu: nsu ? String(nsu) : null,
    document_type: 'nfe',
    access_key: extractAccessKeyFromXml(xml),
    schema_version: schemaVersion || 'procEventoNFe',
    event: {
      event_type: pickTag(xml, 'tpEvento') || 'evento_nfe',
      event_sequence: pickTag(xml, 'nSeqEvento') || null,
      event_protocol: pickTag(xml, 'nProt') || null,
      event_date: parseDate(pickTag(xml, 'dhEvento')),
      event_description: pickTag(xml, 'xEvento') || pickTag(xml, 'descEvento') || null,
      raw_event_json: {
        nsu: nsu ? String(nsu) : null,
        schema_version: schemaVersion || 'procEventoNFe',
        access_key: extractAccessKeyFromXml(xml)
      }
    },
    xml
  };
}

function normalizeDocZipEntry(entry) {
  const nsu = getAttribute(entry.attributes, 'NSU');
  const schemaVersion = getAttribute(entry.attributes, 'schema');
  const xml = unzipDocZip(entry.content);

  if (/<[^:>/]*:?resNFe\b/i.test(xml)) {
    return normalizeResumoNfe({ xml, nsu, schemaVersion });
  }

  if (/<[^:>/]*:?procEventoNFe\b/i.test(xml) || /<[^:>/]*:?retEvento\b/i.test(xml)) {
    return normalizeProcEventoNfe({ xml, nsu, schemaVersion });
  }

  if (/<[^:>/]*:?nfeProc\b/i.test(xml) || /<[^:>/]*:?NFe\b/i.test(xml)) {
    return normalizeProcNfe({ xml, nsu, schemaVersion });
  }

  return {
    nsu: nsu ? String(nsu) : null,
    document_type: 'nfe',
    schema_version: schemaVersion || null,
    xml,
    unknown_schema: true
  };
}

function parseDistribuicaoDfeResponse(responseXml) {
  const raw = String(responseXml || '');
  const documents = [];
  const events = [];

  for (const entry of extractDocZipEntries(raw)) {
    const normalized = normalizeDocZipEntry(entry);
    if (normalized.event) {
      events.push(normalized);
    } else {
      documents.push(normalized);
    }
  }

  for (const event of events) {
    const target = documents.find((document) => document.access_key && document.access_key === event.access_key);
    if (target) {
      target.events = [
        ...(Array.isArray(target.events) ? target.events : []),
        event.event
      ];
    }
  }

  return {
    response_code: pickTag(raw, 'cStat') || null,
    response_message: pickTag(raw, 'xMotivo') || null,
    ult_nsu: pickTag(raw, 'ultNSU') || pickTag(raw, 'ultNsu') || null,
    max_nsu: pickTag(raw, 'maxNSU') || pickTag(raw, 'maxNsu') || null,
    documents,
    events,
    raw_response: raw
  };
}

module.exports = {
  extractDocZipEntries,
  normalizeDocZipEntry,
  parseDistribuicaoDfeResponse,
  unzipDocZip
};
