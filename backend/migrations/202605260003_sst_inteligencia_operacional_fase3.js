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

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    await createTableIfMissing(queryInterface, sequelize, 'sst_politicas_bloqueio', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: false },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      setor_id: { type: DataTypes.INTEGER, allowNull: true },
      codigo: { type: DataTypes.STRING(80), allowNull: false },
      nome: { type: DataTypes.STRING(160), allowNull: false },
      tipo_regra: { type: DataTypes.STRING(80), allowNull: false },
      tipo_bloqueio: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'ALERTA' },
      tipo_risco: { type: DataTypes.STRING(80), allowNull: true },
      funcao_alvo: { type: DataTypes.STRING(120), allowNull: true },
      criticidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      parametros_json: { type: DataTypes.TEXT('long'), allowNull: true },
      observacoes: { type: DataTypes.TEXT, allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_bloqueios_operacionais', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: true },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
      politica_id: { type: DataTypes.INTEGER, allowNull: true },
      tipo_bloqueio: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'ALERTA' },
      criticidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
      motivo: { type: DataTypes.TEXT, allowNull: false },
      origem_tipo: { type: DataTypes.STRING(80), allowNull: true },
      origem_id: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ABERTO' },
      resolvido_em: { type: DataTypes.DATE, allowNull: true },
      resolvido_por: { type: DataTypes.INTEGER, allowNull: true },
      payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_notificacoes', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: true },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
      usuario_id: { type: DataTypes.INTEGER, allowNull: true },
      tipo_notificacao: { type: DataTypes.STRING(80), allowNull: false },
      prioridade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'NORMAL' },
      criticidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
      titulo: { type: DataTypes.STRING(180), allowNull: false },
      mensagem: { type: DataTypes.TEXT, allowNull: false },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'NAO_LIDA' },
      agrupador: { type: DataTypes.STRING(120), allowNull: true },
      origem_tipo: { type: DataTypes.STRING(80), allowNull: true },
      origem_id: { type: DataTypes.INTEGER, allowNull: true },
      lida_em: { type: DataTypes.DATE, allowNull: true },
      payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_pendencias_operacionais', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: true },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
      tipo_pendencia: { type: DataTypes.STRING(80), allowNull: false },
      criticidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ABERTA' },
      titulo: { type: DataTypes.STRING(180), allowNull: false },
      descricao: { type: DataTypes.TEXT, allowNull: true },
      origem_tipo: { type: DataTypes.STRING(80), allowNull: true },
      origem_id: { type: DataTypes.INTEGER, allowNull: true },
      responsavel_id: { type: DataTypes.INTEGER, allowNull: true },
      prazo_limite: { type: DataTypes.DATEONLY, allowNull: true },
      resolvida_em: { type: DataTypes.DATE, allowNull: true },
      resolvida_por: { type: DataTypes.INTEGER, allowNull: true },
      payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_compliance_scores', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: true },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
      setor_id: { type: DataTypes.INTEGER, allowNull: true },
      escopo_tipo: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'COLABORADOR' },
      escopo_id: { type: DataTypes.INTEGER, allowNull: true },
      score: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      nivel: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'CRITICO' },
      calculado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      componentes_json: { type: DataTypes.TEXT('long'), allowNull: true },
      pendencias_total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      pendencias_criticas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_criticidades', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: true },
      codigo: { type: DataTypes.STRING(80), allowNull: false },
      nome: { type: DataTypes.STRING(160), allowNull: false },
      nivel: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
      tipo_alvo: { type: DataTypes.STRING(80), allowNull: true },
      peso: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      parametros_json: { type: DataTypes.TEXT('long'), allowNull: true },
      observacoes: { type: DataTypes.TEXT, allowNull: true },
      ...auditColumns(DataTypes)
    });

    await addIndexIfMissing(queryInterface, sequelize, 'sst_politicas_bloqueio', ['empresa_id'], 'idx_sst_politicas_bloqueio_empresa');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_politicas_bloqueio', ['tipo_regra'], 'idx_sst_politicas_bloqueio_tipo');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_bloqueios_operacionais', ['colaborador_id'], 'idx_sst_bloqueios_colaborador');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_bloqueios_operacionais', ['status'], 'idx_sst_bloqueios_status');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_notificacoes', ['status'], 'idx_sst_notificacoes_status');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_notificacoes', ['tipo_notificacao'], 'idx_sst_notificacoes_tipo');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_pendencias_operacionais', ['status'], 'idx_sst_pendencias_status');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_pendencias_operacionais', ['criticidade'], 'idx_sst_pendencias_criticidade');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_compliance_scores', ['escopo_tipo'], 'idx_sst_scores_escopo');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_compliance_scores', ['nivel'], 'idx_sst_scores_nivel');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_criticidades', ['codigo'], 'idx_sst_criticidades_codigo');
  },

  async down({ queryInterface, sequelize }) {
    const tables = [
      'sst_criticidades',
      'sst_compliance_scores',
      'sst_pendencias_operacionais',
      'sst_notificacoes',
      'sst_bloqueios_operacionais',
      'sst_politicas_bloqueio'
    ];
    for (const table of tables) {
      if (await tableExists(sequelize, table)) {
        await queryInterface.dropTable(table);
      }
    }
  }
};
