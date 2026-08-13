'use strict';

const { columnExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, 'solicitacao_compras'))) return;

    if (!(await columnExists(sequelize, 'solicitacao_compras', 'frete_tipo'))) {
      await queryInterface.addColumn('solicitacao_compras', 'frete_tipo', {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'SEM_FRETE'
      });
    }

    if (!(await columnExists(sequelize, 'solicitacao_compras', 'frete_valor'))) {
      await queryInterface.addColumn('solicitacao_compras', 'frete_valor', {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      });
    }

    if (!(await columnExists(sequelize, 'solicitacao_compras', 'frete_data_vencimento'))) {
      await queryInterface.addColumn('solicitacao_compras', 'frete_data_vencimento', {
        type: DataTypes.DATEONLY,
        allowNull: true
      });
    }

    if (!(await columnExists(sequelize, 'solicitacao_compras', 'frete_parceiro_id'))) {
      await queryInterface.addColumn('solicitacao_compras', 'frete_parceiro_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'parceiros', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    if (!(await columnExists(sequelize, 'solicitacao_compras', 'frete_dados_pagamento'))) {
      await queryInterface.addColumn('solicitacao_compras', 'frete_dados_pagamento', {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }
  },

  async down() {
    // Sem rollback destrutivo: os dados financeiros do frete preservam auditoria.
  }
};
