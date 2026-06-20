const { columnExists, indexExists, tableExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (!(await tableExists(sequelize, tableName))) return;
  if (!(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, indexName) {
  if (!(await tableExists(sequelize, tableName))) return;
  if (!(await indexExists(sequelize, tableName, indexName))) {
    await queryInterface.addIndex(tableName, fields, { name: indexName });
  }
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    await addColumnIfMissing(queryInterface, sequelize, 'movimentos_financeiros', 'conciliacao_bancaria_id', {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'movimentos_financeiros',
      ['conciliacao_bancaria_id'],
      'idx_movimentos_financeiros_conciliacao_bancaria_id'
    );
  }
};
