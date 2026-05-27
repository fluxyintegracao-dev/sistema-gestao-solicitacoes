'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('EsocialSoapLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  lote_id: { type: DataTypes.INTEGER, allowNull: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  ambiente: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'restrita' },
  endpoint_hash: { type: DataTypes.STRING(128), allowNull: true },
  operacao: { type: DataTypes.STRING(80), allowNull: false },
  status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'REGISTRADO' },
  protocolo: { type: DataTypes.STRING(120), allowNull: true },
  erro: { type: DataTypes.TEXT, allowNull: true },
  duracao_ms: { type: DataTypes.INTEGER, allowNull: true },
  request_hash: { type: DataTypes.STRING(128), allowNull: true },
  response_hash: { type: DataTypes.STRING(128), allowNull: true },
  metadados_json: { type: DataTypes.TEXT('long'), allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'esocial_soap_logs',
  timestamps: true,
  indexes: [
    { fields: ['lote_id'] },
    { fields: ['status'] },
    { fields: ['ambiente'] },
    { fields: ['operacao'] },
    { fields: ['createdAt'] }
  ]
});
