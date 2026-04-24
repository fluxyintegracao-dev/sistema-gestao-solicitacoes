'use strict';

// Adiciona:
// - status_disponibilidade (DISPONIVEL/NAO_TEM/PARA_CHEGAR) e data_chegada em solicitacao_compra_resposta_itens
// - condicao_pagamento em solicitacao_compra_fornecedores

module.exports = {
  async up({ queryInterface, DataTypes }) {
    await queryInterface.addColumn('solicitacao_compra_resposta_itens', 'status_disponibilidade', {
      type: DataTypes.STRING(20),
      allowNull: true
    });

    await queryInterface.addColumn('solicitacao_compra_resposta_itens', 'data_chegada', {
      type: DataTypes.DATEONLY,
      allowNull: true
    });

    await queryInterface.addColumn('solicitacao_compra_fornecedores', 'condicao_pagamento', {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  async down({ queryInterface }) {
    await queryInterface.removeColumn('solicitacao_compra_resposta_itens', 'status_disponibilidade');
    await queryInterface.removeColumn('solicitacao_compra_resposta_itens', 'data_chegada');
    await queryInterface.removeColumn('solicitacao_compra_fornecedores', 'condicao_pagamento');
  }
};
