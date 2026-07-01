'use strict';

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const description = await queryInterface.describeTable(tableName).catch(() => ({}));
  if (description[columnName]) {
    return;
  }
  await queryInterface.addColumn(tableName, columnName, definition);
}

async function removeColumnIfExists(queryInterface, tableName, columnName) {
  const description = await queryInterface.describeTable(tableName).catch(() => ({}));
  if (!description[columnName]) {
    return;
  }
  await queryInterface.removeColumn(tableName, columnName);
}

module.exports = {
  async up({ DataTypes, queryInterface }) {
    const money = {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    };

    await addColumnIfMissing(queryInterface, 'solicitacao_compra_fornecedores', 'desconto_total', money);
    await addColumnIfMissing(queryInterface, 'solicitacao_compras', 'desconto_total', money);
    await addColumnIfMissing(queryInterface, 'pedido_compras', 'desconto_total', money);
    await addColumnIfMissing(queryInterface, 'pedido_compra_itens', 'desconto_rateado', money);
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_itens', 'desconto_rateado', money);
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_itens_manuais', 'desconto_rateado', money);
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_alocacoes', 'desconto_rateado', money);
  },

  async down({ queryInterface }) {
    await removeColumnIfExists(queryInterface, 'solicitacao_compra_alocacoes', 'desconto_rateado');
    await removeColumnIfExists(queryInterface, 'solicitacao_compra_itens_manuais', 'desconto_rateado');
    await removeColumnIfExists(queryInterface, 'solicitacao_compra_itens', 'desconto_rateado');
    await removeColumnIfExists(queryInterface, 'pedido_compra_itens', 'desconto_rateado');
    await removeColumnIfExists(queryInterface, 'pedido_compras', 'desconto_total');
    await removeColumnIfExists(queryInterface, 'solicitacao_compras', 'desconto_total');
    await removeColumnIfExists(queryInterface, 'solicitacao_compra_fornecedores', 'desconto_total');
  }
};
