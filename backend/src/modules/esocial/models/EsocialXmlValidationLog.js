'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('EsocialXmlValidationLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  evento_id: { type: DataTypes.INTEGER, allowNull: true },
  lote_id: { type: DataTypes.INTEGER, allowNull: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  tipo_evento: { type: DataTypes.STRING(20), allowNull: true },
  layout_version: { type: DataTypes.STRING(20), allowNull: true },
  schema_version: { type: DataTypes.STRING(40), allowNull: true },
  status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'REGISTRADO' },
  erros_json: { type: DataTypes.TEXT('long'), allowNull: true },
  xml_hash: { type: DataTypes.STRING(128), allowNull: true },
  duracao_ms: { type: DataTypes.INTEGER, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'esocial_xml_validation_logs',
  timestamps: true,
  indexes: [
    { fields: ['evento_id'] },
    { fields: ['lote_id'] },
    { fields: ['status'] },
    { fields: ['tipo_evento'] },
    { fields: ['createdAt'] }
  ]
});
