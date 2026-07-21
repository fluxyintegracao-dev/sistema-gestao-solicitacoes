'use strict';

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const description = await queryInterface.describeTable(tableName).catch(() => ({}));
  if (!description[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

module.exports = {
  async up({ DataTypes, queryInterface }) {
    await addColumnIfMissing(
      queryInterface,
      'solicitacao_compra_fechamentos',
      'quantidade_nao_comprada',
      {
        type: DataTypes.DECIMAL(14, 3),
        allowNull: false,
        defaultValue: 0
      }
    );
  },

  async down() {
    // Migration aditiva: rollback destrutivo somente de forma assistida.
  }
};
