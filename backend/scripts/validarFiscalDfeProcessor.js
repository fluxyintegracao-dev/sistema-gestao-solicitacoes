'use strict';

const assert = require('assert');
const {
  buildDocumentPayload,
  buildFiscalEventPayload
} = require('../src/modules/fiscal/services/fiscalDfeProcessorService');
const { parseNfeXml } = require('../src/modules/fiscal/services/fiscalXmlParserService');
const {
  buildFiscalRawSefazObjectKey,
  validateFiscalMimeType
} = require('../src/modules/fiscal/services/fiscalS3Service');
const {
  parseDistribuicaoDfeResponse
} = require('../src/modules/fiscal/services/sefaz/sefazDfeResponseParserService');
const {
  buildConsChNFeRequest,
  buildConsNsuRequest,
  buildDistNsuRequest
} = require('../src/modules/fiscal/services/sefaz/sefazDfeSoapBuilderService');
const {
  getSefazPostResponsePolicy
} = require('../src/modules/fiscal/services/fiscalDfeSyncJobService');
const fixture = require('../src/modules/fiscal/services/sefaz/fixtures/nfeDistribuicaoNormalizada.fixture');

const fullAccessKey = '12345678901234567890123456789012345678901234';

const rawKey = buildFiscalRawSefazObjectKey({
  cnpj: fixture.company.cnpj,
  syncLogId: 99,
  direction: 'response',
  requestType: 'distNSU',
  date: new Date('2026-05-19T12:00:00-03:00')
});

assert.strictEqual(rawKey, 'dev/55666777000188/raw/sefaz/2026/05/19/99/response-distNSU.xml');
assert.strictEqual(validateFiscalMimeType('application/json; charset=utf-8'), 'application/json');

const parsedSefazResponse = parseDistribuicaoDfeResponse(fixture.rawSefazResponseXml);
assert.strictEqual(parsedSefazResponse.response_code, '138');
assert.strictEqual(parsedSefazResponse.response_message, 'Documento localizado para teste local');
assert.strictEqual(parsedSefazResponse.ult_nsu, '11');
assert.strictEqual(parsedSefazResponse.max_nsu, '20');
assert.strictEqual(parsedSefazResponse.documents.length, 2);
assert.strictEqual(parsedSefazResponse.documents[0].nsu, '10');
assert.strictEqual(parsedSefazResponse.documents[0].access_key, fullAccessKey);
assert.strictEqual(parsedSefazResponse.documents[0].schema_version, 'procNFe_v4.00');
assert.ok(parsedSefazResponse.documents[0].xml.includes('<nfeProc'));
assert.strictEqual(parsedSefazResponse.documents[1].summary.access_key, '98765432109876543210987654321098765432109876');
assert.strictEqual(parsedSefazResponse.documents[1].summary.issuer_name, 'Fornecedor Somente Resumo LTDA');
assert.strictEqual(Number(parsedSefazResponse.documents[1].summary.total_value), 789.1);

const xmlItem = fixture.response.documents[0];
const parsedXml = parseNfeXml(xmlItem.xml);
const xmlPayload = buildDocumentPayload({
  company: fixture.company,
  item: xmlItem,
  parsedXml,
  storage: {
    key: 'dev/55666777000188/nfe/2026/05/12345678901234567890123456789012345678901234/xml/original.xml',
    hash: 'hash-teste'
  }
});

assert.strictEqual(xmlPayload.fiscal_company_id, fixture.company.id);
assert.strictEqual(xmlPayload.document_type, 'nfe');
assert.strictEqual(xmlPayload.access_key, '12345678901234567890123456789012345678901234');
assert.strictEqual(xmlPayload.issuer_cnpj, '11222333000144');
assert.strictEqual(xmlPayload.issuer_name, 'Fornecedor Fiscal Teste LTDA');
assert.strictEqual(xmlPayload.recipient_cnpj, '55666777000188');
assert.strictEqual(xmlPayload.document_number, '1001');
assert.strictEqual(xmlPayload.series, '1');
assert.strictEqual(Number(xmlPayload.total_value), 1234.56);
assert.strictEqual(xmlPayload.document_status, 'xml_downloaded');
assert.strictEqual(xmlPayload.source, 'sefaz_distribution');
assert.strictEqual(xmlPayload.xml_storage_key.endsWith('/xml/original.xml'), true);
assert.strictEqual(xmlPayload.parsed_xml_json.infNFe.access_key, xmlPayload.access_key);

const summaryItem = fixture.response.documents[1];
const summaryPayload = buildDocumentPayload({
  company: fixture.company,
  item: summaryItem
});

assert.strictEqual(summaryPayload.fiscal_company_id, fixture.company.id);
assert.strictEqual(summaryPayload.document_type, 'nfe');
assert.strictEqual(summaryPayload.access_key, '98765432109876543210987654321098765432109876');
assert.strictEqual(summaryPayload.nsu, '11');
assert.strictEqual(summaryPayload.issuer_cnpj, '99888777000166');
assert.strictEqual(summaryPayload.issuer_name, 'Fornecedor Somente Resumo LTDA');
assert.strictEqual(summaryPayload.recipient_cnpj, '55666777000188');
assert.strictEqual(summaryPayload.document_number, '2002');
assert.strictEqual(summaryPayload.series, '2');
assert.strictEqual(Number(summaryPayload.total_value), 789.1);
assert.strictEqual(summaryPayload.document_status, 'summary_received');
assert.strictEqual(summaryPayload.manifestation_status, 'pending');
assert.strictEqual(summaryPayload.xml_storage_key, null);
assert.strictEqual(summaryPayload.parsed_xml_json, null);
assert.strictEqual(summaryPayload.raw_summary_json.summary.access_key, summaryPayload.access_key);

const eventPayload = buildFiscalEventPayload(
  { id: 123 },
  fixture.response.documents[0].events[0]
);

assert.strictEqual(eventPayload.fiscal_dfe_document_id, 123);
assert.strictEqual(eventPayload.event_type, 'autorizacao');
assert.strictEqual(eventPayload.event_sequence, '1');
assert.strictEqual(eventPayload.event_protocol, '135260000000001');
assert.strictEqual(eventPayload.event_description, 'Autorizado o uso da NF-e');
assert.strictEqual(eventPayload.raw_event_json.event_type, 'autorizacao');
assert.ok(eventPayload.event_date instanceof Date);

const distNsuRequest = buildDistNsuRequest({
  company: fixture.company,
  ultNsu: '10'
});

assert.strictEqual(distNsuRequest.request_type, 'distNSU');
assert.strictEqual(distNsuRequest.content_type, 'application/soap+xml; charset=utf-8');
assert.strictEqual(distNsuRequest.tp_amb, '2');
assert.strictEqual(distNsuRequest.cuf_autor, '32');
assert.strictEqual(distNsuRequest.cnpj, '55666777000188');
assert.ok(distNsuRequest.body.includes('<soap12:Envelope'));
assert.ok(distNsuRequest.body.includes('<nfeDistDFeInteresse'));
assert.ok(distNsuRequest.dist_dfe_xml.includes('<cUFAutor>32</cUFAutor>'));
assert.ok(distNsuRequest.dist_dfe_xml.includes('<ultNSU>000000000000010</ultNSU>'));

const consNsuRequest = buildConsNsuRequest({
  company: fixture.company,
  nsu: '11'
});

assert.strictEqual(consNsuRequest.request_type, 'consNSU');
assert.ok(consNsuRequest.dist_dfe_xml.includes('<NSU>000000000000011</NSU>'));

const consChNFeRequest = buildConsChNFeRequest({
  company: fixture.company,
  accessKey: fullAccessKey
});

assert.strictEqual(consChNFeRequest.request_type, 'consChNFe');
assert.ok(consChNFeRequest.dist_dfe_xml.includes(`<chNFe>${fullAccessKey}</chNFe>`));

const startedAt = new Date('2026-05-19T12:00:00.000Z');
const emptyPolicy = getSefazPostResponsePolicy({
  response_code: '137',
  response_message: 'Nenhum documento localizado'
}, startedAt);
assert.strictEqual(emptyPolicy.status, 'idle');
assert.strictEqual(emptyPolicy.next_allowed_sync_at.toISOString(), '2026-05-19T13:00:00.000Z');

const consumoPolicy = getSefazPostResponsePolicy({
  response_code: '656',
  response_message: 'Consumo Indevido'
}, startedAt);
assert.strictEqual(consumoPolicy.status, 'blocked');
assert.strictEqual(consumoPolicy.next_allowed_sync_at.toISOString(), '2026-05-19T13:00:00.000Z');

console.log('Fiscal DFe processor fixture OK');
