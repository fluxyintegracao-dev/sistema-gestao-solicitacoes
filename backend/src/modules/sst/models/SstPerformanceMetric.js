'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstPerformanceMetric', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  metric_name: { type: DataTypes.STRING(100), allowNull: false },
  scope_type: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'SISTEMA' },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  value: { type: DataTypes.DECIMAL(14, 4), allowNull: false, defaultValue: 0 },
  unit: { type: DataTypes.STRING(30), allowNull: true },
  sampled_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_performance_metrics',
  timestamps: true,
  indexes: [
    { fields: ['metric_name'] },
    { fields: ['sampled_at'] },
    { fields: ['empresa_id'] },
    { fields: ['obra_id'] }
  ]
});
