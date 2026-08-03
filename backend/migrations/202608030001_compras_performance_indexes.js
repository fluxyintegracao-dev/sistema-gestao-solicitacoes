'use strict';

const { indexExists, tableExists } = require('../src/database/schemaUtils');

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, name) {
  if (!(await tableExists(sequelize, tableName))) return;
  if (!(await indexExists(sequelize, tableName, name))) {
    await queryInterface.addIndex(tableName, fields, { name });
  }
}

module.exports = {
  async up({ queryInterface, sequelize }) {
    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'solicitacao_compras',
      ['origem', 'status', 'obra_id', 'createdAt'],
      'idx_sol_compra_lista_operacional'
    );
    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'solicitacao_compras',
      ['comprador_responsavel_id', 'status', 'updatedAt'],
      'idx_sol_compra_comprador_status'
    );
    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'solicitacao_compras',
      ['solicitante_id', 'status', 'updatedAt'],
      'idx_sol_compra_solicitante_status'
    );
    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'solicitacao_compra_fornecedores',
      ['solicitacao_compra_id', 'status', 'createdAt'],
      'idx_cotacao_solicitacao_status_data'
    );
    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'pedido_compras',
      ['obra_id', 'status', 'updatedAt'],
      'idx_pedido_compra_obra_status_data'
    );
    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'pedido_compras',
      ['solicitacao_compra_id', 'status'],
      'idx_pedido_compra_solicitacao_status'
    );
    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'pedido_compra_itens',
      ['pedido_compra_id', 'removido'],
      'idx_pedido_item_pedido_removido'
    );
  },

  async down() {
    // Indices aditivos: rollback destrutivo somente de forma assistida.
  }
};
