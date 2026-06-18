const { columnExists, indexExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (await columnExists(sequelize, tableName, columnName)) return;
  await queryInterface.addColumn(tableName, columnName, definition);
}

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, name) {
  if (await indexExists(sequelize, tableName, name)) return;
  await queryInterface.addIndex(tableName, fields, { name });
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    await addColumnIfMissing(queryInterface, sequelize, 'conversas_internas_mensagens', 'deleted_at', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'conversas_internas_anexos', 'deleted_at', {
      type: DataTypes.DATE,
      allowNull: true
    });

    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'conversas_internas_mensagens',
      ['conversa_id', 'deleted_at'],
      'idx_conv_msg_conversa_deleted'
    );

    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'conversas_internas_anexos',
      ['mensagem_id', 'deleted_at'],
      'idx_conv_anexo_msg_deleted'
    );
  },

  async down() {}
};
