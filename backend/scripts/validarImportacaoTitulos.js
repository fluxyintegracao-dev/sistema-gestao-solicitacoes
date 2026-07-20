const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ExcelJS = require('exceljs');
const {
  gerarModeloImportacao,
  parseWorkbook,
  TEMPLATE_VERSION
} = require('../src/services/tituloFinanceiroImportacaoService');

async function main() {
  const references = {
    obras: [{ id: 1, codigo: 'OB-001', nome: 'Obra Modelo', empresa_grupo_id: 1, empresaGrupo: { id: 1, codigo: 'EMP-1', nome: 'Empresa Modelo' } }],
    credores: [{
      id: 10,
      nome: 'Credor Modelo',
      cpf_cnpj: '00000000000',
      fornecedor: true,
      corretor: false,
      paymentBeneficiaries: [{ id: 1, pix_tipo_chave: 'CPF', pix_chave: '00000000000', ativo: true }]
    }],
    categorias: [{ id: 20, nome: 'Salarios', tipo: 'PAGAR', dre_grupo: 'DESPESAS OPERACIONAIS', ativo: true }],
    formasPagamento: [{ id: 30, codigo: 'PIX', nome: 'PIX', tipo: 'PIX', ativo: true }],
    apropriacoes: [{ id: 100, obra_id: 1, codigo: '1.01', descricao: 'Mao de obra', ativo: true, somadora: false }]
  };
  const req = { user: { id: 1, perfil: 'SUPERADMIN' } };
  const buffer = await gerarModeloImportacao(req, { references, skipAudit: true });
  assert(buffer.length > 10000, 'Modelo XLSX nao foi gerado corretamente.');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  assert.strictEqual(workbook.subject, `Versao ${TEMPLATE_VERSION}`);
  ['INSTRUCOES', 'TITULOS', 'PARCELAS', 'RATEIOS', 'IMPOSTOS', 'REFERENCIAS'].forEach((name) => {
    assert(workbook.getWorksheet(name), `Aba ${name} ausente.`);
  });
  assert(workbook.getWorksheet('TITULOS').getCell('B2').dataValidation, 'Lista de obras nao configurada.');
  assert(workbook.getWorksheet('TITULOS').getCell('E2').dataValidation, 'Lista de formas de pagamento nao configurada.');
  assert.strictEqual(workbook.getWorksheet('REFERENCIAS').getCell('H2').value, 'PRONTO');

  const titles = workbook.getWorksheet('TITULOS');
  titles.addRow([
    'TESTE-001', 1, 10, 20, 'PIX', 'ABERTO', 'Salario de teste', 'FOLHA-2026-07', 1000,
    new Date(2026, 6, 20), new Date(2026, 6, 25), new Date(2026, 6, 1), 'SIM', 100,
    'Linha de teste', 'PIX', '', '', ''
  ]);
  const filledBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const parsed = await parseWorkbook(filledBuffer);
  assert.strictEqual(parsed.sheets.TITULOS.length, 1);
  assert.strictEqual(parsed.sheets.TITULOS[0].payload.chave_importacao, 'TESTE-001');
  assert.strictEqual(Number(parsed.sheets.TITULOS[0].payload.obra_id), 1);
  assert(parsed.sheets.TITULOS[0].payload.data_emissao instanceof Date, 'Data de emissao nao foi preservada como data do Excel.');

  titles.getCell('G2').value = { formula: '="formula proibida"', result: 'formula proibida' };
  const formulaBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
  await assert.rejects(() => parseWorkbook(formulaBuffer), /Formulas nao sao permitidas/);

  const outputPath = path.join(os.tmpdir(), 'fluxy-modelo-importacao-contas-a-pagar.xlsx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Importacao de titulos valida. Modelo de QA: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
