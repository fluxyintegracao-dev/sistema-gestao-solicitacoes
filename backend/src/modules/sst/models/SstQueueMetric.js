'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstQueueMetric', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  queue_name: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'sst-default' },
  job_type: { type: DataTypes.STRING(100), allowNull: true },
  pending_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  processing_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  success_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  error_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  dead_letter_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  avg_duration_ms: { type: DataTypes.INTEGER, allowNull: true },
  sampled_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_queue_metrics',
  timestamps: true,
  indexes: [
    { fields: ['queue_name'] },
    { fields: ['job_type'] },
    { fields: ['sampled_at'] }
  ]
});
