'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('GovernancaSnapshot', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  data_referencia: { type: DataTypes.DATEONLY, allowNull: false },
  usuarios_ativos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  processos_abertos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  processos_concluidos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  documentos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  modulos_ativos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  empresas_ativas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  obras_ativas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  metricas_json: { type: DataTypes.TEXT('long'), allowNull: true }
}, {
  tableName: 'governanca_snapshots',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['data_referencia'] }
  ]
});
