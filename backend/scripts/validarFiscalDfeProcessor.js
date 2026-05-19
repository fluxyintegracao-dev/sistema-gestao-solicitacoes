'use strict';

const assert = require('assert');
const {
  buildDocumentPayload,
  buildFiscalEventPayload
} = require('../src/modules/fiscal/services/fiscalDfeProcessorService');
const { parseNfeXml } = require('../src/modules/fiscal/services/fiscalXmlParserService');
const fixture = require('../src/modules/fiscal/services/sefaz/fixtures/nfeDistribuicaoNormalizada.fixture');

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

console.log('Fiscal DFe processor fixture OK');
