const crypto = require('crypto');

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function stripAccents(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeText(value) {
  return stripAccents(value)
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function numberField(value, size) {
  return onlyDigits(value).padStart(size, '0').slice(-size);
}

function textField(value, size) {
  return normalizeText(value).slice(0, size).padEnd(size, ' ');
}

function blank(size) {
  return ''.padEnd(size, ' ');
}

function zero(size) {
  return ''.padStart(size, '0');
}

function moneyField(value, size = 15) {
  const cents = Math.round((Number(value || 0) + Number.EPSILON) * 100);
  return numberField(cents, size);
}

function dateField(value) {
  if (!value) return zero(8);
  const normalized = String(value).slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
    return normalized.replace(/\D/g, '');
  }

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return zero(8);
  return `${match[3]}${match[2]}${match[1]}`;
}

function timeField(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return zero(6);
  return [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0')
  ].join('');
}

function setField(line, start, end, value) {
  const from = Number(start) - 1;
  const to = Number(end);
  const size = to - from;
  const content = String(value || '').slice(0, size).padEnd(size, ' ');
  return `${line.slice(0, from)}${content}${line.slice(to)}`;
}

function createLine(fields = []) {
  let line = blank(240);
  for (const field of fields) {
    line = setField(line, field.start, field.end, field.value);
  }
  return line;
}

function validateCnab240Lines(lines) {
  const errors = [];
  const normalized = Array.isArray(lines) ? lines : String(lines || '').split(/\r?\n/).filter(Boolean);

  normalized.forEach((line, index) => {
    if (line.length !== 240) {
      errors.push(`Linha ${index + 1} possui ${line.length} caracteres; esperado 240.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    totalLines: normalized.length
  };
}

function hashCnab(content) {
  return crypto.createHash('sha256').update(String(content || ''), 'utf8').digest('hex');
}

module.exports = {
  blank,
  createLine,
  dateField,
  hashCnab,
  moneyField,
  normalizeText,
  numberField,
  onlyDigits,
  setField,
  textField,
  timeField,
  validateCnab240Lines,
  zero
};
