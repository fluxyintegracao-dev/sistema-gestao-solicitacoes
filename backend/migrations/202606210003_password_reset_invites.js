const { columnExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, DataTypes, tableName, columnName, definition) {
  if (!(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    await addColumnIfMissing(queryInterface, sequelize, DataTypes, 'users', 'force_password_reset', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await addColumnIfMissing(queryInterface, sequelize, DataTypes, 'users', 'password_reset_token_hash', {
      type: DataTypes.STRING(128),
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, DataTypes, 'users', 'password_reset_expires_at', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, DataTypes, 'users', 'password_changed_at', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, DataTypes, 'users', 'password_setup_sent_at', {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  async down() {}
};
