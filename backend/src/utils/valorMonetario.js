const SPREADSHEET_NUMBER_FLAG = '__fluxy_spreadsheet_number__';

function createSpreadsheetNumber(value, displayValue = '') {
  return {
    [SPREADSHEET_NUMBER_FLAG]: true,
    value: Number(value),
    displayValue: String(displayValue ?? '')
  };
}

function isSpreadsheetNumber(value) {
  return Boolean(value && typeof value === 'object' && value[SPREADSHEET_NUMBER_FLAG] === true);
}

function spreadsheetDisplayValue(value) {
  return isSpreadsheetNumber(value) ? value.displayValue : value;
}

function parseValorMonetario(value, fallback = 0) {
  if (value === undefined) return fallback;
  if (value === null || value === '') return 0;

  if (isSpreadsheetNumber(value)) {
    return Number.isFinite(value.value) ? value.value : fallback;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  const raw = String(value)
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s/g, '');

  if (!raw) return 0;

  const commaCount = (raw.match(/,/g) || []).length;
  const dotCount = (raw.match(/\./g) || []).length;
  let normalized = raw;

  if (commaCount && dotCount) {
    if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
      normalized = raw.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = raw.replace(/,/g, '');
    }
  } else if (commaCount) {
    normalized = raw.replace(',', '.');
  } else if (dotCount) {
    const groups = raw.split('.');
    const lastGroup = groups[groups.length - 1];
    const hasOnlyThousandsGroups = lastGroup.length === 3
      && groups.slice(1).every((group) => /^\d{3}$/.test(group));

    // Em planilhas brasileiras, "155.838" representa R$ 155.838,00. Valores
    // monetarios com ponto decimal possuem no maximo duas casas, como "1234.56".
    if (hasOnlyThousandsGroups) {
      normalized = raw.replace(/\./g, '');
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  createSpreadsheetNumber,
  isSpreadsheetNumber,
  parseValorMonetario,
  spreadsheetDisplayValue
};
