const assert = require('assert');
const { gerarRemessaCnab240Caixa } = require('../src/services/boletoCaixaCnab240Service');

const convenio = {
  beneficiario_cpf_cnpj: '27123008000100',
  beneficiario_nome: 'CONSTRUTORA TALISMA LTDA',
  codigo_convenio: '1234567',
  codigo_beneficiario: '1234567',
  agencia: '1234',
  agencia_dv: '0',
  conta: '123456',
  conta_dv: '7',
  layout_arquivo_versao: '081',
  layout_lote_versao: '067',
  modalidade_nosso_numero: '14'
};

const boletos = [
  {
    id: 101,
    nosso_numero_base: '14000000000000101',
    numero_documento: 'TIT101',
    data_vencimento: '2026-06-20',
    data_emissao: '2026-05-20',
    valor: 1500.75,
    pagador: {
      nome: 'Cliente Teste Um',
      cpf_cnpj: '12345678901',
      endereco: 'Rua Um',
      numero: '10',
      bairro: 'Centro',
      cep: '29560000',
      cidade: 'Guacui',
      uf: 'ES'
    }
  },
  {
    id: 102,
    nosso_numero_base: '14000000000000102',
    numero_documento: 'TIT102',
    data_vencimento: '2026-06-25',
    data_emissao: '2026-05-20',
    valor: 248.4,
    pagador: {
      nome: 'Empresa Cliente Dois',
      cpf_cnpj: '11222333000144',
      endereco: 'Avenida Dois',
      numero: '200',
      bairro: 'Comercial',
      cep: '29000000',
      cidade: 'Vitoria',
      uf: 'ES'
    }
  }
];

const remessa = gerarRemessaCnab240Caixa({
  convenio,
  boletos,
  numeroRemessa: 1,
  generatedAt: new Date('2026-05-20T12:00:00-03:00')
});

assert.strictEqual(remessa.valid, true, remessa.validation.errors.join('\n'));
assert.strictEqual(remessa.quantidade_boletos, 2);
assert.strictEqual(remessa.quantidade_registros, 8);
assert.strictEqual(remessa.lines[0].length, 240);
assert.strictEqual(remessa.lines[0].slice(0, 8), '10400000');
assert.strictEqual(remessa.lines[1].slice(0, 9), '10400011R');
assert.strictEqual(remessa.lines[2][13], 'P');
assert.strictEqual(remessa.lines[3][13], 'Q');
assert.strictEqual(remessa.lines[6][7], '5');
assert.strictEqual(remessa.lines[7].slice(3, 8), '99999');
assert.strictEqual(remessa.hash.length, 64);

console.log('Remessa CNAB 240 Caixa validada com sucesso.');
console.log(`Registros: ${remessa.quantidade_registros}`);
console.log(`Boletos: ${remessa.quantidade_boletos}`);
console.log(`Hash: ${remessa.hash}`);
