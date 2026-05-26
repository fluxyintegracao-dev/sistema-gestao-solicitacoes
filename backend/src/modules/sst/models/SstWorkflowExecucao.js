'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstWorkflowExecucao', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  workflow_id: { type: DataTypes.INTEGER, allowNull: true },
  evento_id: { type: DataTypes.INTEGER, allowNull: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'PENDENTE' },
  resultado: { type: DataTypes.STRING(60), allowNull: true },
  iniciado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  finalizado_em: { type: DataTypes.DATE, allowNull: true },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  erro: { type: DataTypes.TEXT, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_workflow_execucoes',
  timestamps: true,
  indexes: [
    { fields: ['workflow_id'] },
    { fields: ['evento_id'] },
    { fields: ['empresa_id'] },
    { fields: ['obra_id'] },
    { fields: ['colaborador_id'] },
    { fields: ['status'] }
  ]
});
