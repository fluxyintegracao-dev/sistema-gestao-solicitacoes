'use strict';

const crypto = require('crypto');

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value ?? '')).digest('hex');
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function requiredFields(source = {}, fields = []) {
  return fields
    .filter((field) => {
      const value = String(field).split('.').reduce((acc, key) => acc?.[key], source);
      return value === undefined || value === null || value === '';
    })
    .map((field) => ({ field, message: `Campo obrigatorio ausente: ${field}` }));
}

module.exports = {
  parseJson,
  requiredFields,
  sha256,
  xmlEscape
};
