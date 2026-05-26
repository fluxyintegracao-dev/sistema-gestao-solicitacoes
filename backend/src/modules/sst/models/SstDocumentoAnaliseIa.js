'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstDocumentoAnaliseIa', {
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
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_documentos_analises_ia',
  timestamps: true,
  indexes: [
    { fields: ['documento_id'] },
    { fields: ['empresa_id'] },
    { fields: ['obra_id'] },
    { fields: ['colaborador_id'] },
    { fields: ['tipo_documento'] },
    { fields: ['provider'] },
    { fields: ['status'] }
  ]
});
