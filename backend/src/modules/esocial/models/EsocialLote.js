'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('EsocialLote', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  layout_version_id: { type: DataTypes.INTEGER, allowNull: true },
  ambiente: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'NAO_CONFIGURADO' },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'RASCUNHO' },
  idempotency_key: { type: DataTypes.STRING(180), allowNull: true },
  xml_lote: { type: DataTypes.TEXT('long'), allowNull: true },
  xml_lote_assinado: { type: DataTypes.TEXT('long'), allowNull: true },
  xml_hash: { type: DataTypes.STRING(128), allowNull: true },
  protocolo: { type: DataTypes.STRING(120), allowNull: true },
  lote_identificador: { type: DataTypes.STRING(120), allowNull: true },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  enviado_em: { type: DataTypes.DATE, allowNull: true },
  processado_em: { type: DataTypes.DATE, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'esocial_lotes',
  timestamps: true,
  indexes: [
    { fields: ['empresa_id'] },
    { fields: ['ambiente'] },
    { fields: ['status'] },
    { fields: ['idempotency_key'] }
  ]
});
