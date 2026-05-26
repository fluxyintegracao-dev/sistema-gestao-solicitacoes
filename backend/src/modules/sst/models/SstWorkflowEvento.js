'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstWorkflowEvento', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  execucao_id: { type: DataTypes.INTEGER, allowNull: true },
  workflow_id: { type: DataTypes.INTEGER, allowNull: true },
  evento_operacional_id: { type: DataTypes.INTEGER, allowNull: true },
  tipo_evento: { type: DataTypes.STRING(100), allowNull: false },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'REGISTRADO' },
  mensagem: { type: DataTypes.TEXT, allowNull: true },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_workflow_eventos',
  timestamps: true,
  indexes: [
    { fields: ['execucao_id'] },
    { fields: ['workflow_id'] },
    { fields: ['evento_operacional_id'] },
    { fields: ['tipo_evento'] },
    { fields: ['status'] }
  ]
});
