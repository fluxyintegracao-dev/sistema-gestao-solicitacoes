'use strict';

const { columnExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (await columnExists(sequelize, 'solicitacao_compra_fornecedores', 'arquivos_resposta')) {
      return;
    }

    await queryInterface.addColumn('solicitacao_compra_fornecedores', 'arquivos_resposta', {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Colecao auditavel de PDFs e imagens anexados na resposta da cotacao'
    });
  },

  async down() {
    // Sem rollback destrutivo: os anexos preservam evidencias comerciais e de auditoria.
  }
};
