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
    await addColumnIfMissing(queryInterface, sequelize, 'anexos', 'deleted_at', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'comprovantes', 'deleted_at', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addIndexIfMissing(queryInterface, sequelize, 'anexos', ['deleted_at'], 'idx_anexos_deleted_at');
    await addIndexIfMissing(queryInterface, sequelize, 'comprovantes', ['deleted_at'], 'idx_comprovantes_deleted_at');
  }
};
