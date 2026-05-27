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
    await createTableIfMissing(queryInterface, sequelize, 'sst_rollout_planos', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: DataTypes.STRING(80), allowNull: false },
      nome: { type: DataTypes.STRING(160), allowNull: false },
      descricao: { type: DataTypes.TEXT, allowNull: true },
      escopo_tipo: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'PILOTO' },
      empresa_id: { type: DataTypes.INTEGER, allowNull: true },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      setor_id: { type: DataTypes.INTEGER, allowNull: true },
      usuario_id: { type: DataTypes.INTEGER, allowNull: true },
      grupo_piloto: { type: DataTypes.STRING(120), allowNull: true },
      status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'PLANEJADO' },
      percentual_ativacao: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      flags_json: { type: DataTypes.TEXT('long'), allowNull: true },
      criterios_json: { type: DataTypes.TEXT('long'), allowNull: true },
      iniciado_em: { type: DataTypes.DATE, allowNull: true },
      encerrado_em: { type: DataTypes.DATE, allowNull: true },
      rollback_em: { type: DataTypes.DATE, allowNull: true },
      rollback_motivo: { type: DataTypes.TEXT, allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_telemetry_metrics', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tipo_metrica: { type: DataTypes.STRING(100), allowNull: false },
      escopo_tipo: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'SISTEMA' },
      ...scopeColumns(DataTypes),
      referencia_tipo: { type: DataTypes.STRING(80), allowNull: true },
      referencia_id: { type: DataTypes.INTEGER, allowNull: true },
      valor: { type: DataTypes.DECIMAL(14, 4), allowNull: true },
      unidade: { type: DataTypes.STRING(30), allowNull: true },
      status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'REGISTRADO' },
      duracao_ms: { type: DataTypes.INTEGER, allowNull: true },
      payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_operational_alerts', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tipo_alerta: { type: DataTypes.STRING(100), allowNull: false },
      criticidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
      empresa_id: { type: DataTypes.INTEGER, allowNull: true },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
      titulo: { type: DataTypes.STRING(180), allowNull: false },
      mensagem: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'ABERTO' },
      origem_tipo: { type: DataTypes.STRING(80), allowNull: true },
      origem_id: { type: DataTypes.INTEGER, allowNull: true },
      payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
      resolvido_em: { type: DataTypes.DATE, allowNull: true },
      resolvido_por: { type: DataTypes.INTEGER, allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_hardening_policies', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      codigo: { type: DataTypes.STRING(80), allowNull: false },
      nome: { type: DataTypes.STRING(160), allowNull: false },
      tipo_alvo: { type: DataTypes.STRING(80), allowNull: false },
      timeout_ms: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30000 },
      max_retries: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      cooldown_minutos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
      circuit_breaker_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      parametros_json: { type: DataTypes.TEXT('long'), allowNull: true },
      observacoes: { type: DataTypes.TEXT, allowNull: true },
      ...auditColumns(DataTypes)
    });

    const indexes = [
      ['sst_rollout_planos', ['codigo'], 'idx_sst_rollout_planos_codigo'],
      ['sst_rollout_planos', ['status'], 'idx_sst_rollout_planos_status'],
      ['sst_rollout_planos', ['escopo_tipo'], 'idx_sst_rollout_planos_escopo'],
      ['sst_rollout_planos', ['empresa_id'], 'idx_sst_rollout_planos_empresa'],
      ['sst_rollout_planos', ['obra_id'], 'idx_sst_rollout_planos_obra'],
      ['sst_telemetry_metrics', ['tipo_metrica'], 'idx_sst_telemetry_tipo'],
      ['sst_telemetry_metrics', ['status'], 'idx_sst_telemetry_status'],
      ['sst_telemetry_metrics', ['referencia_tipo', 'referencia_id'], 'idx_sst_telemetry_referencia'],
      ['sst_operational_alerts', ['tipo_alerta'], 'idx_sst_alerts_tipo'],
      ['sst_operational_alerts', ['criticidade'], 'idx_sst_alerts_criticidade'],
      ['sst_operational_alerts', ['status'], 'idx_sst_alerts_status'],
      ['sst_operational_alerts', ['origem_tipo', 'origem_id'], 'idx_sst_alerts_origem'],
      ['sst_hardening_policies', ['codigo'], 'idx_sst_hardening_codigo'],
      ['sst_hardening_policies', ['tipo_alvo'], 'idx_sst_hardening_tipo_alvo'],
      ['sst_hardening_policies', ['ativo'], 'idx_sst_hardening_ativo']
    ];

    for (const [tableName, fields, name] of indexes) {
      await addIndexIfMissing(queryInterface, sequelize, tableName, fields, name);
    }
  },

  async down({ queryInterface, sequelize }) {
    const tables = [
      'sst_hardening_policies',
      'sst_operational_alerts',
      'sst_telemetry_metrics',
      'sst_rollout_planos'
    ];
    for (const table of tables) {
      if (await tableExists(sequelize, table)) {
        await queryInterface.dropTable(table);
      }
    }
  }
};
