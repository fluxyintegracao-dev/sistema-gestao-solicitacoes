const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ExcelJS = require('exceljs');
const {
  __testables,
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
    categorias: [{ id: 20, nome: '2.01.02.01 - Salarios', tipo: 'PAGAR', dre_grupo: 'DESPESAS OPERACIONAIS', ativo: true }],
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
  assert(workbook.getWorksheet('TITULOS').getCell('C2').dataValidation, 'Lista de codigos de obra nao configurada.');
  assert(workbook.getWorksheet('TITULOS').getCell('F2').dataValidation, 'Lista de formas de pagamento nao configurada.');
  assert.strictEqual(workbook.getWorksheet('REFERENCIAS').getCell('A2').value, 'EMP-1');
  assert.strictEqual(workbook.getWorksheet('REFERENCIAS').getCell('C2').value, 'OB-001');
  assert.strictEqual(workbook.getWorksheet('REFERENCIAS').getCell('E2').value, '000.000.000-00');
  assert.strictEqual(workbook.getWorksheet('REFERENCIAS').getCell('G2').value, 'PRONTO');
  assert.strictEqual(workbook.getWorksheet('REFERENCIAS').getCell('H2').value, '2.01.02.01 - Salarios');
  assert.strictEqual(workbook.getWorksheet('REFERENCIAS').getCell('M2').value, 'EMP-1');
  assert.strictEqual(workbook.getWorksheet('REFERENCIAS').getCell('N2').value, 'OB-001');
  assert.strictEqual(workbook.getWorksheet('REFERENCIAS').getCell('O2').value, '1.01');
  ['credor_id', 'categoria_id', 'apropriacao_id'].forEach((header) => {
    assert(!workbook.getWorksheet('REFERENCIAS').getRow(1).values.includes(header), `ID interno ${header} foi exposto no modelo.`);
  });

  const mappedReferences = __testables.buildReferenceMaps(references);
  assert.strictEqual(__testables.resolveObraByCodigos(mappedReferences, 'emp-1', 'ob-001').id, 1);
  assert.throws(
    () => __testables.resolveObraByCodigos(mappedReferences, 'EMP-2', 'OB-001'),
    /combinacao empresa_codigo \+ obra_codigo inexistente/
  );
  const ambiguousReferences = __testables.buildReferenceMaps({
    ...references,
    obras: [...references.obras, { ...references.obras[0], id: 2 }]
  });
  assert.throws(
    () => __testables.resolveObraByCodigos(ambiguousReferences, 'EMP-1', 'OB-001'),
    /combinacao empresa_codigo \+ obra_codigo esta duplicada/
  );
  assert.strictEqual(
    __testables.resolveApropriacaoByCodigo(mappedReferences, references.obras[0], '1.01').id,
    100
  );
  assert.throws(
    () => __testables.resolveApropriacaoByCodigo(mappedReferences, references.obras[0], '9.99'),
    /apropriacao_codigo inexistente/
  );
  const ambiguousApropriacoes = __testables.buildReferenceMaps({
    ...references,
    apropriacoes: [...references.apropriacoes, { ...references.apropriacoes[0], id: 101 }]
  });
  assert.throws(
    () => __testables.resolveApropriacaoByCodigo(ambiguousApropriacoes, references.obras[0], '1.01'),
    /apropriacao_codigo esta duplicado/
  );
  assert.strictEqual(__testables.resolveCredorByCpfCnpj(mappedReferences, '000.000.000-00').id, 10);
  assert.throws(
    () => __testables.resolveCredorByCpfCnpj(mappedReferences, '11111111111'),
    /Credor inexistente/
  );
  const ambiguousCredores = __testables.buildReferenceMaps({
    ...references,
    credores: [...references.credores, { ...references.credores[0], id: 11, cpf_cnpj: '000.000.000-00' }]
  });
  assert.throws(
    () => __testables.resolveCredorByCpfCnpj(ambiguousCredores, '00000000000'),
    /CPF\/CNPJ do credor esta duplicado/
  );
  assert.strictEqual(__testables.resolveCategoriaByNome(mappedReferences, '2.01.02.01 - salários').id, 20);
  assert.throws(
    () => __testables.resolveCategoriaByNome(mappedReferences, 'Categoria inexistente'),
    /Categoria inexistente/
  );
  const ambiguousCategorias = __testables.buildReferenceMaps({
    ...references,
    categorias: [...references.categorias, { ...references.categorias[0], id: 21, nome: '2.01.02.01 - SALÁRIOS' }]
  });
  assert.throws(
    () => __testables.resolveCategoriaByNome(ambiguousCategorias, '2.01.02.01 - Salarios'),
    /Nome da categoria esta duplicado/
  );

  const titles = workbook.getWorksheet('TITULOS');
  titles.addRow([
    'TESTE-001', 'EMP-1', 'OB-001', '000.000.000-00', '2.01.02.01 - Salarios', 'PIX', 'ABERTO', 'Salario de teste', 'FOLHA-2026-07', 1000,
    new Date(2026, 6, 20), new Date(2026, 6, 25), new Date(2026, 6, 1), 'SIM', '1.01',
    'Linha de teste', 'PIX', '', '', ''
  ]);
  const filledBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const parsed = await parseWorkbook(filledBuffer);
  assert.strictEqual(parsed.sheets.TITULOS.length, 1);
  assert.strictEqual(parsed.sheets.TITULOS[0].payload.chave_importacao, 'TESTE-001');
  assert.strictEqual(parsed.sheets.TITULOS[0].payload.empresa_codigo, 'EMP-1');
  assert.strictEqual(parsed.sheets.TITULOS[0].payload.obra_codigo, 'OB-001');
  assert.strictEqual(parsed.sheets.TITULOS[0].payload.credor_cpf_cnpj, '000.000.000-00');
  assert.strictEqual(parsed.sheets.TITULOS[0].payload.categoria_nome, '2.01.02.01 - Salarios');
  assert.strictEqual(parsed.sheets.TITULOS[0].payload.apropriacao_codigo, '1.01');
  assert(parsed.sheets.TITULOS[0].payload.data_emissao instanceof Date, 'Data de emissao nao foi preservada como data do Excel.');
  const normalized = __testables.normalizeTituloRow(
    parsed.sheets.TITULOS[0],
    { PARCELAS: new Map(), RATEIOS: new Map(), IMPOSTOS: new Map() },
    mappedReferences,
    []
  );
  assert.strictEqual(normalized.errors.length, 0);
  assert.strictEqual(normalized.payload.parceiro_id, 10, 'CPF/CNPJ do credor nao foi convertido para o ID interno.');
  assert.strictEqual(normalized.payload.categoria_financeira_id, 20, 'Nome da categoria nao foi convertido para o ID interno.');
  assert.strictEqual(normalized.payload.apropriacao_id, 100, 'Codigo da apropriacao nao foi convertido para o ID interno.');
  assert.strictEqual(normalized.payload.credor_cpf_cnpj, undefined, 'Documento operacional vazou para o payload de dominio.');
  assert.strictEqual(normalized.payload.categoria_nome, undefined, 'Nome operacional vazou para o payload de dominio.');
  assert.strictEqual(normalized.payload.apropriacao_codigo, undefined, 'Codigo operacional vazou para o payload de dominio.');

  const oldHeaderWorkbook = new ExcelJS.Workbook();
  await oldHeaderWorkbook.xlsx.load(buffer);
  oldHeaderWorkbook.getWorksheet('TITULOS').getCell('D1').value = 'credor_id';
  const oldHeaderBuffer = Buffer.from(await oldHeaderWorkbook.xlsx.writeBuffer());
  await assert.rejects(() => parseWorkbook(oldHeaderBuffer), /colunas desconhecidas: credor_id/);

  titles.getCell('H2').value = { formula: '="formula proibida"', result: 'formula proibida' };
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
