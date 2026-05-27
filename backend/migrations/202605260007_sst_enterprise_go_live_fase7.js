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

function scopeColumns(DataTypes) {
  return {
    empresa_id: { type: DataTypes.INTEGER, allowNull: true },
    obra_id: { type: DataTypes.INTEGER, allowNull: true },
    colaborador_id: { type: DataTypes.INTEGER, allowNull: true }
  };
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    await createTableIfMissing(queryInterface, sequelize, 'sst_jobs', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      queue_name: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'sst-default' },
      job_type: { type: DataTypes.STRING(100), allowNull: false },
      status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'PENDENTE' },
      prioridade: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
      attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      max_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
      next_run_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      started_at: { type: DataTypes.DATE, allowNull: true },
      finished_at: { type: DataTypes.DATE, allowNull: true },
      locked_at: { type: DataTypes.DATE, allowNull: true },
      locked_by: { type: DataTypes.STRING(120), allowNull: true },
      duracao_ms: { type: DataTypes.INTEGER, allowNull: true },
      ...scopeColumns(DataTypes),
      referencia_tipo: { type: DataTypes.STRING(80), allowNull: true },
      referencia_id: { type: DataTypes.INTEGER, allowNull: true },
      payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
      result_json: { type: DataTypes.TEXT('long'), allowNull: true },
      last_error: { type: DataTypes.TEXT, allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_queue_metrics', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      queue_name: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'sst-default' },
      job_type: { type: DataTypes.STRING(100), allowNull: true },
      pending_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      processing_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      success_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      error_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      dead_letter_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      avg_duration_ms: { type: DataTypes.INTEGER, allowNull: true },
      sampled_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_performance_metrics', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      metric_name: { type: DataTypes.STRING(100), allowNull: false },
      scope_type: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'SISTEMA' },
      ...scopeColumns(DataTypes),
      value: { type: DataTypes.DECIMAL(14, 4), allowNull: false, defaultValue: 0 },
      unit: { type: DataTypes.STRING(30), allowNull: true },
      sampled_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_cache_entries', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      namespace: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'sst' },
      cache_key: { type: DataTypes.STRING(180), allowNull: false },
      value_json: { type: DataTypes.TEXT('long'), allowNull: true },
      tags_json: { type: DataTypes.TEXT('long'), allowNull: true },
      expires_at: { type: DataTypes.DATE, allowNull: true },
      last_hit_at: { type: DataTypes.DATE, allowNull: true },
      hit_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_quality_issues', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      issue_type: { type: DataTypes.STRING(100), allowNull: false },
      severidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
      status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'ABERTA' },
      ...scopeColumns(DataTypes),
      titulo: { type: DataTypes.STRING(180), allowNull: false },
      descricao: { type: DataTypes.TEXT, allowNull: true },
      origem_tipo: { type: DataTypes.STRING(80), allowNull: true },
      origem_id: { type: DataTypes.INTEGER, allowNull: true },
      payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
      resolvido_em: { type: DataTypes.DATE, allowNull: true },
      resolvido_por: { type: DataTypes.INTEGER, allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_governance_logs', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      acao: { type: DataTypes.STRING(100), allowNull: false },
      entidade: { type: DataTypes.STRING(100), allowNull: true },
      entidade_id: { type: DataTypes.INTEGER, allowNull: true },
      criticidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'BAIXA' },
      empresa_id: { type: DataTypes.INTEGER, allowNull: true },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      usuario_id: { type: DataTypes.INTEGER, allowNull: true },
      mensagem: { type: DataTypes.TEXT, allowNull: true },
      payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
      ...auditColumns(DataTypes)
    });

    const indexes = [
      ['sst_jobs', ['queue_name'], 'idx_sst_jobs_queue'],
      ['sst_jobs', ['job_type'], 'idx_sst_jobs_type'],
      ['sst_jobs', ['status'], 'idx_sst_jobs_status'],
      ['sst_jobs', ['next_run_at'], 'idx_sst_jobs_next_run'],
      ['sst_jobs', ['referencia_tipo', 'referencia_id'], 'idx_sst_jobs_referencia'],
      ['sst_queue_metrics', ['queue_name'], 'idx_sst_queue_metrics_queue'],
      ['sst_queue_metrics', ['job_type'], 'idx_sst_queue_metrics_type'],
      ['sst_queue_metrics', ['sampled_at'], 'idx_sst_queue_metrics_sampled'],
      ['sst_performance_metrics', ['metric_name'], 'idx_sst_performance_metric'],
      ['sst_performance_metrics', ['sampled_at'], 'idx_sst_performance_sampled'],
      ['sst_cache_entries', ['namespace', 'cache_key'], 'idx_sst_cache_namespace_key'],
      ['sst_cache_entries', ['expires_at'], 'idx_sst_cache_expires'],
      ['sst_quality_issues', ['issue_type'], 'idx_sst_quality_type'],
      ['sst_quality_issues', ['status'], 'idx_sst_quality_status'],
      ['sst_quality_issues', ['severidade'], 'idx_sst_quality_severidade'],
      ['sst_governance_logs', ['acao'], 'idx_sst_governance_acao'],
      ['sst_governance_logs', ['entidade', 'entidade_id'], 'idx_sst_governance_entidade'],
      ['sst_governance_logs', ['createdAt'], 'idx_sst_governance_created']
    ];

    for (const [tableName, fields, name] of indexes) {
      await addIndexIfMissing(queryInterface, sequelize, tableName, fields, name);
    }
  },

  async down({ queryInterface, sequelize }) {
    const tables = [
      'sst_governance_logs',
      'sst_quality_issues',
      'sst_cache_entries',
      'sst_performance_metrics',
      'sst_queue_metrics',
      'sst_jobs'
    ];
    for (const table of tables) {
      if (await tableExists(sequelize, table)) {
        await queryInterface.dropTable(table);
      }
    }
  }
};
