async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  const table = await queryInterface.describeTable(tableName);
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function removeColumnIfExists(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  if (table[columnName]) {
    await queryInterface.removeColumn(tableName, columnName);
  }
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    for (const tableName of ['solicitacao_compras', 'pedido_compras']) {
      await addColumnIfMissing(queryInterface, sequelize, tableName, 'motivo_delegacao_vencida', {
        type: DataTypes.TEXT,
        allowNull: true
      });
      await addColumnIfMissing(queryInterface, sequelize, tableName, 'motivo_delegacao_vencida_em', {
        type: DataTypes.DATE,
        allowNull: true
      });
    }
  },

  async down({ queryInterface }) {
    for (const tableName of ['pedido_compras', 'solicitacao_compras']) {
      await removeColumnIfExists(queryInterface, tableName, 'motivo_delegacao_vencida_em');
      await removeColumnIfExists(queryInterface, tableName, 'motivo_delegacao_vencida');
    }
  }
};
