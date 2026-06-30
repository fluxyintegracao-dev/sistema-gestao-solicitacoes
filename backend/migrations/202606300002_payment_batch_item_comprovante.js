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
    await addColumnIfMissing(queryInterface, 'payment_batch_items', 'comprovante_pdf_url', {
      type: DataTypes.TEXT,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'payment_batch_items', 'comprovante_hash', {
      type: DataTypes.STRING(128),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, 'payment_batch_items', 'comprovante_gerado_em', {
      type: DataTypes.DATE,
      allowNull: true
    });
  },

  async down({ queryInterface }) {
    await removeColumnIfExists(queryInterface, 'payment_batch_items', 'comprovante_gerado_em');
    await removeColumnIfExists(queryInterface, 'payment_batch_items', 'comprovante_hash');
    await removeColumnIfExists(queryInterface, 'payment_batch_items', 'comprovante_pdf_url');
  }
};
