const assert = require('assert');
const {
  montarLinhaRetornoTeste,
  parseRetornoCnab240Caixa
} = require('../src/services/boletoCaixaRetornoCnab240Service');
const { createLine, numberField, textField } = require('../src/services/cnab240Utils');

const headerArquivo = createLine([
  { start: 1, end: 3, value: '104' },
  { start: 4, end: 7, value: '0000' },
  { start: 8, end: 8, value: '0' },
  { start: 18, end: 18, value: '2' },
  { start: 19, end: 32, value: '27123008000100' },
  { start: 73, end: 102, value: textField('CONSTRUTORA TALISMA LTDA', 30) },
  { start: 103, end: 132, value: textField('CAIXA ECONOMICA FEDERAL', 30) }
]);

const headerLote = createLine([
  { start: 1, end: 3, value: '104' },
  { start: 4, end: 7, value: '0001' },
  { start: 8, end: 8, value: '1' },
  { start: 9, end: 9, value: 'T' },
  { start: 10, end: 11, value: '01' },
  { start: 14, end: 16, value: '067' },
  { start: 74, end: 103, value: textField('CONSTRUTORA TALISMA LTDA', 30) }
]);

const segmentoT = montarLinhaRetornoTeste({ segmento: 'T', sequencial: 1 });
const segmentoU = montarLinhaRetornoTeste({ segmento: 'U', sequencial: 2 });

const trailerLote = createLine([
  { start: 1, end: 3, value: '104' },
  { start: 4, end: 7, value: '0001' },
  { start: 8, end: 8, value: '5' },
  { start: 18, end: 23, value: numberField(4, 6) }
]);

const trailerArquivo = createLine([
  { start: 1, end: 3, value: '104' },
  { start: 4, end: 7, value: '9999' },
  { start: 8, end: 8, value: '9' },
  { start: 18, end: 23, value: numberField(1, 6) },
  { start: 24, end: 29, value: numberField(6, 6) }
]);

const content = [headerArquivo, headerLote, segmentoT, segmentoU, trailerLote, trailerArquivo].join('\r\n') + '\r\n';
const retorno = parseRetornoCnab240Caixa(content);

assert.strictEqual(retorno.valid, true, retorno.validation.errors.join('\n'));
assert.strictEqual(retorno.quantidade_linhas, 6);
assert.strictEqual(retorno.ocorrencias.length, 1);
assert.strictEqual(retorno.ocorrencias[0].tipo, 'LIQUIDACAO');
assert.strictEqual(retorno.ocorrencias[0].codigo_ocorrencia, '06');
assert.strictEqual(retorno.ocorrencias[0].valor_pago, 1500.75);
assert.strictEqual(retorno.ocorrencias[0].valor_liquido, 1499.75);
assert.strictEqual(retorno.ocorrencias[0].data_ocorrencia, '2026-06-21');
assert.strictEqual(retorno.hash.length, 64);

console.log('Retorno CNAB 240 Caixa validado com sucesso.');
console.log(`Ocorrencias: ${retorno.ocorrencias.length}`);
console.log(`Primeira ocorrencia: ${retorno.ocorrencias[0].tipo}`);
console.log(`Hash: ${retorno.hash}`);
