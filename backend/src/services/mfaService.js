const { generateSecret, generateURI, verifySync } = require('otplib');
const QRCode = require('qrcode');
const { env } = require('../config/env');

const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_ALGORITHM = 'sha1';
const TOTP_EPOCH_TOLERANCE_SECONDS = TOTP_PERIOD_SECONDS;

function normalizeMfaCode(code) {
  return String(code || '').replace(/\s+/g, '').trim();
}

function maskSecret(secret) {
  const normalized = String(secret || '').trim();
  if (!normalized) return '';
  if (normalized.length <= 6) return '*'.repeat(normalized.length);
  return `${normalized.slice(0, 4)}${'*'.repeat(Math.max(2, normalized.length - 6))}${normalized.slice(-2)}`;
}

function generateTotpSecret() {
  return generateSecret();
}

function buildTotpLabel(user) {
  const email = String(user?.email || '').trim().toLowerCase();
  return email || `usuario-${user?.id || 'fluxy'}`;
}

function buildTotpUri(user, secret) {
  return generateURI({
    issuer: env.mfaIssuer,
    label: buildTotpLabel(user),
    secret: String(secret || '').trim(),
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD_SECONDS
  });
}

async function buildTotpSetup(user, secret) {
  const otpauthUrl = buildTotpUri(user, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    scale: 8
  });

  return {
    secret,
    secret_masked: maskSecret(secret),
    otpauth_url: otpauthUrl,
    qr_code_data_url: qrCodeDataUrl
  };
}

function verifyTotpCode(secret, code) {
  const result = verifySync({
    token: normalizeMfaCode(code),
    secret: String(secret || '').trim(),
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD_SECONDS,
    epochTolerance: TOTP_EPOCH_TOLERANCE_SECONDS
  });

  return Boolean(result?.valid);
}

module.exports = {
  buildTotpSetup,
  generateTotpSecret,
  normalizeMfaCode,
  verifyTotpCode
};
