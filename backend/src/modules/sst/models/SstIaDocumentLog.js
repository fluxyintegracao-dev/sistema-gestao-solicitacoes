'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstIaDocumentLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  documento_id: { type: DataTypes.INTEGER, allowNull: true },
  analise_id: { type: DataTypes.INTEGER, allowNull: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  provider: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'NAO_CONFIGURADO' },
  status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'REGISTRADO' },
  etapa: { type: DataTypes.STRING(80), allowNull: true },
  duracao_ms: { type: DataTypes.INTEGER, allowNull: true },
  erro: { type: DataTypes.TEXT, allowNull: true },
  payload_redacted_json: { type: DataTypes.TEXT('long'), allowNull: true },
  resposta_json: { type: DataTypes.TEXT('long'), allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_ia_document_logs',
  timestamps: true,
  indexes: [
    { fields: ['documento_id'] },
    { fields: ['analise_id'] },
    { fields: ['status'] },
    { fields: ['provider'] },
    { fields: ['createdAt'] }
  ]
});
