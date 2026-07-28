'use strict';

const MODEL_COLUMNS = Object.freeze([
  'codigo',
  'descricao',
  'unidade',
  'quantidade',
  'custo_unitario',
  'etapa_macro_codigo',
  'codigo_pai'
]);

const REQUIRED_ROW_FIELDS = Object.freeze([
  'codigo',
  'descricao',
  'quantidade',
  'custo_unitario'
]);

function normalizeText(value, maxLength = null) {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ');
  return maxLength ? normalized.slice(0, maxLength) : normalized;
}

function normalizeCode(value) {
  return normalizeText(value, 80).toUpperCase();
}

function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function parseNonNegativeDecimal(value, fieldLabel) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      return { error: `${fieldLabel} deve ser um numero maior ou igual a zero.` };
    }
    return { value };
  }

  let raw = String(value ?? '').trim();
  if (!raw) {
    return { error: `${fieldLabel} e obrigatorio.` };
  }

  raw = raw
    .replace(/\s+/g, '')
    .replace(/^R\$/i, '')
    .replace(/[^0-9,.-]/g, '');

  if (raw.includes(',') && raw.includes('.')) {
    if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
      raw = raw.replace(/\./g, '').replace(',', '.');
    } else {
      raw = raw.replace(/,/g, '');
    }
  } else if (raw.includes(',')) {
    raw = raw.replace(/\./g, '').replace(',', '.');
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { error: `${fieldLabel} deve ser um numero maior ou igual a zero.` };
  }

  return { value: parsed };
}

function buildColumnIndex(headerRow = []) {
  const indexByColumn = new Map();
  const duplicatedColumns = [];

  headerRow.forEach((value, index) => {
    const normalized = normalizeHeader(value);
    if (!normalized) return;
    if (indexByColumn.has(normalized)) {
      duplicatedColumns.push(normalized);
      return;
    }
    indexByColumn.set(normalized, index);
  });

  const missingColumns = MODEL_COLUMNS.filter((column) => !indexByColumn.has(column));
  return { duplicatedColumns, indexByColumn, missingColumns };
}

function addRowError(row, field, message) {
  row.errors.push({ campo: field || null, mensagem: message });
}

function addRowWarning(row, field, message) {
  row.warnings.push({ campo: field || null, mensagem: message });
}

function detectHierarchyCycles(rowsByCode) {
  const state = new Map();
  const cycleCodes = new Set();

  function visit(code, path = []) {
    const currentState = state.get(code);
    if (currentState === 'done') return;
    if (currentState === 'visiting') {
      const cycleStart = path.indexOf(code);
      path.slice(cycleStart >= 0 ? cycleStart : 0).forEach((item) => cycleCodes.add(item));
      cycleCodes.add(code);
      return;
    }

    state.set(code, 'visiting');
    const row = rowsByCode.get(code);
    if (row?.codigo_pai && rowsByCode.has(row.codigo_pai)) {
      visit(row.codigo_pai, [...path, code]);
    }
    state.set(code, 'done');
  }

  rowsByCode.forEach((_, code) => visit(code));
  return cycleCodes;
}

function validatePlanoMicroRows(arrayRows = [], apropriacoes = []) {
  if (!Array.isArray(arrayRows) || arrayRows.length === 0) {
    return {
      columns: MODEL_COLUMNS,
      rows: [],
      errors: [{ linha: 1, campo: null, mensagem: 'A planilha esta vazia.' }],
      warnings: [],
      summary: {
        linhas_total: 0,
        linhas_validas: 0,
        linhas_rejeitadas: 0,
        total_micro: 0,
        total_macro_referencia: 0,
        divergencia_macro_pct: null
      }
    };
  }

  const {
    duplicatedColumns,
    indexByColumn,
    missingColumns
  } = buildColumnIndex(arrayRows[0]);

  const headerErrors = [
    ...missingColumns.map((column) => ({
      linha: 1,
      campo: column,
      mensagem: `Coluna obrigatoria ausente: ${column}.`
    })),
    ...duplicatedColumns.map((column) => ({
      linha: 1,
      campo: column,
      mensagem: `Coluna duplicada no cabecalho: ${column}.`
    }))
  ];

  if (headerErrors.length) {
    return {
      columns: MODEL_COLUMNS,
      rows: [],
      errors: headerErrors,
      warnings: [],
      summary: {
        linhas_total: Math.max(arrayRows.length - 1, 0),
        linhas_validas: 0,
        linhas_rejeitadas: Math.max(arrayRows.length - 1, 0),
        total_micro: 0,
        total_macro_referencia: 0,
        divergencia_macro_pct: null
      }
    };
  }

  const macroByCode = new Map(
    (Array.isArray(apropriacoes) ? apropriacoes : []).map((item) => [
      normalizeCode(item.codigo),
      {
        id: Number(item.id),
        codigo: normalizeCode(item.codigo),
        descricao: normalizeText(item.descricao, 500),
        valor_orcado: Number(item.valor_orcado || 0),
        somadora: Boolean(item.somadora)
      }
    ])
  );

  const rows = arrayRows.slice(1).reduce((acc, values, offset) => {
    const hasContent = MODEL_COLUMNS.some((column) => {
      const index = indexByColumn.get(column);
      return String(values?.[index] ?? '').trim() !== '';
    });
    if (!hasContent) return acc;

    const get = (column) => values?.[indexByColumn.get(column)] ?? '';
    const quantidadeResult = parseNonNegativeDecimal(get('quantidade'), 'Quantidade');
    const custoResult = parseNonNegativeDecimal(get('custo_unitario'), 'Custo unitario');
    const row = {
      linha: offset + 2,
      codigo: normalizeCode(get('codigo')),
      descricao: normalizeText(get('descricao'), 500),
      unidade: normalizeText(get('unidade'), 30),
      quantidade: quantidadeResult.value,
      custo_unitario: custoResult.value,
      etapa_macro_codigo: normalizeCode(get('etapa_macro_codigo')),
      codigo_pai: normalizeCode(get('codigo_pai')),
      apropriacao_id: null,
      somadora: false,
      valor_total: 0,
      errors: [],
      warnings: []
    };

    REQUIRED_ROW_FIELDS.forEach((field) => {
      if (field === 'quantidade' || field === 'custo_unitario') return;
      if (!row[field]) {
        addRowError(row, field, `${field} e obrigatorio.`);
      }
    });
    if (quantidadeResult.error) addRowError(row, 'quantidade', quantidadeResult.error);
    if (custoResult.error) addRowError(row, 'custo_unitario', custoResult.error);

    if (row.codigo_pai && row.codigo_pai === row.codigo) {
      addRowError(row, 'codigo_pai', 'Um item nao pode ser pai de si mesmo.');
    }

    if (row.etapa_macro_codigo) {
      const macro = macroByCode.get(row.etapa_macro_codigo);
      if (!macro) {
        addRowError(
          row,
          'etapa_macro_codigo',
          `A etapa macro ${row.etapa_macro_codigo} nao existe ou esta inativa nesta obra.`
        );
      } else {
        row.apropriacao_id = macro.id;
        row.macro = macro;
      }
    } else {
      addRowWarning(
        row,
        'etapa_macro_codigo',
        'Vinculo macro nao informado. O rascunho podera ser importado, mas nao publicado.'
      );
    }

    if (quantidadeResult.value !== undefined && custoResult.value !== undefined) {
      row.quantidade = round(quantidadeResult.value, 4);
      row.custo_unitario = round(custoResult.value, 4);
      row.valor_total = round(row.quantidade * row.custo_unitario, 2);
    }

    acc.push(row);
    return acc;
  }, []);

  const rowsByCode = new Map();
  const duplicateCodes = new Set();
  rows.forEach((row) => {
    if (!row.codigo) return;
    if (rowsByCode.has(row.codigo)) {
      duplicateCodes.add(row.codigo);
    } else {
      rowsByCode.set(row.codigo, row);
    }
  });

  rows.forEach((row) => {
    if (duplicateCodes.has(row.codigo)) {
      addRowError(row, 'codigo', `Codigo duplicado na planilha: ${row.codigo}.`);
    }
    if (row.codigo_pai && !rowsByCode.has(row.codigo_pai)) {
      addRowError(
        row,
        'codigo_pai',
        `O item pai ${row.codigo_pai} nao existe na mesma planilha.`
      );
    }
  });

  const cycleCodes = detectHierarchyCycles(rowsByCode);
  rows.forEach((row) => {
    if (cycleCodes.has(row.codigo)) {
      addRowError(row, 'codigo_pai', 'A hierarquia possui um ciclo envolvendo este item.');
    }
  });

  const parentCodes = new Set(rows.map((row) => row.codigo_pai).filter(Boolean));
  rows.forEach((row) => {
    row.somadora = parentCodes.has(row.codigo);
    if (row.somadora && !row.etapa_macro_codigo) {
      row.warnings = row.warnings.filter((warning) => warning.campo !== 'etapa_macro_codigo');
    }
  });

  const leafRows = rows.filter((row) => !row.somadora);
  const totalMicro = round(
    leafRows
      .filter((row) => row.errors.length === 0)
      .reduce((total, row) => total + Number(row.valor_total || 0), 0),
    2
  );
  const macroValues = [...macroByCode.values()];
  const macroReferenceRows = macroValues.some((macro) => !macro.somadora)
    ? macroValues.filter((macro) => !macro.somadora)
    : macroValues;
  const totalMacro = round(
    macroReferenceRows.reduce((total, macro) => total + Number(macro.valor_orcado || 0), 0),
    2
  );
  const divergence = totalMacro > 0
    ? round(((totalMicro - totalMacro) / totalMacro) * 100, 4)
    : null;

  const errors = rows.flatMap((row) => row.errors.map((error) => ({
    linha: row.linha,
    ...error
  })));
  const warnings = rows.flatMap((row) => row.warnings.map((warning) => ({
    linha: row.linha,
    ...warning
  })));

  return {
    columns: MODEL_COLUMNS,
    rows,
    errors,
    warnings,
    summary: {
      linhas_total: rows.length,
      linhas_validas: rows.filter((row) => row.errors.length === 0).length,
      linhas_rejeitadas: rows.filter((row) => row.errors.length > 0).length,
      total_micro: totalMicro,
      total_macro_referencia: totalMacro,
      divergencia_macro_pct: divergence
    }
  };
}

module.exports = {
  MODEL_COLUMNS,
  buildColumnIndex,
  normalizeCode,
  normalizeHeader,
  normalizeText,
  parseNonNegativeDecimal,
  validatePlanoMicroRows
};
