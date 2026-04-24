const assert = require('assert');

process.env.CAIXA_AGENCIA = process.env.CAIXA_AGENCIA || '0001';
process.env.CAIXA_CODIGO_BENEFICIARIO = process.env.CAIXA_CODIGO_BENEFICIARIO || '1100000';

const {
  _internals: {
    calcularFatorVencimento,
    modulo10,
    modulo11,
    montarLinhaDigitavel,
    resolverNossoNumero
  },
  calcularBoletoCaixa
} = require('../src/services/boletoCaixaService');

function main() {
  assert.strictEqual(modulo10('104912345'), '6', 'Modulo 10 deve calcular DV esperado');
  assert.strictEqual(modulo11('0000001'), '9', 'Modulo 11 deve calcular DV esperado');
  assert.strictEqual(calcularFatorVencimento('2025-02-22'), '1000', 'Fator deve reiniciar em 22/02/2025');
  assert.strictEqual(calcularFatorVencimento('2025-02-23'), '1001', 'Fator deve avançar apos reinicio');
  assert.strictEqual(resolverNossoNumero({ id: 123 }), '14000000000000123', 'Nosso numero deve usar modalidade 14 + id com 15 digitos');

  const codigoBarras = '10491100000000123451100000140000000000012390';
  const linhaDigitavel = montarLinhaDigitavel(codigoBarras);
  assert.ok(/^\d{5}\.\d{5} \d{5}\.\d{6} \d{5}\.\d{6} \d \d{14}$/.test(linhaDigitavel), 'Linha digitavel deve seguir mascara FEBRABAN');

  const boleto = calcularBoletoCaixa({
    id: 123,
    data_vencimento: '2026-02-02',
    valor_saldo: 5569
  });

  assert.strictEqual(String(boleto.codigo_barras).length, 44, 'Codigo de barras deve ter 44 digitos');
  assert.ok(boleto.linha_digitavel, 'Linha digitavel deve ser gerada');
  assert.ok(boleto.nosso_numero, 'Nosso numero deve ser gerado');
  console.log('Validacao dos calculos de boleto Caixa concluida com sucesso.');
}

main();
