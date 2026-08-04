'use strict';

const {
  columnExists,
  foreignKeyExists,
  indexExists,
  tableExists
} = require('../src/database/schemaUtils');

const COSTS = 'cr_previsoes_custo';
const RECEIPTS = 'cr_previsoes_receita';
const MEASUREMENTS = 'cr_medicoes_consolidadas';

async function addColumnIfMissing(queryInterface, sequelize, table, name, definition) {
  if (!(await columnExists(sequelize, table, name))) {
    await queryInterface.addColumn(table, name, definition);
  }
}

async function addIndexIfMissing(queryInterface, sequelize, table, fields, options) {
  if (!(await indexExists(sequelize, table, options.name))) {
    await queryInterface.addIndex(table, fields, options);
  }
}

async function addForeignKeyIfMissing(queryInterface, sequelize, table, options) {
  if (!(await foreignKeyExists(sequelize, table, options.name))) {
    await queryInterface.addConstraint(table, options);
  }
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (
      !(await tableExists(sequelize, COSTS))
      || !(await tableExists(sequelize, RECEIPTS))
      || !(await tableExists(sequelize, MEASUREMENTS))
    ) return;

    await queryInterface.changeColumn(COSTS, 'plano_item_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'cr_plano_itens', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    await addColumnIfMissing(queryInterface, sequelize, COSTS, 'descricao', {
      type: DataTypes.STRING(500),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, COSTS, 'unidade', {
      type: DataTypes.STRING(30),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, COSTS, 'ordem', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await addColumnIfMissing(queryInterface, sequelize, COSTS, 'chave_local', {
      type: DataTypes.STRING(80),
      allowNull: true
    });
    await addIndexIfMissing(
      queryInterface,
      sequelize,
      COSTS,
      ['competencia_id', 'chave_local'],
      { name: 'uq_cr_previsoes_custo_chave_local', unique: true }
    );
    await addIndexIfMissing(
      queryInterface,
      sequelize,
      COSTS,
      ['competencia_id', 'etapa_macro_codigo', 'ordem'],
      { name: 'idx_cr_previsoes_custo_macro_ordem' }
    );

    await addColumnIfMissing(queryInterface, sequelize, RECEIPTS, 'previsao_custo_id', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addForeignKeyIfMissing(queryInterface, sequelize, RECEIPTS, {
      fields: ['previsao_custo_id'],
      type: 'foreign key',
      name: 'fk_cr_receitas_previsao_custo',
      references: { table: COSTS, field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    await addIndexIfMissing(
      queryInterface,
      sequelize,
      RECEIPTS,
      ['competencia_id', 'previsao_custo_id', 'origem'],
      { name: 'uq_cr_receitas_previsao_custo', unique: true }
    );

    await queryInterface.changeColumn(MEASUREMENTS, 'plano_item_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'cr_plano_itens', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    await addColumnIfMissing(queryInterface, sequelize, MEASUREMENTS, 'previsao_custo_id', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addForeignKeyIfMissing(queryInterface, sequelize, MEASUREMENTS, {
      fields: ['previsao_custo_id'],
      type: 'foreign key',
      name: 'fk_cr_medicoes_previsao_custo',
      references: { table: COSTS, field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    await addIndexIfMissing(
      queryInterface,
      sequelize,
      MEASUREMENTS,
      ['competencia_id', 'previsao_custo_id'],
      { name: 'uq_cr_medicoes_previsao_custo', unique: true }
    );
  },

  async down() {
    // Reversao deliberadamente nao destrutiva: novos subitens podem nao possuir
    // plano_item_id e remover estas colunas apagaria planejamento operacional.
  }
};
