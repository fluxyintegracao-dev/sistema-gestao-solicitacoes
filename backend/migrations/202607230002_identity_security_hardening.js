const {
  columnExists,
  tableExists
} = require('../src/database/schemaUtils');
const {
  encryptSensitiveValue,
  isEncryptedSensitiveValue
} = require('../src/services/sensitiveFieldCrypto');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'users'))) return;

    if (!(await columnExists(sequelize, 'users', 'token_version'))) {
      await sequelize.query(`
        ALTER TABLE users
        ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER mfa_totp_last_verified_at
      `);
    }

    const [users] = await sequelize.query(`
      SELECT id, mfa_totp_secret, mfa_totp_temp_secret
        FROM users
       WHERE mfa_totp_secret IS NOT NULL
          OR mfa_totp_temp_secret IS NOT NULL
    `);

    for (const user of users) {
      const updates = {};
      if (user.mfa_totp_secret && !isEncryptedSensitiveValue(user.mfa_totp_secret)) {
        updates.mfa_totp_secret = encryptSensitiveValue(user.mfa_totp_secret);
      }
      if (user.mfa_totp_temp_secret && !isEncryptedSensitiveValue(user.mfa_totp_temp_secret)) {
        updates.mfa_totp_temp_secret = encryptSensitiveValue(user.mfa_totp_temp_secret);
      }
      if (!Object.keys(updates).length) continue;

      await sequelize.query(`
        UPDATE users
           SET mfa_totp_secret = COALESCE(:secret, mfa_totp_secret),
               mfa_totp_temp_secret = COALESCE(:tempSecret, mfa_totp_temp_secret),
               updatedAt = NOW()
         WHERE id = :id
      `, {
        replacements: {
          id: user.id,
          secret: updates.mfa_totp_secret || null,
          tempSecret: updates.mfa_totp_temp_secret || null
        }
      });
    }
  }
};
