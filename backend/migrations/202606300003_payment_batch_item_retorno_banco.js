async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
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
  async up({ DataTypes, queryInterface }) {
    await addColumnIfMissing(queryInterface, 'payment_batch_items', 'end_to_end_id', {
      type: DataTypes.STRING(160),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'payment_batch_items', 'protocolo_banco', {
      type: DataTypes.STRING(160),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'payment_batch_items', 'confirmado_banco_em', {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  async down({ queryInterface }) {
    await removeColumnIfExists(queryInterface, 'payment_batch_items', 'confirmado_banco_em');
    await removeColumnIfExists(queryInterface, 'payment_batch_items', 'protocolo_banco');
    await removeColumnIfExists(queryInterface, 'payment_batch_items', 'end_to_end_id');
  }
};
