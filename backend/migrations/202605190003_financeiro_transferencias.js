const { columnExists, foreignKeyExists, indexExists, tableExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (await tableExists(sequelize, tableName) && !(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function addForeignKeyIfMissing(queryInterface, sequelize, tableName, name, fields, referenceTable, referenceField, onDelete = 'SET NULL') {
  if (!(await tableExists(sequelize, tableName)) || await foreignKeyExists(sequelize, tableName, name)) {
    return;
  }

  await queryInterface.addConstraint(tableName, {
    fields,
    type: 'foreign key',
    name,
    references: {
      table: referenceTable,
      field: referenceField
    },
    onDelete,
    onUpdate: 'CASCADE'
  });
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    const Sequelize = DataTypes;

    if (!(await tableExists(sequelize, 'transferencias_financeiras'))) {
      await queryInterface.createTable('transferencias_financeiras', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        empresa_id: { type: Sequelize.INTEGER, allowNull: true },
        conta_origem_id: { type: Sequelize.INTEGER, allowNull: false },
        conta_destino_id: { type: Sequelize.INTEGER, allowNull: false },
        caixa_sessao_origem_id: { type: Sequelize.INTEGER, allowNull: true },
        caixa_sessao_destino_id: { type: Sequelize.INTEGER, allowNull: true },
        conciliacao_origem_id: { type: Sequelize.INTEGER, allowNull: true },
        conciliacao_destino_id: { type: Sequelize.INTEGER, allowNull: true },
        data_transferencia: { type: Sequelize.DATEONLY, allowNull: false },
        valor: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
        descricao: { type: Sequelize.STRING(255), allowNull: true },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'ATIVA' },
        criado_por: { type: Sequelize.INTEGER, allowNull: true },
        cancelado_por: { type: Sequelize.INTEGER, allowNull: true },
        cancelado_em: { type: Sequelize.DATE, allowNull: true },
        observacoes_cancelamento: { type: Sequelize.TEXT, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      });
    }

    const indexes = [
      ['idx_transferencias_conta_origem_data', ['conta_origem_id', 'data_transferencia']],
      ['idx_transferencias_conta_destino_data', ['conta_destino_id', 'data_transferencia']],
      ['idx_transferencias_empresa_data', ['empresa_id', 'data_transferencia']],
      ['idx_transferencias_status', ['status']]
    ];

    for (const [name, fields] of indexes) {
      if (!(await indexExists(sequelize, 'transferencias_financeiras', name))) {
        await queryInterface.addIndex('transferencias_financeiras', fields, { name });
      }
    }

    await addColumnIfMissing(queryInterface, sequelize, 'conciliacoes_bancarias', 'transferencia_financeira_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    const foreignKeys = [
      ['fk_transferencias_empresa', ['empresa_id'], 'empresas_grupo', 'id', 'SET NULL'],
      ['fk_transferencias_conta_origem', ['conta_origem_id'], 'contas_bancarias', 'id', 'RESTRICT'],
      ['fk_transferencias_conta_destino', ['conta_destino_id'], 'contas_bancarias', 'id', 'RESTRICT'],
      ['fk_transferencias_caixa_origem', ['caixa_sessao_origem_id'], 'financeiro_caixa_sessoes', 'id', 'SET NULL'],
      ['fk_transferencias_caixa_destino', ['caixa_sessao_destino_id'], 'financeiro_caixa_sessoes', 'id', 'SET NULL'],
      ['fk_transferencias_conc_origem', ['conciliacao_origem_id'], 'conciliacoes_bancarias', 'id', 'SET NULL'],
      ['fk_transferencias_conc_destino', ['conciliacao_destino_id'], 'conciliacoes_bancarias', 'id', 'SET NULL'],
      ['fk_transferencias_criado_por', ['criado_por'], 'users', 'id', 'SET NULL'],
      ['fk_transferencias_cancelado_por', ['cancelado_por'], 'users', 'id', 'SET NULL'],
      ['fk_conciliacoes_transferencia', ['transferencia_financeira_id'], 'transferencias_financeiras', 'id', 'SET NULL']
    ];

    for (const [name, fields, table, field, onDelete] of foreignKeys) {
      const targetTable = name === 'fk_conciliacoes_transferencia' ? 'conciliacoes_bancarias' : 'transferencias_financeiras';
      await addForeignKeyIfMissing(queryInterface, sequelize, targetTable, name, fields, table, field, onDelete);
    }
  },

  async down({ queryInterface, sequelize }) {
    if (await tableExists(sequelize, 'conciliacoes_bancarias') && await columnExists(sequelize, 'conciliacoes_bancarias', 'transferencia_financeira_id')) {
      await queryInterface.removeColumn('conciliacoes_bancarias', 'transferencia_financeira_id');
    }

    if (await tableExists(sequelize, 'transferencias_financeiras')) {
      await queryInterface.dropTable('transferencias_financeiras');
    }
  }
};
