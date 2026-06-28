const { indexExists, resolveTableName, tableExists } = require('../src/database/schemaUtils');

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, name, options = {}) {
  if (!(await tableExists(sequelize, tableName))) return;
  if (await indexExists(sequelize, tableName, name)) return;
  await queryInterface.addIndex(tableName, fields, { name, ...options });
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    const obrasTableName = await resolveTableName(sequelize, ['Obras', 'obras'], 'Obras');

    if (!(await tableExists(sequelize, 'pedido_compra_fretes'))) {
      await queryInterface.createTable('pedido_compra_fretes', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        pedido_compra_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'pedido_compras', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        solicitacao_compra_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'solicitacao_compras', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        solicitacao_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'solicitacoes', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        obra_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: obrasTableName, key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        tipo: {
          type: DataTypes.STRING(30),
          allowNull: false,
          defaultValue: 'EMBUTIDO'
        },
        momento: {
          type: DataTypes.STRING(30),
          allowNull: false,
          defaultValue: 'FECHAMENTO'
        },
        criterio_rateio: {
          type: DataTypes.STRING(30),
          allowNull: false,
          defaultValue: 'VALOR_ITENS'
        },
        status_financeiro: {
          type: DataTypes.STRING(40),
          allowNull: false,
          defaultValue: 'NAO_GERA_TITULO'
        },
        valor_total: {
          type: DataTypes.DECIMAL(14, 2),
          allowNull: false,
          defaultValue: 0
        },
        fornecedor_compra_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'fornecedores_compra', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        parceiro_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'parceiros', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        titulo_financeiro_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'titulos_financeiros', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        dados_pagamento: {
          type: DataTypes.TEXT('long'),
          allowNull: true
        },
        observacoes: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        idempotency_key: {
          type: DataTypes.STRING(120),
          allowNull: true
        },
        registrado_por: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    }

    if (!(await tableExists(sequelize, 'pedido_compra_frete_rateios'))) {
      await queryInterface.createTable('pedido_compra_frete_rateios', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        frete_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'pedido_compra_fretes', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        pedido_compra_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'pedido_compras', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        pedido_compra_item_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'pedido_compra_itens', key: 'id' },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },
        solicitacao_compra_item_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'solicitacao_compra_itens', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        solicitacao_compra_item_manual_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'solicitacao_compra_itens_manuais', key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        obra_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: obrasTableName, key: 'id' },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        valor_item_base: {
          type: DataTypes.DECIMAL(14, 2),
          allowNull: false,
          defaultValue: 0
        },
        percentual_rateio: {
          type: DataTypes.DECIMAL(9, 6),
          allowNull: false,
          defaultValue: 0
        },
        valor_rateado: {
          type: DataTypes.DECIMAL(14, 2),
          allowNull: false,
          defaultValue: 0
        },
        manual: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    }

    await addIndexIfMissing(queryInterface, sequelize, 'pedido_compra_fretes', ['pedido_compra_id'], 'idx_pedido_compra_fretes_pedido');
    await addIndexIfMissing(queryInterface, sequelize, 'pedido_compra_fretes', ['solicitacao_compra_id'], 'idx_pedido_compra_fretes_solicitacao_compra');
    await addIndexIfMissing(queryInterface, sequelize, 'pedido_compra_fretes', ['status_financeiro'], 'idx_pedido_compra_fretes_status_financeiro');
    await addIndexIfMissing(
      queryInterface,
      sequelize,
      'pedido_compra_fretes',
      ['pedido_compra_id', 'idempotency_key'],
      'uniq_pedido_compra_fretes_idempotency',
      { unique: true }
    );
    await addIndexIfMissing(queryInterface, sequelize, 'pedido_compra_frete_rateios', ['frete_id'], 'idx_pedido_compra_frete_rateios_frete');
    await addIndexIfMissing(queryInterface, sequelize, 'pedido_compra_frete_rateios', ['obra_id'], 'idx_pedido_compra_frete_rateios_obra');
  },

  async down() {}
};
