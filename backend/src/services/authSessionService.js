const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

function normalizeSameSite(value) {
  const normalized = String(value || 'lax').trim().toLowerCase();
  if (normalized === 'strict') return 'strict';
  if (normalized === 'none') return 'none';
  return 'lax';
}

function getCookieBaseOptions() {
  const sameSite = normalizeSameSite(env.authCookieSameSite);
  return {
    httpOnly: true,
    sameSite,
    secure: env.authCookieSecure || sameSite === 'none',
    path: '/',
    ...(env.authCookieDomain ? { domain: env.authCookieDomain } : {})
  };
}

function getReadableCookieOptions() {
  return {
    ...getCookieBaseOptions(),
    httpOnly: false
  };
}

function decodeTokenExpiry(token) {
  try {
    const decoded = jwt.decode(token);
    const expiresAt = Number(decoded?.exp || 0);
    if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
      return null;
    }

    return expiresAt * 1000;
  } catch {
    return null;
  }
}

function setAuthCookies(res, token, csrfToken) {
  const expiresAtMs = decodeTokenExpiry(token);
  const authOptions = getCookieBaseOptions();
  const readableOptions = getReadableCookieOptions();

  if (expiresAtMs) {
    const maxAge = Math.max(1, expiresAtMs - Date.now());
    authOptions.maxAge = maxAge;
    readableOptions.maxAge = maxAge;
  }

  res.cookie(env.authCookieName, token, authOptions);
  res.cookie(env.csrfCookieName, csrfToken, readableOptions);
}

function setCsrfCookie(res, csrfToken, maxAge = null) {
  const readableOptions = getReadableCookieOptions();
  if (maxAge != null) {
    readableOptions.maxAge = maxAge;
  }
  res.cookie(env.csrfCookieName, csrfToken, readableOptions);
}

function clearAuthCookies(res) {
  const authOptions = getCookieBaseOptions();
  const readableOptions = getReadableCookieOptions();

  res.clearCookie(env.authCookieName, authOptions);
  res.clearCookie(env.csrfCookieName, readableOptions);
}

function generateCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

function buildAuthToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function buildMfaChallengeToken(userId) {
  return jwt.sign(
    {
      purpose: 'MFA_CHALLENGE',
      id: Number(userId)
    },
    env.jwtSecret,
    { expiresIn: env.mfaChallengeExpiresIn }
  );
}

function verifyMfaChallengeToken(token) {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (String(decoded?.purpose || '') !== 'MFA_CHALLENGE') {
    throw new Error('MFA challenge invalido');
  }
  return decoded;
}

module.exports = {
  buildAuthToken,
  buildMfaChallengeToken,
  clearAuthCookies,
  decodeTokenExpiry,
  generateCsrfToken,
  getCookieBaseOptions,
  setCsrfCookie,
  setAuthCookies,
  verifyMfaChallengeToken
};
