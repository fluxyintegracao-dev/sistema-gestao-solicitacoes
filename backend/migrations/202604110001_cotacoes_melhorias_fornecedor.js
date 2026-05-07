'use strict';

async function addColumnIfNotExists(queryInterface, table, column, definition) {
  const desc = await queryInterface.describeTable(table);
  if (!desc[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
}

module.exports = {
  async up({ queryInterface, DataTypes }) {
    // ── fornecedores_compra: novos campos ──────────────────────────────────
    await addColumnIfNotExists(queryInterface, 'fornecedores_compra', 'cnpj', {
      type: DataTypes.STRING(20),
      allowNull: true,
      after: 'nome'
    });

    await addColumnIfNotExists(queryInterface, 'fornecedores_compra', 'categoria_insumos', {
      type: DataTypes.JSON,
      allowNull: true,
      after: 'observacoes'
    });

    await addColumnIfNotExists(queryInterface, 'fornecedores_compra', 'cidade', {
      type: DataTypes.STRING(150),
      allowNull: true,
      after: 'categoria_insumos'
    });

    await addColumnIfNotExists(queryInterface, 'fornecedores_compra', 'estado', {
      type: DataTypes.STRING(2),
      allowNull: true,
      after: 'cidade'
    });

    await addColumnIfNotExists(queryInterface, 'fornecedores_compra', 'cep', {
      type: DataTypes.STRING(10),
      allowNull: true,
      after: 'estado'
    });

    // ── solicitacao_compras: origem e titulo ───────────────────────────────
    await addColumnIfNotExists(queryInterface, 'solicitacao_compras', 'origem', {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'NORMAL',
      after: 'id'
    });

    await addColumnIfNotExists(queryInterface, 'solicitacao_compras', 'titulo', {
      type: DataTypes.STRING(255),
      allowNull: true,
      after: 'origem'
    });

    // obra_id pode ser null em cotacoes avulsas
    await queryInterface.changeColumn('solicitacao_compras', 'obra_id', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
  },

  async down({ queryInterface, DataTypes }) {
    await queryInterface.removeColumn('fornecedores_compra', 'cnpj');
    await queryInterface.removeColumn('fornecedores_compra', 'categoria_insumos');
    await queryInterface.removeColumn('fornecedores_compra', 'cidade');
    await queryInterface.removeColumn('fornecedores_compra', 'estado');
    await queryInterface.removeColumn('fornecedores_compra', 'cep');
    await queryInterface.removeColumn('solicitacao_compras', 'origem');
    await queryInterface.removeColumn('solicitacao_compras', 'titulo');
    await queryInterface.changeColumn('solicitacao_compras', 'obra_id', {
      type: DataTypes.INTEGER,
      allowNull: false
    });
  }
};
