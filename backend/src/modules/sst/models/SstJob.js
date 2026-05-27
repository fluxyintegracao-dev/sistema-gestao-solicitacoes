'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstJob', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  queue_name: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'sst-default' },
  job_type: { type: DataTypes.STRING(100), allowNull: false },
  status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'PENDENTE' },
  prioridade: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  max_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
  next_run_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  started_at: { type: DataTypes.DATE, allowNull: true },
  finished_at: { type: DataTypes.DATE, allowNull: true },
  locked_at: { type: DataTypes.DATE, allowNull: true },
  locked_by: { type: DataTypes.STRING(120), allowNull: true },
  duracao_ms: { type: DataTypes.INTEGER, allowNull: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  referencia_tipo: { type: DataTypes.STRING(80), allowNull: true },
  referencia_id: { type: DataTypes.INTEGER, allowNull: true },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  result_json: { type: DataTypes.TEXT('long'), allowNull: true },
  last_error: { type: DataTypes.TEXT, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_jobs',
  timestamps: true,
  indexes: [
    { fields: ['queue_name'] },
    { fields: ['job_type'] },
    { fields: ['status'] },
    { fields: ['next_run_at'] },
    { fields: ['referencia_tipo', 'referencia_id'] }
  ]
});
