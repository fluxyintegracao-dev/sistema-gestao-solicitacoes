const assert = require('assert');
const ExcelJS = require('exceljs');
const {
  createSpreadsheetNumber,
  parseValorMonetario
} = require('../src/utils/valorMonetario');
const { allSheetsToArrayRows } = require('../src/utils/excelWorkbook');

const casos = [
  ['86.713,84', 86713.84],
  ['1234.56', 1234.56],
  ['155.838', 155838],
  ['1.378.394', 1378394],
  ['1.378.394,55', 1378394.55],
  ['R$ 375.193,00', 375193],
  [createSpreadsheetNumber(155838.32, '155.838'), 155838.32]
];

casos.forEach(([entrada, esperado]) => {
  assert.strictEqual(parseValorMonetario(entrada), esperado, `Falha para ${String(entrada)}`);
});

assert.strictEqual(parseValorMonetario(undefined, 17), 17);
assert.strictEqual(parseValorMonetario(null, 17), 0);

async function validarLeituraNumericaXlsx() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Apropriacoes');
  worksheet.getCell('A1').value = 'codigo';
  worksheet.getCell('B1').value = 'valor_orcado';
  worksheet.getCell('A2').value = '00.005';
  worksheet.getCell('B2').value = 155838.32;
  worksheet.getCell('B2').numFmt = '#,##0';

  const sheets = await allSheetsToArrayRows(Buffer.from(await workbook.xlsx.writeBuffer()), {
    filename: 'apropriacoes.xlsx',
    preserveNumbers: true
  });
  const valorLido = sheets[0].rows[1][1];
  assert.strictEqual(parseValorMonetario(valorLido), 155838.32);
}

validarLeituraNumericaXlsx()
  .then(() => console.log('Validacao de importacao de apropriacoes concluida com sucesso.'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
