const path = require('path');
const ExcelJS = require('exceljs');
const { createSpreadsheetNumber } = require('./valorMonetario');

function normalizeWorksheetName(name) {
  const value = String(name || 'Planilha').trim() || 'Planilha';
  return value.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31);
}

function isXlsFile(filename = '') {
  return path.extname(String(filename || '').toLowerCase()) === '.xls';
}

function isCsvFile(filename = '') {
  return path.extname(String(filename || '').toLowerCase()) === '.csv';
}

function assertSupportedSpreadsheet(filename = '') {
  if (isXlsFile(filename)) {
    const error = new Error('Formato .xls legado nao e suportado nesta importacao. Salve o arquivo como .xlsx ou .csv e tente novamente.');
    error.statusCode = 400;
    throw error;
  }
}

function decodeTextBuffer(buffer) {
  const utf8 = Buffer.from(buffer || '').toString('utf8').replace(/^\uFEFF/, '');
  const replacementCount = (utf8.match(/\uFFFD/g) || []).length;
  if (replacementCount > 0) {
    return Buffer.from(buffer || '').toString('latin1').replace(/^\uFEFF/, '');
  }
  return utf8;
}

function detectCsvDelimiter(text) {
  const sample = String(text || '')
    .split(/\r?\n/)
    .find((line) => line.trim()) || '';
  const semicolons = (sample.match(/;/g) || []).length;
  const commas = (sample.match(/,/g) || []).length;
  return semicolons >= commas ? ';' : ',';
}

function parseCsvRows(buffer) {
  const text = decodeTextBuffer(buffer);
  const delimiter = detectCsvDelimiter(text);
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(field);
      field = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  row.push(field);
  rows.push(row);

  return rows.filter((values) =>
    values.some((value) => String(value ?? '').trim() !== '')
  );
}

function buildUniqueHeaders(headerValues = []) {
  const seen = new Map();
  return headerValues.map((headerValue, index) => {
    const rawHeader = String(headerValue || '').trim();
    let header = rawHeader || `__EMPTY${index === 0 ? '' : `_${index}`}`;
    const count = seen.get(header) || 0;
    seen.set(header, count + 1);
    if (count > 0) {
      header = `${header}_${count}`;
    }
    return header;
  });
}

function csvToJsonRows(buffer, { defval = '' } = {}) {
  const rows = parseCsvRows(buffer);
  if (!rows.length) return [];
  const headers = buildUniqueHeaders(rows[0]);
  return rows.slice(1).reduce((acc, values) => {
    const payload = {};
    let hasValue = false;
    headers.forEach((header, index) => {
      const value = values[index] === undefined || values[index] === null || values[index] === '' ? defval : values[index];
      payload[header] = value;
      if (String(value ?? '').trim() !== '') {
        hasValue = true;
      }
    });
    if (hasValue) {
      acc.push(payload);
    }
    return acc;
  }, []);
}

function normalizeCellValue(cell, { raw = false, preserveNumbers = false } = {}) {
  if (!cell) return '';

  const { value } = cell;
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value;

  if (typeof value === 'object') {
    if (value.result !== undefined && value.result !== null) {
      if (preserveNumbers && typeof value.result === 'number') {
        return createSpreadsheetNumber(value.result, cell.text);
      }
      return value.result instanceof Date ? value.result : String(value.result);
    }
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text || '').join('');
    }
    if (value.text !== undefined && value.text !== null) {
      return String(value.text);
    }
    if (value.hyperlink && cell.text) {
      return String(cell.text);
    }
  }

  if (raw && typeof value === 'number') {
    return value;
  }

  if (typeof value === 'number') {
    if (preserveNumbers) {
      return createSpreadsheetNumber(value, cell.text);
    }
    return cell.text ? String(cell.text) : value;
  }

  return cell.text ? String(cell.text) : String(value);
}

async function readXlsxWorkbook(buffer, filename = '') {
  assertSupportedSpreadsheet(filename);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

async function sheetToJsonRows(buffer, {
  filename = '',
  sheetIndex = 0,
  defval = '',
  raw = false
} = {}) {
  if (isCsvFile(filename)) {
    return csvToJsonRows(buffer, { defval });
  }

  const workbook = await readXlsxWorkbook(buffer, filename);
  const worksheet = workbook.worksheets[sheetIndex];
  if (!worksheet) return [];

  const headerRow = worksheet.getRow(1);
  const columnCount = Math.max(worksheet.columnCount || 0, headerRow.cellCount || 0);
  const headers = buildUniqueHeaders(
    Array.from({ length: columnCount }, (_, index) =>
      normalizeCellValue(headerRow.getCell(index + 1), { raw: false })
    )
  );

  const rows = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const payload = {};
    let hasValue = false;

    for (let column = 1; column <= columnCount; column += 1) {
      const value = normalizeCellValue(row.getCell(column), { raw });
      const finalValue = value === '' || value === null || value === undefined ? defval : value;
      payload[headers[column - 1]] = finalValue;
      if (String(finalValue ?? '').trim() !== '') {
        hasValue = true;
      }
    }

    if (hasValue) {
      rows.push(payload);
    }
  }

  return rows;
}

async function sheetToArrayRows(buffer, {
  filename = '',
  sheetIndex = 0,
  defval = '',
  raw = false
} = {}) {
  if (isCsvFile(filename)) {
    return parseCsvRows(buffer).map((row) =>
      row.map((value) => (value === '' || value === null || value === undefined ? defval : value))
    );
  }

  const workbook = await readXlsxWorkbook(buffer, filename);
  const worksheet = workbook.worksheets[sheetIndex];
  if (!worksheet) return [];

  const rows = [];
  const columnCount = worksheet.columnCount || 0;
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values = [];
    let hasValue = false;
    for (let column = 1; column <= columnCount; column += 1) {
      const value = normalizeCellValue(row.getCell(column), { raw });
      const finalValue = value === '' || value === null || value === undefined ? defval : value;
      values.push(finalValue);
      if (String(finalValue ?? '').trim() !== '') {
        hasValue = true;
      }
    }
    if (hasValue) {
      rows.push(values);
    }
  }

  return rows;
}

async function allSheetsToArrayRows(buffer, {
  filename = '',
  defval = '',
  raw = false,
  preserveNumbers = false
} = {}) {
  if (isCsvFile(filename)) {
    return [{ name: 'CSV', rows: await sheetToArrayRows(buffer, { filename, defval, raw }) }];
  }

  const workbook = await readXlsxWorkbook(buffer, filename);
  return workbook.worksheets.map((worksheet) => {
    const rows = [];
    const columnCount = worksheet.columnCount || 0;
    for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const values = [];
      let hasValue = false;
      for (let column = 1; column <= columnCount; column += 1) {
        const value = normalizeCellValue(row.getCell(column), { raw, preserveNumbers });
        const finalValue = value === '' || value === null || value === undefined ? defval : value;
        values.push(finalValue);
        if (String(finalValue ?? '').trim() !== '') {
          hasValue = true;
        }
      }
      if (hasValue) {
        rows.push(values);
      }
    }
    return { name: worksheet.name, rows };
  });
}

async function createWorkbookBuffer(sheets = []) {
  const workbook = new ExcelJS.Workbook();
  sheets.forEach((sheetConfig, index) => {
    const worksheet = workbook.addWorksheet(normalizeWorksheetName(sheetConfig.name || `Planilha ${index + 1}`));
    (sheetConfig.rows || []).forEach((row) => worksheet.addRow(row));
    if (Array.isArray(sheetConfig.columns)) {
      worksheet.columns.forEach((column, columnIndex) => {
        const width = sheetConfig.columns[columnIndex]?.wch || sheetConfig.columns[columnIndex]?.width;
        if (width) {
          column.width = width;
        }
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function excelSerialDateToDate(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial)) return null;
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const date = new Date(utcValue * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

module.exports = {
  allSheetsToArrayRows,
  assertSupportedSpreadsheet,
  createWorkbookBuffer,
  excelSerialDateToDate,
  sheetToArrayRows,
  sheetToJsonRows
};
