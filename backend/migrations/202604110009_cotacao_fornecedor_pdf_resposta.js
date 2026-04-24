'use strict';

// Adiciona pdf_resposta_url em solicitacao_compra_fornecedores
// para armazenar PDFs enviados pelo fornecedor como resposta de cotacao

module.exports = {
  async up({ queryInterface, DataTypes }) {
    await queryInterface.addColumn('solicitacao_compra_fornecedores', 'pdf_resposta_url', {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  async down({ queryInterface }) {
    await queryInterface.removeColumn('solicitacao_compra_fornecedores', 'pdf_resposta_url');
  }
};
