'use strict';

const { indexExists, tableExists } = require('../src/database/schemaUtils');

async function createTableIfMissing(queryInterface, sequelize, tableName, definition) {
  if (!(await tableExists(sequelize, tableName))) {
    await queryInterface.createTable(tableName, definition);
  }
}

async function addIndexIfMissing(queryInterface, sequelize, tableName, fields, name) {
  if ((await tableExists(sequelize, tableName)) && !(await indexExists(sequelize, tableName, name))) {
    await queryInterface.addIndex(tableName, fields, { name });
  }
}

function auditColumns(DataTypes) {
  return {
    criado_por: { type: DataTypes.INTEGER, allowNull: true },
    atualizado_por: { type: DataTypes.INTEGER, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  };
}

function baseOperationalColumns(DataTypes) {
  return {
    empresa_id: { type: DataTypes.INTEGER, allowNull: true },
    obra_id: { type: DataTypes.INTEGER, allowNull: true },
    colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'REGISTRADO' },
    mensagem: { type: DataTypes.TEXT, allowNull: true },
    payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
    erro: { type: DataTypes.TEXT, allowNull: true }
  };
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    await createTableIfMissing(queryInterface, sequelize, 'sst_workflow_logs', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      workflow_id: { type: DataTypes.INTEGER, allowNull: true },
      execucao_id: { type: DataTypes.INTEGER, allowNull: true },
      evento_id: { type: DataTypes.INTEGER, allowNull: true },
      ...baseOperationalColumns(DataTypes),
      acao: { type: DataTypes.STRING(80), allowNull: false },
      duracao_ms: { type: DataTypes.INTEGER, allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_automation_logs', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      evento_id: { type: DataTypes.INTEGER, allowNull: true },
      ...baseOperationalColumns(DataTypes),
      automacao: { type: DataTypes.STRING(100), allowNull: false },
      duracao_ms: { type: DataTypes.INTEGER, allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_blocking_logs', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      bloqueio_id: { type: DataTypes.INTEGER, allowNull: true },
      ...baseOperationalColumns(DataTypes),
      tipo_bloqueio: { type: DataTypes.STRING(40), allowNull: true },
      criticidade: { type: DataTypes.STRING(30), allowNull: true },
      acao: { type: DataTypes.STRING(80), allowNull: false },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_integration_logs', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      integracao: { type: DataTypes.STRING(80), allowNull: false },
      tipo_evento: { type: DataTypes.STRING(100), allowNull: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: true },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
      origem_tipo: { type: DataTypes.STRING(80), allowNull: true },
      origem_id: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'REGISTRADO' },
      mensagem: { type: DataTypes.TEXT, allowNull: true },
      payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
      erro: { type: DataTypes.TEXT, allowNull: true },
      ...auditColumns(DataTypes)
    });

    const indexes = [
      ['sst_workflow_logs', ['workflow_id'], 'idx_sst_workflow_logs_workflow'],
      ['sst_workflow_logs', ['execucao_id'], 'idx_sst_workflow_logs_execucao'],
      ['sst_workflow_logs', ['status'], 'idx_sst_workflow_logs_status'],
      ['sst_workflow_logs', ['acao'], 'idx_sst_workflow_logs_acao'],
      ['sst_automation_logs', ['evento_id'], 'idx_sst_automation_logs_evento'],
      ['sst_automation_logs', ['status'], 'idx_sst_automation_logs_status'],
      ['sst_automation_logs', ['automacao'], 'idx_sst_automation_logs_automacao'],
      ['sst_blocking_logs', ['bloqueio_id'], 'idx_sst_blocking_logs_bloqueio'],
      ['sst_blocking_logs', ['status'], 'idx_sst_blocking_logs_status'],
      ['sst_blocking_logs', ['criticidade'], 'idx_sst_blocking_logs_criticidade'],
      ['sst_integration_logs', ['integracao'], 'idx_sst_integration_logs_integracao'],
      ['sst_integration_logs', ['tipo_evento'], 'idx_sst_integration_logs_tipo'],
      ['sst_integration_logs', ['status'], 'idx_sst_integration_logs_status']
    ];

    for (const [tableName, fields, name] of indexes) {
      await addIndexIfMissing(queryInterface, sequelize, tableName, fields, name);
    }
  },

  async down({ queryInterface, sequelize }) {
    const tables = [
      'sst_integration_logs',
      'sst_blocking_logs',
      'sst_automation_logs',
      'sst_workflow_logs'
    ];
    for (const table of tables) {
      if (await tableExists(sequelize, table)) {
        await queryInterface.dropTable(table);
      }
    }
  }
};
