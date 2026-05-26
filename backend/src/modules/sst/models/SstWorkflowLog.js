'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstWorkflowLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  workflow_id: { type: DataTypes.INTEGER, allowNull: true },
  execucao_id: { type: DataTypes.INTEGER, allowNull: true },
  evento_id: { type: DataTypes.INTEGER, allowNull: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  acao: { type: DataTypes.STRING(80), allowNull: false },
  status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'REGISTRADO' },
  mensagem: { type: DataTypes.TEXT, allowNull: true },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  erro: { type: DataTypes.TEXT, allowNull: true },
  duracao_ms: { type: DataTypes.INTEGER, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_workflow_logs',
  timestamps: true,
  indexes: [
    { fields: ['workflow_id'] },
    { fields: ['execucao_id'] },
    { fields: ['evento_id'] },
    { fields: ['empresa_id'] },
    { fields: ['obra_id'] },
    { fields: ['colaborador_id'] },
    { fields: ['status'] },
    { fields: ['acao'] }
  ]
});
