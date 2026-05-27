'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('EsocialEvento', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  layout_version_id: { type: DataTypes.INTEGER, allowNull: true },
  lote_id: { type: DataTypes.INTEGER, allowNull: true },
  origem_modulo: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'SST' },
  origem_tipo: { type: DataTypes.STRING(60), allowNull: true },
  origem_id: { type: DataTypes.INTEGER, allowNull: true },
  tipo_evento: { type: DataTypes.STRING(20), allowNull: false },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'PREPARADO' },
  idempotency_key: { type: DataTypes.STRING(180), allowNull: true },
  data_referencia: { type: DataTypes.DATEONLY, allowNull: true },
  xml_hash: { type: DataTypes.STRING(128), allowNull: true },
  ambiente: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'restrita' },
  xml_original: { type: DataTypes.TEXT('long'), allowNull: true },
  xml_assinado: { type: DataTypes.TEXT('long'), allowNull: true },
  protocolo: { type: DataTypes.STRING(120), allowNull: true },
  recibo: { type: DataTypes.STRING(120), allowNull: true },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  validation_errors_json: { type: DataTypes.TEXT('long'), allowNull: true },
  transmission_blocked_reason: { type: DataTypes.TEXT, allowNull: true },
  preparado_em: { type: DataTypes.DATE, allowNull: true },
  enviado_em: { type: DataTypes.DATE, allowNull: true },
  processado_em: { type: DataTypes.DATE, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'esocial_eventos',
  timestamps: true,
  indexes: [
    { fields: ['empresa_id'] },
    { fields: ['colaborador_id'] },
    { fields: ['tipo_evento'] },
    { fields: ['status'] },
    { fields: ['idempotency_key'] }
  ]
});
