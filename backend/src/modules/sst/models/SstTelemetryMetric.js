'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstTelemetryMetric', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tipo_metrica: { type: DataTypes.STRING(100), allowNull: false },
  escopo_tipo: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'SISTEMA' },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  referencia_tipo: { type: DataTypes.STRING(80), allowNull: true },
  referencia_id: { type: DataTypes.INTEGER, allowNull: true },
  valor: { type: DataTypes.DECIMAL(14, 4), allowNull: true },
  unidade: { type: DataTypes.STRING(30), allowNull: true },
  status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'REGISTRADO' },
  duracao_ms: { type: DataTypes.INTEGER, allowNull: true },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_telemetry_metrics',
  timestamps: true,
  indexes: [
    { fields: ['tipo_metrica'] },
    { fields: ['status'] },
    { fields: ['empresa_id'] },
    { fields: ['obra_id'] },
    { fields: ['referencia_tipo', 'referencia_id'] }
  ]
});
