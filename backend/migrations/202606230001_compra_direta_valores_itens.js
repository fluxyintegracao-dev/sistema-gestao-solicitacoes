const { columnExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (!(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    const camposValor = {
      valor_unitario: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      valor_total: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      }
    };

    for (const [columnName, definition] of Object.entries(camposValor)) {
      await addColumnIfMissing(queryInterface, sequelize, 'solicitacao_compra_itens', columnName, definition);
      await addColumnIfMissing(queryInterface, sequelize, 'solicitacao_compra_itens_manuais', columnName, definition);
    }
  }
};
