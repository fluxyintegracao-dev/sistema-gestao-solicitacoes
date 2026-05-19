'use strict';

const assert = require('assert');
const { buildDocumentPayload } = require('../src/modules/fiscal/services/fiscalDfeProcessorService');
const { parseNfeXml } = require('../src/modules/fiscal/services/fiscalXmlParserService');
const fixture = require('../src/modules/fiscal/services/sefaz/fixtures/nfeDistribuicaoNormalizada.fixture');

const item = fixture.response.documents[0];
const parsedXml = parseNfeXml(item.xml);
const payload = buildDocumentPayload({
  company: fixture.company,
  item,
  parsedXml,
  storage: {
    key: 'dev/55666777000188/nfe/2026/05/12345678901234567890123456789012345678901234/xml/original.xml',
    hash: 'hash-teste'
  }
});

assert.strictEqual(payload.fiscal_company_id, fixture.company.id);
assert.strictEqual(payload.document_type, 'nfe');
assert.strictEqual(payload.access_key, '12345678901234567890123456789012345678901234');
assert.strictEqual(payload.issuer_cnpj, '11222333000144');
assert.strictEqual(payload.issuer_name, 'Fornecedor Fiscal Teste LTDA');
assert.strictEqual(payload.recipient_cnpj, '55666777000188');
assert.strictEqual(payload.document_number, '1001');
assert.strictEqual(payload.series, '1');
assert.strictEqual(Number(payload.total_value), 1234.56);
assert.strictEqual(payload.document_status, 'xml_downloaded');
assert.strictEqual(payload.source, 'sefaz_distribution');
assert.strictEqual(payload.xml_storage_key.endsWith('/xml/original.xml'), true);
assert.strictEqual(payload.parsed_xml_json.infNFe.access_key, payload.access_key);

console.log('Fiscal DFe processor fixture OK');
