'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstWorkflow', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  codigo: { type: DataTypes.STRING(100), allowNull: false },
  nome: { type: DataTypes.STRING(180), allowNull: false },
  descricao: { type: DataTypes.TEXT, allowNull: true },
  gatilho_evento: { type: DataTypes.STRING(100), allowNull: false },
  escopo: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'CORPORATIVO' },
  prioridade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'NORMAL' },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  regras_json: { type: DataTypes.TEXT('long'), allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_workflows',
  timestamps: true,
  indexes: [
    { fields: ['empresa_id'] },
    { fields: ['obra_id'] },
    { fields: ['codigo'] },
    { fields: ['gatilho_evento'] },
    { fields: ['ativo'] }
  ]
});
