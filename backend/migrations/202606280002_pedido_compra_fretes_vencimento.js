const { columnExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, 'pedido_compra_fretes'))) {
      return;
    }

    if (!(await columnExists(sequelize, 'pedido_compra_fretes', 'data_vencimento'))) {
      await queryInterface.addColumn('pedido_compra_fretes', 'data_vencimento', {
        type: DataTypes.DATEONLY,
        allowNull: true,
        after: 'valor_total'
      });
    }
  },

  async down() {}
};
