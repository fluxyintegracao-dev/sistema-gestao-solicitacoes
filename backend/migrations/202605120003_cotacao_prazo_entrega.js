const { columnExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    if (
      await tableExists(sequelize, 'solicitacao_compra_fornecedores') &&
      !(await columnExists(sequelize, 'solicitacao_compra_fornecedores', 'prazo_entrega'))
    ) {
      await queryInterface.addColumn('solicitacao_compra_fornecedores', 'prazo_entrega', {
        type: DataTypes.STRING(120),
        allowNull: true
      });
    }
  },

  async down({ queryInterface, sequelize }) {
    if (
      await tableExists(sequelize, 'solicitacao_compra_fornecedores') &&
      await columnExists(sequelize, 'solicitacao_compra_fornecedores', 'prazo_entrega')
    ) {
      await queryInterface.removeColumn('solicitacao_compra_fornecedores', 'prazo_entrega');
    }
  }
};
