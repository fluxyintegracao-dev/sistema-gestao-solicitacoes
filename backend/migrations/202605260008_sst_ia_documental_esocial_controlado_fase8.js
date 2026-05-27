'use strict';

const { columnExists, indexExists, tableExists } = require('../src/database/schemaUtils');

async function createTableIfMissing(queryInterface, sequelize, tableName, definition) {
  if (!(await tableExists(sequelize, tableName))) {
    await queryInterface.createTable(tableName, definition);
  }
}

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if ((await tableExists(sequelize, tableName)) && !(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
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
    await addColumnIfMissing(queryInterface, sequelize, 'sst_documentos_analises_ia', 'texto_extraido', { type: DataTypes.TEXT('long'), allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'sst_documentos_analises_ia', 'divergencias_json', { type: DataTypes.TEXT('long'), allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'sst_documentos_analises_ia', 'sugestoes_json', { type: DataTypes.TEXT('long'), allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'sst_documentos_analises_ia', 'aprovado_em', { type: DataTypes.DATE, allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'sst_documentos_analises_ia', 'aprovado_por', { type: DataTypes.INTEGER, allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'sst_documentos_analises_ia', 'rejeitado_em', { type: DataTypes.DATE, allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'sst_documentos_analises_ia', 'rejeitado_por', { type: DataTypes.INTEGER, allowNull: true });

    await createTableIfMissing(queryInterface, sequelize, 'sst_ia_document_logs', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      documento_id: { type: DataTypes.INTEGER, allowNull: true },
      analise_id: { type: DataTypes.INTEGER, allowNull: true },
      provider: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'NAO_CONFIGURADO' },
      status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'REGISTRADO' },
      etapa: { type: DataTypes.STRING(80), allowNull: true },
      duracao_ms: { type: DataTypes.INTEGER, allowNull: true },
      erro: { type: DataTypes.TEXT, allowNull: true },
      payload_redacted_json: { type: DataTypes.TEXT('long'), allowNull: true },
      resposta_json: { type: DataTypes.TEXT('long'), allowNull: true },
      ...scopeColumns(DataTypes),
      ...auditColumns(DataTypes)
    });

    await addColumnIfMissing(queryInterface, sequelize, 'esocial_eventos', 'idempotency_key', { type: DataTypes.STRING(180), allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'esocial_eventos', 'data_referencia', { type: DataTypes.DATEONLY, allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'esocial_eventos', 'xml_hash', { type: DataTypes.STRING(120), allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'esocial_eventos', 'ambiente', { type: DataTypes.STRING(30), allowNull: true });

    await addColumnIfMissing(queryInterface, sequelize, 'esocial_lotes', 'idempotency_key', { type: DataTypes.STRING(180), allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'esocial_lotes', 'xml_lote', { type: DataTypes.TEXT('long'), allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'esocial_lotes', 'xml_lote_assinado', { type: DataTypes.TEXT('long'), allowNull: true });
    await addColumnIfMissing(queryInterface, sequelize, 'esocial_lotes', 'xml_hash', { type: DataTypes.STRING(120), allowNull: true });

    await createTableIfMissing(queryInterface, sequelize, 'esocial_transmission_logs', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      evento_id: { type: DataTypes.INTEGER, allowNull: true },
      lote_id: { type: DataTypes.INTEGER, allowNull: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: true },
      ambiente: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'restrita' },
      acao: { type: DataTypes.STRING(80), allowNull: false },
      status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'REGISTRADO' },
      protocolo: { type: DataTypes.STRING(120), allowNull: true },
      recibo: { type: DataTypes.STRING(120), allowNull: true },
      erro: { type: DataTypes.TEXT, allowNull: true },
      duracao_ms: { type: DataTypes.INTEGER, allowNull: true },
      payload_redacted_json: { type: DataTypes.TEXT('long'), allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'esocial_certificate_logs', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      empresa_id: { type: DataTypes.INTEGER, allowNull: true },
      status: { type: DataTypes.STRING(50), allowNull: false },
      cert_type: { type: DataTypes.STRING(30), allowNull: true },
      subject: { type: DataTypes.STRING(255), allowNull: true },
      issuer: { type: DataTypes.STRING(255), allowNull: true },
      valid_from: { type: DataTypes.DATE, allowNull: true },
      valid_to: { type: DataTypes.DATE, allowNull: true },
      erro: { type: DataTypes.TEXT, allowNull: true },
      payload_redacted_json: { type: DataTypes.TEXT('long'), allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'esocial_xml_validation_logs', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      evento_id: { type: DataTypes.INTEGER, allowNull: true },
      lote_id: { type: DataTypes.INTEGER, allowNull: true },
      tipo_evento: { type: DataTypes.STRING(20), allowNull: true },
      status: { type: DataTypes.STRING(50), allowNull: false },
      schema_path: { type: DataTypes.STRING(255), allowNull: true },
      erros_json: { type: DataTypes.TEXT('long'), allowNull: true },
      xml_hash: { type: DataTypes.STRING(120), allowNull: true },
      duracao_ms: { type: DataTypes.INTEGER, allowNull: true },
      ...auditColumns(DataTypes)
    });

    await createTableIfMissing(queryInterface, sequelize, 'esocial_soap_logs', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      lote_id: { type: DataTypes.INTEGER, allowNull: true },
      ambiente: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'restrita' },
      endpoint: { type: DataTypes.STRING(255), allowNull: true },
      operacao: { type: DataTypes.STRING(80), allowNull: false },
      status: { type: DataTypes.STRING(50), allowNull: false },
      http_status: { type: DataTypes.INTEGER, allowNull: true },
      duracao_ms: { type: DataTypes.INTEGER, allowNull: true },
      erro: { type: DataTypes.TEXT, allowNull: true },
      request_hash: { type: DataTypes.STRING(120), allowNull: true },
      response_hash: { type: DataTypes.STRING(120), allowNull: true },
      payload_redacted_json: { type: DataTypes.TEXT('long'), allowNull: true },
      ...auditColumns(DataTypes)
    });

    await addIndexIfMissing(queryInterface, sequelize, 'sst_ia_document_logs', ['documento_id'], 'idx_sst_ia_logs_documento');
    await addIndexIfMissing(queryInterface, sequelize, 'sst_ia_document_logs', ['status'], 'idx_sst_ia_logs_status');
    await addIndexIfMissing(queryInterface, sequelize, 'esocial_eventos', ['idempotency_key'], 'idx_esocial_eventos_idempotency');
    await addIndexIfMissing(queryInterface, sequelize, 'esocial_lotes', ['idempotency_key'], 'idx_esocial_lotes_idempotency');
    await addIndexIfMissing(queryInterface, sequelize, 'esocial_transmission_logs', ['lote_id'], 'idx_esocial_trans_logs_lote');
    await addIndexIfMissing(queryInterface, sequelize, 'esocial_transmission_logs', ['status'], 'idx_esocial_trans_logs_status');
    await addIndexIfMissing(queryInterface, sequelize, 'esocial_xml_validation_logs', ['evento_id'], 'idx_esocial_xml_logs_evento');
    await addIndexIfMissing(queryInterface, sequelize, 'esocial_soap_logs', ['lote_id'], 'idx_esocial_soap_logs_lote');
  },

  async down() {}
};
