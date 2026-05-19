const { columnExists, foreignKeyExists, indexExists, tableExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (await tableExists(sequelize, tableName) && !(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    const Sequelize = DataTypes;

    if (!(await tableExists(sequelize, 'financeiro_caixa_sessoes'))) {
      await queryInterface.createTable('financeiro_caixa_sessoes', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        empresa_id: { type: Sequelize.INTEGER, allowNull: true },
        conta_bancaria_id: { type: Sequelize.INTEGER, allowNull: false },
        data_abertura: { type: Sequelize.DATEONLY, allowNull: false },
        data_fechamento: { type: Sequelize.DATEONLY, allowNull: true },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ABERTO' },
        saldo_abertura: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        total_entradas: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        total_saidas: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        saldo_sistema: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        saldo_informado: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
        diferenca: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
        observacoes_abertura: { type: Sequelize.TEXT, allowNull: true },
        observacoes_fechamento: { type: Sequelize.TEXT, allowNull: true },
        aberto_por: { type: Sequelize.INTEGER, allowNull: true },
        fechado_por: { type: Sequelize.INTEGER, allowNull: true },
        fechado_em: { type: Sequelize.DATE, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      });
    }

    if (!(await indexExists(sequelize, 'financeiro_caixa_sessoes', 'idx_fin_caixa_conta_status'))) {
      await queryInterface.addIndex('financeiro_caixa_sessoes', ['conta_bancaria_id', 'status'], {
        name: 'idx_fin_caixa_conta_status'
      });
    }

    if (!(await indexExists(sequelize, 'financeiro_caixa_sessoes', 'idx_fin_caixa_empresa_data'))) {
      await queryInterface.addIndex('financeiro_caixa_sessoes', ['empresa_id', 'data_abertura'], {
        name: 'idx_fin_caixa_empresa_data'
      });
    }

    const foreignKeys = [
      ['fk_fin_caixa_empresa', ['empresa_id'], 'empresas_grupo', 'id', 'SET NULL'],
      ['fk_fin_caixa_conta', ['conta_bancaria_id'], 'contas_bancarias', 'id', 'RESTRICT'],
      ['fk_fin_caixa_aberto_por', ['aberto_por'], 'users', 'id', 'SET NULL'],
      ['fk_fin_caixa_fechado_por', ['fechado_por'], 'users', 'id', 'SET NULL']
    ];

    for (const [name, fields, table, field, onDelete] of foreignKeys) {
      if (!(await foreignKeyExists(sequelize, 'financeiro_caixa_sessoes', name))) {
        await queryInterface.addConstraint('financeiro_caixa_sessoes', {
          fields,
          type: 'foreign key',
          name,
          references: { table, field },
          onDelete,
          onUpdate: 'CASCADE'
        });
      }
    }

    await addColumnIfMissing(queryInterface, sequelize, 'conciliacoes_bancarias', 'caixa_sessao_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'movimentos_financeiros', 'caixa_sessao_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },

  async down({ queryInterface, sequelize }) {
    const nullableColumns = [
      ['movimentos_financeiros', 'caixa_sessao_id'],
      ['conciliacoes_bancarias', 'caixa_sessao_id']
    ];

    for (const [tableName, columnName] of nullableColumns) {
      if (await tableExists(sequelize, tableName) && await columnExists(sequelize, tableName, columnName)) {
        await queryInterface.removeColumn(tableName, columnName);
      }
    }

    if (await tableExists(sequelize, 'financeiro_caixa_sessoes')) {
      await queryInterface.dropTable('financeiro_caixa_sessoes');
    }
  }
};
