const { columnExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    const tableName = 'solicitacao_compra_fornecedores';

    if (!(await tableExists(sequelize, tableName))) {
      return;
    }

    if (!(await columnExists(sequelize, tableName, 'observacao_resposta'))) {
      await queryInterface.addColumn(tableName, 'observacao_resposta', {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }
  }
};
