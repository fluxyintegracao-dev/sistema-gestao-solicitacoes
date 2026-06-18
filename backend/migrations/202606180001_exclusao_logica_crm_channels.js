const { columnExists, indexExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (!(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, indexName) {
  if (!(await indexExists(sequelize, tableName, indexName))) {
    await queryInterface.addIndex(tableName, fields, { name: indexName });
  }
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    await addColumnIfMissing(queryInterface, sequelize, 'crm_channels', 'deleted_at', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'crm_phone_assets', 'deleted_at', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addIndexIfMissing(queryInterface, sequelize, 'crm_channels', ['deleted_at'], 'idx_crm_channels_deleted_at');
    await addIndexIfMissing(queryInterface, sequelize, 'crm_phone_assets', ['deleted_at'], 'idx_crm_phone_assets_deleted_at');
  }
};
