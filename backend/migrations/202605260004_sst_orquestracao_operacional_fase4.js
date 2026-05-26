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
    await createTableIfMissing(queryInterface, sequelize, 'sst_workflows', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: true },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      codigo: { type: DataTypes.STRING(100), allowNull: false },
      nome: { type: DataTypes.STRING(180), allowNull: false },
      descricao: { type: DataTypes.TEXT, allowNull: true },
      gatilho_evento: { type: DataTypes.STRING(100), allowNull: false },
      escopo: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'CORPORATIVO' },
      prioridade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'NORMAL' },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      regras_json: { type: DataTypes.TEXT('long'), allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_workflow_execucoes', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      workflow_id: { type: DataTypes.INTEGER, allowNull: true },
      evento_id: { type: DataTypes.INTEGER, allowNull: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: true },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'PENDENTE' },
      resultado: { type: DataTypes.STRING(60), allowNull: true },
      iniciado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      finalizado_em: { type: DataTypes.DATE, allowNull: true },
      payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
      erro: { type: DataTypes.TEXT, allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_workflow_acoes', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      workflow_id: { type: DataTypes.INTEGER, allowNull: false },
      codigo: { type: DataTypes.STRING(100), allowNull: false },
      nome: { type: DataTypes.STRING(180), allowNull: false },
      tipo_acao: { type: DataTypes.STRING(80), allowNull: false },
      ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      parametros_json: { type: DataTypes.TEXT('long'), allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_workflow_eventos', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      execucao_id: { type: DataTypes.INTEGER, allowNull: true },
      workflow_id: { type: DataTypes.INTEGER, allowNull: true },
      evento_operacional_id: { type: DataTypes.INTEGER, allowNull: true },
      tipo_evento: { type: DataTypes.STRING(100), allowNull: false },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'REGISTRADO' },
      mensagem: { type: DataTypes.TEXT, allowNull: true },
      payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_recomendacoes_operacionais', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: true },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
      tipo_recomendacao: { type: DataTypes.STRING(80), allowNull: false },
      criticidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
      titulo: { type: DataTypes.STRING(180), allowNull: false },
      descricao: { type: DataTypes.TEXT, allowNull: false },
      acao_sugerida: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ABERTA' },
      origem_tipo: { type: DataTypes.STRING(80), allowNull: true },
      origem_id: { type: DataTypes.INTEGER, allowNull: true },
      payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'sst_documentos_analises_ia', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      documento_id: { type: DataTypes.INTEGER, allowNull: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: true },
      obra_id: { type: DataTypes.INTEGER, allowNull: true },
      colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
      tipo_documento: { type: DataTypes.STRING(80), allowNull: false },
      provider: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'NAO_CONFIGURADO' },
      status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'PENDENTE_PROVIDER' },
      confianca: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      dados_extraidos_json: { type: DataTypes.TEXT('long'), allowNull: true },
      inconsistencias_json: { type: DataTypes.TEXT('long'), allowNull: true },
      observacoes: { type: DataTypes.TEXT, allowNull: true },
      processado_em: { type: DataTypes.DATE, allowNull: true },
      ...auditColumns(DataTypes)
    });

    await addIndexIfMissing(queryInterface, sequelize, 'sst_workflows', ['gatilho_evento'], 'idx_sst_workflows_gatilho');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_workflows', ['ativo'], 'idx_sst_workflows_ativo');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_workflow_execucoes', ['status'], 'idx_sst_workflow_execucoes_status');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_workflow_execucoes', ['colaborador_id'], 'idx_sst_workflow_execucoes_colaborador');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_workflow_acoes', ['workflow_id'], 'idx_sst_workflow_acoes_workflow');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_workflow_eventos', ['tipo_evento'], 'idx_sst_workflow_eventos_tipo');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_recomendacoes_operacionais', ['status'], 'idx_sst_recomendacoes_status');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_recomendacoes_operacionais', ['criticidade'], 'idx_sst_recomendacoes_criticidade');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_documentos_analises_ia', ['documento_id'], 'idx_sst_doc_ia_documento');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_documentos_analises_ia', ['status'], 'idx_sst_doc_ia_status');
  },

  async down({ queryInterface, sequelize }) {
    const tables = [
      'sst_documentos_analises_ia',
      'sst_recomendacoes_operacionais',
      'sst_workflow_eventos',
      'sst_workflow_acoes',
      'sst_workflow_execucoes',
      'sst_workflows'
    ];
    for (const table of tables) {
      if (await tableExists(sequelize, table)) {
        await queryInterface.dropTable(table);
      }
    }
  }
};
