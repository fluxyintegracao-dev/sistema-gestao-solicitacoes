'use strict';

module.exports = {
  async up({ DataTypes, queryInterface }) {
    await queryInterface.changeColumn('solicitacao_compra_resposta_itens', 'preco', {
      type: DataTypes.DECIMAL(22, 10),
      allowNull: true
    });
  },

  async down({ DataTypes, queryInterface }) {
    await queryInterface.changeColumn('solicitacao_compra_resposta_itens', 'preco', {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    });
  }
};
