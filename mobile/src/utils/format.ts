function parseFlexibleNumber(value?: number | string | null) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const cleaned = raw.replace(/[^\d,.-]/g, '');
  if (!cleaned) return null;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  let normalized = cleaned;

  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    const dotMatches = cleaned.match(/\./g) || [];
    if (dotMatches.length > 1) {
      normalized = cleaned.replace(/\./g, '');
    }
  }

  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function formatCurrencyBR(value?: number | string | null) {
  const numericValue = parseFlexibleNumber(value);
  if (numericValue === null) return '-';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numericValue);
}

export function formatDateTimeBR(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function formatDateBR(value?: string | null) {
  if (!value) return '-';

  const isoDateMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    return `${isoDateMatch[3]}/${isoDateMatch[2]}/${isoDateMatch[1]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

export function formatPhoneBR(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '-';

  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }

  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

  return digits;
}

export function normalizeCurrencyInput(value?: string | number | null) {
  const numericValue = parseFlexibleNumber(value);
  return numericValue === null ? undefined : numericValue;
}

export function formatCurrencyInputBR(value?: string | null) {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 13);

  if (!digits) return '';

  const numericValue = Number(digits) / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericValue);
}

export function maskDateInputBR(value?: string | null) {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseDateBRToApi(value?: string | null) {
  const match = String(value || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const [, dayRaw, monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);

  if (!day || !month || !year) return null;

  const date = new Date(year, month - 1, day);
  const isValid = (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );

  if (!isValid) return null;

  return `${yearRaw}-${monthRaw}-${dayRaw}`;
}
