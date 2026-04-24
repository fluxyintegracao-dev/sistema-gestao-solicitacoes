const { columnExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (await columnExists(sequelize, tableName, columnName)) {
    return;
  }

  await queryInterface.addColumn(tableName, columnName, definition);
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    await addColumnIfMissing(queryInterface, sequelize, 'users', 'mfa_totp_enabled', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await addColumnIfMissing(queryInterface, sequelize, 'users', 'mfa_totp_secret', {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    });

    await addColumnIfMissing(queryInterface, sequelize, 'users', 'mfa_totp_temp_secret', {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null
    });

    await addColumnIfMissing(queryInterface, sequelize, 'users', 'mfa_totp_last_verified_at', {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    });
  },

  async down({ queryInterface, sequelize }) {
    const removeColumnIfExists = async (columnName) => {
      if (await columnExists(sequelize, 'users', columnName)) {
        await queryInterface.removeColumn('users', columnName);
      }
    };

    await removeColumnIfExists('mfa_totp_last_verified_at');
    await removeColumnIfExists('mfa_totp_temp_secret');
    await removeColumnIfExists('mfa_totp_secret');
    await removeColumnIfExists('mfa_totp_enabled');
  }
};
