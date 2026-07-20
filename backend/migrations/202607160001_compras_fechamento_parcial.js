const { columnExists, indexExists, tableExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (!(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, options) {
  if (!(await indexExists(sequelize, tableName, options.name))) {
    await queryInterface.addIndex(tableName, fields, options);
  }
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, 'solicitacao_compra_fechamentos'))) {
      await queryInterface.createTable('solicitacao_compra_fechamentos', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
        solicitacao_compra_id: { type: DataTypes.INTEGER, allowNull: false },
        numero_rodada: { type: DataTypes.INTEGER, allowNull: false },
        tipo: { type: DataTypes.STRING(20), allowNull: false },
        status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'CONCLUIDO' },
        idempotency_key: { type: DataTypes.STRING(180), allowNull: true },
        quantidade_total: { type: DataTypes.DECIMAL(14, 3), allowNull: false, defaultValue: 0 },
        valor_total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        justificativa: { type: DataTypes.TEXT, allowNull: true },
        criado_por: { type: DataTypes.INTEGER, allowNull: true },
        fechado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
      });
    }

    await addIndexIfMissing(queryInterface, sequelize, 'solicitacao_compra_fechamentos', ['solicitacao_compra_id', 'numero_rodada'], {
      name: 'uk_compra_fechamentos_solicitacao_rodada',
      unique: true
    });
    await addIndexIfMissing(queryInterface, sequelize, 'solicitacao_compra_fechamentos', ['idempotency_key'], {
      name: 'uk_compra_fechamentos_idempotency',
      unique: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'solicitacao_compra_alocacoes', 'fechamento_id', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'solicitacao_compra_alocacoes', 'quantidade_referencia', {
      type: DataTypes.DECIMAL(14, 3),
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, sequelize, 'pedido_compras', 'fechamento_id', {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await addIndexIfMissing(queryInterface, sequelize, 'solicitacao_compra_alocacoes', ['fechamento_id'], {
      name: 'idx_compra_alocacoes_fechamento'
    });
    await addIndexIfMissing(queryInterface, sequelize, 'pedido_compras', ['fechamento_id'], {
      name: 'idx_pedido_compras_fechamento'
    });
  },

  async down() {
    // Migration aditiva: rollback destrutivo somente de forma assistida.
  }
};
