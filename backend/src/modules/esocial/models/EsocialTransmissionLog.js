'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('EsocialTransmissionLog', {
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
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'esocial_transmission_logs',
  timestamps: true,
  indexes: [
    { fields: ['evento_id'] },
    { fields: ['lote_id'] },
    { fields: ['status'] },
    { fields: ['ambiente'] },
    { fields: ['createdAt'] }
  ]
});
