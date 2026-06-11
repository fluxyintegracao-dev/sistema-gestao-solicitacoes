const assert = require('assert');

require('../src/modules/banking/controllers/BankingController');
require('../src/modules/banking/routes');

const { getCnab240PaymentSpec } = require('../src/modules/banking/services/cnab240PaymentSpecService');
const {
  gerarArquivoCnab240CaixaPagamento,
  codigoBarrasFromLinhaDigitavel
} = require('../src/modules/banking/services/caixaPagamentoCnab240Service');

const spec = getCnab240PaymentSpec();

assert.strictEqual(spec.status, 'BOLETO_SEGMENTO_J_READY');
assert.strictEqual(spec.bank, 'CAIXA');
assert.strictEqual(spec.layout, 'CNAB240');
assert.ok(Array.isArray(spec.supported_segments));
assert.ok(spec.supported_segments.some((segment) => segment.code === 'A/B'));
assert.ok(spec.supported_segments.some((segment) => segment.code === 'J' && segment.status === 'READY'));
assert.ok(spec.supported_segments.some((segment) => segment.code === 'J52'));
assert.ok(spec.supported_segments.some((segment) => segment.code === 'O/W/N/B'));
assert.ok(Array.isArray(spec.guardrails));

const codigoBarras = codigoBarrasFromLinhaDigitavel('00190000090123456789012345678901112340000010000');
assert.strictEqual(codigoBarras.length, 44);

const remessa = gerarArquivoCnab240CaixaPagamento({
  convenio: {
    banco_codigo: '104',
    banco_nome: 'CAIXA ECONOMICA FEDERAL',
    empresa_id: 10,
    empresa_cpf_cnpj: '12.345.678/0001-90',
    convenio_codigo: '335414',
    convenio_nome: 'CONVENIO TESTE CAIXA',
    compromisso_codigo: '0001',
    compromisso_nome: 'PAG FORN 0557 003 000001581 8',
    agencia: '1234',
    agencia_dv: '0',
    conta: '123456',
    conta_dv: '7',
    empresa_nome: 'EMPRESA TESTE LTDA',
    ambiente: 'HOMOLOGACAO'
  },
  numeroRemessa: 1,
  dataPagamento: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  titulos: [
    {
      id: 1,
      codigo: 'TIT-TESTE',
      tipo: 'PAGAR',
      status: 'ABERTO',
      empresa_id: 10,
      parceiro_id: 20,
      parceiro: { nome: 'FORNECEDOR TESTE' },
      valor_original: 100,
      valor_saldo: 100,
      data_vencimento: new Date(Date.now() + 172800000).toISOString().slice(0, 10),
      linha_digitavel: '00190000090123456789012345678901112340000010000'
    }
  ]
});

assert.strictEqual(remessa.valid, true);
assert.strictEqual(remessa.quantidade_titulos, 1);
assert.strictEqual(remessa.quantidade_registros, 5);
assert.ok(remessa.lines.every((line) => line.length === 240));
assert.strictEqual(remessa.lines[2].slice(13, 14), 'J');
assert.ok(remessa.lines[0].includes('0001'));
assert.ok(!remessa.lines[0].includes('335414'));

console.log('banking enterprise ok');
