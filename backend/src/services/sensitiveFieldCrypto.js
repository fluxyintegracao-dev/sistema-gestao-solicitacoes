const crypto = require('crypto');

const PREFIX = 'enc:v1';

function getEncryptionKey() {
  const raw = String(process.env.MFA_ENCRYPTION_KEY || '').trim();
  if (!raw) {
    const error = new Error('MFA_ENCRYPTION_KEY nao configurada.');
    error.code = 'MFA_ENCRYPTION_KEY_MISSING';
    throw error;
  }

  if (/^[a-f0-9]{64}$/i.test(raw)) {
    return Buffer.from(raw, 'hex');
  }

  const decoded = Buffer.from(raw, 'base64');
  if (decoded.length === 32) return decoded;

  const error = new Error('MFA_ENCRYPTION_KEY deve conter exatamente 32 bytes em hexadecimal ou base64.');
  error.code = 'MFA_ENCRYPTION_KEY_INVALID';
  throw error;
}

function isEncryptedSensitiveValue(value) {
  return String(value || '').startsWith(`${PREFIX}:`);
}

function encryptSensitiveValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (isEncryptedSensitiveValue(value)) return String(value);

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(value), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64')
  ].join(':');
}

function decryptSensitiveValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (!isEncryptedSensitiveValue(value)) return String(value);

  const parts = String(value).split(':');
  if (parts.length !== 5 || `${parts[0]}:${parts[1]}` !== PREFIX) {
    throw new Error('Formato de campo sensivel criptografado invalido.');
  }
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(parts[2], 'base64')
  );
  decipher.setAuthTag(Buffer.from(parts[3], 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(parts[4], 'base64')),
    decipher.final()
  ]).toString('utf8');
}

module.exports = {
  decryptSensitiveValue,
  encryptSensitiveValue,
  isEncryptedSensitiveValue
};
