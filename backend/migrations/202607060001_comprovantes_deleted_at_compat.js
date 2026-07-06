const { columnExists, indexExists, tableExists } = require('../src/database/schemaUtils');

async function addDeletedAtIfMissing({ queryInterface, sequelize, DataTypes, tableName }) {
  if (!(await tableExists(sequelize, tableName))) {
    return;
  }

  if (!(await columnExists(sequelize, tableName, 'deleted_at'))) {
    await queryInterface.addColumn(tableName, 'deleted_at', {
      type: DataTypes.DATE,
      allowNull: true
    });
  }

  const indexName = `idx_${tableName.toLowerCase()}_deleted_at`;
  if (!(await indexExists(sequelize, tableName, indexName))) {
    await queryInterface.addIndex(tableName, ['deleted_at'], { name: indexName });
  }
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    await addDeletedAtIfMissing({ queryInterface, sequelize, DataTypes, tableName: 'Comprovantes' });
    await addDeletedAtIfMissing({ queryInterface, sequelize, DataTypes, tableName: 'comprovantes' });
  }
};
