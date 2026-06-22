const crypto = require('crypto');

const PASSWORD_POLICY_MESSAGE =
  'A senha deve ter no minimo 8 caracteres, uma letra maiuscula, uma letra minuscula, um numero e um caractere especial.';

function validateStrongPassword(password) {
  const value = String(password || '');
  const errors = [];

  if (value.length < 8) errors.push('minimo 8 caracteres');
  if (!/[A-Z]/.test(value)) errors.push('uma letra maiuscula');
  if (!/[a-z]/.test(value)) errors.push('uma letra minuscula');
  if (!/\d/.test(value)) errors.push('um numero');
  if (!/[^A-Za-z0-9]/.test(value)) errors.push('um caractere especial');

  return {
    ok: errors.length === 0,
    errors,
    message: PASSWORD_POLICY_MESSAGE
  };
}

function assertStrongPassword(password) {
  const result = validateStrongPassword(password);
  if (!result.ok) {
    const error = new Error(PASSWORD_POLICY_MESSAGE);
    error.statusCode = 400;
    error.code = 'WEAK_PASSWORD';
    error.details = { errors: result.errors };
    throw error;
  }
}

function generateTemporaryPassword() {
  return `Fluxy@${crypto.randomBytes(12).toString('hex')}1aA!`;
}

function generatePasswordResetToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashPasswordResetToken(token) {
  return crypto
    .createHash('sha256')
    .update(String(token || '').trim())
    .digest('hex');
}

module.exports = {
  PASSWORD_POLICY_MESSAGE,
  assertStrongPassword,
  generatePasswordResetToken,
  generateTemporaryPassword,
  hashPasswordResetToken,
  validateStrongPassword
};
