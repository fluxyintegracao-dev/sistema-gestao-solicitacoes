const { columnExists, indexExists, tableExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (!(await tableExists(sequelize, tableName))) return;
  if (await columnExists(sequelize, tableName, columnName)) return;
  await queryInterface.addColumn(tableName, columnName, definition);
}

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, name) {
  if (!(await tableExists(sequelize, tableName))) return;
  if (await indexExists(sequelize, tableName, name)) return;
  await queryInterface.addIndex(tableName, fields, { name });
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    await addColumnIfMissing(queryInterface, sequelize, 'solicitacao_compra_resposta_itens', 'deleted_at', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'solicitacao_compra_resposta_itens',
      ['solicitacao_compra_fornecedor_id', 'deleted_at'],
      'idx_sc_resposta_itens_fornecedor_deleted'
    );

    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'solicitacao_compra_resposta_itens',
      ['solicitacao_compra_item_id', 'deleted_at'],
      'idx_sc_resposta_itens_item_deleted'
    );
  },

  async down() {}
};
