'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const VERSION = 1;

function getCryptoSecret() {
  const secret = String(process.env.FISCAL_CRYPTO_KEY || '').trim();
  if (!secret) {
    const error = new Error('Criptografia fiscal nao configurada. Informe FISCAL_CRYPTO_KEY.');
    error.statusCode = 400;
    throw error;
  }

  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    const error = new Error('FISCAL_CRYPTO_KEY deve ter pelo menos 32 caracteres em producao.');
    error.statusCode = 500;
    throw error;
  }

  return secret;
}

function deriveKey() {
  return crypto
    .createHash('sha256')
    .update(getCryptoSecret())
    .digest();
}

function encryptFiscalSecret(value) {
  const plaintext = String(value ?? '');
  if (!plaintext) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    version: VERSION,
    alg: ALGORITHM,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64')
  });
}

function decryptFiscalSecret(payload) {
  if (!payload) return '';

  let parsed;
  try {
    parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
  } catch {
    const error = new Error('Segredo fiscal criptografado invalido.');
    error.statusCode = 400;
    throw error;
  }

  if (Number(parsed?.version) !== VERSION || parsed?.alg !== ALGORITHM) {
    const error = new Error('Versao de segredo fiscal nao suportada.');
    error.statusCode = 400;
    throw error;
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    deriveKey(),
    Buffer.from(parsed.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(parsed.data, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

function isFiscalCryptoConfigured() {
  return Boolean(String(process.env.FISCAL_CRYPTO_KEY || '').trim());
}

module.exports = {
  decryptFiscalSecret,
  encryptFiscalSecret,
  isFiscalCryptoConfigured
};
