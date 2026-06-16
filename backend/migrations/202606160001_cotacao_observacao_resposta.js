const { columnExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ queryInterface, DataTypes }) {
    const tableName = 'solicitacao_compra_fornecedores';

    if (!(await tableExists(queryInterface, tableName))) {
      return;
    }

    if (!(await columnExists(queryInterface, tableName, 'observacao_resposta'))) {
      await queryInterface.addColumn(tableName, 'observacao_resposta', {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }
  }
};
