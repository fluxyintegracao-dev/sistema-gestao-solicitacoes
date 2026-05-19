'use strict';

const path = require('path');
const crypto = require('crypto');

function normalizePrefix(value) {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '');
}

function sanitizePathSegment(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^\.+/g, '');

  if (!normalized || normalized.includes('..') || path.isAbsolute(normalized)) {
    throw new Error('Segmento de caminho fiscal invalido.');
  }

  return normalized;
}

function getFiscalS3Config() {
  return {
    bucket: process.env.FISCAL_S3_BUCKET || null,
    region: process.env.FISCAL_S3_REGION || process.env.AWS_REGION || null,
    prefix: normalizePrefix(process.env.FISCAL_S3_PREFIX || process.env.FISCAL_ENV || 'dev'),
    presignedExpiresSeconds: Number(process.env.FISCAL_S3_PRESIGNED_EXPIRES_SECONDS || 300)
  };
}

function isFiscalS3Configured() {
  const config = getFiscalS3Config();
  return Boolean(config.bucket && config.region);
}

function buildFiscalObjectKey({
  cnpj,
  documentType = 'nfe',
  accessKey,
  folder = 'xml',
  filename = 'original.xml',
  date = new Date()
}) {
  const config = getFiscalS3Config();
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const parts = [
    config.prefix,
    sanitizePathSegment(cnpj),
    sanitizePathSegment(documentType),
    year,
    month,
    sanitizePathSegment(accessKey),
    sanitizePathSegment(folder),
    sanitizePathSegment(filename)
  ].filter(Boolean);

  return parts.join('/');
}

function calculateSha256(bufferOrString) {
  return crypto
    .createHash('sha256')
    .update(bufferOrString)
    .digest('hex');
}

module.exports = {
  buildFiscalObjectKey,
  calculateSha256,
  getFiscalS3Config,
  isFiscalS3Configured
};
