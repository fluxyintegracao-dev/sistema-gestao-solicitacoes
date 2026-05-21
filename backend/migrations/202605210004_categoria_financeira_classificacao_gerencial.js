const { columnExists, indexExists, tableExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (await tableExists(sequelize, tableName) && !(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, name) {
  if (await tableExists(sequelize, tableName) && !(await indexExists(sequelize, tableName, name))) {
    await queryInterface.addIndex(tableName, fields, { name });
  }
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    const tableName = 'categorias_financeiras';
    const Sequelize = DataTypes;

    await addColumnIfMissing(queryInterface, sequelize, tableName, 'classificacao_gerencial', {
      type: Sequelize.STRING(40),
      allowNull: false,
      defaultValue: 'OPERACIONAL'
    });

    await addIndexIfMissing(
      queryInterface,
      sequelize,
      tableName,
      ['classificacao_gerencial'],
      'idx_categorias_financeiras_classificacao_gerencial'
    );
  },

  async down({ queryInterface, sequelize }) {
    const tableName = 'categorias_financeiras';

    if (await tableExists(sequelize, tableName) && await indexExists(sequelize, tableName, 'idx_categorias_financeiras_classificacao_gerencial')) {
      await queryInterface.removeIndex(tableName, 'idx_categorias_financeiras_classificacao_gerencial');
    }

    if (await tableExists(sequelize, tableName) && await columnExists(sequelize, tableName, 'classificacao_gerencial')) {
      await queryInterface.removeColumn(tableName, 'classificacao_gerencial');
    }
  }
};
