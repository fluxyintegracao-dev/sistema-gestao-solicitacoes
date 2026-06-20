const { columnExists, tableExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (!(await tableExists(sequelize, tableName))) {
    return;
  }

  if (!(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

module.exports = {
  async up({ queryInterface, DataTypes }) {
    await addColumnIfMissing(queryInterface, queryInterface.sequelize, 'conciliacoes_bancarias', 'deleted_at', {
      type: DataTypes.DATE,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, queryInterface.sequelize, 'conciliacoes_bancarias', 'deleted_by', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, queryInterface.sequelize, 'conciliacoes_bancarias', 'deleted_reason', {
      type: DataTypes.STRING(255),
      allowNull: true
    });

    if (!(await tableExists(queryInterface.sequelize, 'financeiro_caixa_conciliacao_confirmacoes'))) {
      await queryInterface.createTable('financeiro_caixa_conciliacao_confirmacoes', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        conta_bancaria_id: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        empresa_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        data_referencia: {
          type: DataTypes.DATEONLY,
          allowNull: false
        },
        total_movimentos: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        total_conciliados: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        total_ignorados: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        observacoes: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        confirmado_por: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        confirmado_em: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      });

      await queryInterface.addIndex('financeiro_caixa_conciliacao_confirmacoes', ['conta_bancaria_id', 'data_referencia'], {
        name: 'idx_caixa_conciliacao_conta_data'
      });
    }
  },

  async down() {
    // Migracao conservadora: nao remove colunas de auditoria.
  }
};
