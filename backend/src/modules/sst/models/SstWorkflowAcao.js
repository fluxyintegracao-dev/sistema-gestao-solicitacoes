'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstWorkflowAcao', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  workflow_id: { type: DataTypes.INTEGER, allowNull: false },
  codigo: { type: DataTypes.STRING(100), allowNull: false },
  nome: { type: DataTypes.STRING(180), allowNull: false },
  tipo_acao: { type: DataTypes.STRING(80), allowNull: false },
  ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  parametros_json: { type: DataTypes.TEXT('long'), allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_workflow_acoes',
  timestamps: true,
  indexes: [
    { fields: ['workflow_id'] },
    { fields: ['tipo_acao'] },
    { fields: ['ativo'] }
  ]
});
