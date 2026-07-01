'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('solicitacao_compra_resposta_itens', 'preco', {
      type: Sequelize.DECIMAL(22, 10),
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('solicitacao_compra_resposta_itens', 'preco', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true
    });
  }
};
