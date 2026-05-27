'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstGovernanceLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  acao: { type: DataTypes.STRING(100), allowNull: false },
  entidade: { type: DataTypes.STRING(100), allowNull: true },
  entidade_id: { type: DataTypes.INTEGER, allowNull: true },
  criticidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'BAIXA' },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true },
  mensagem: { type: DataTypes.TEXT, allowNull: true },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_governance_logs',
  timestamps: true,
  indexes: [
    { fields: ['acao'] },
    { fields: ['entidade', 'entidade_id'] },
    { fields: ['createdAt'] }
  ]
});
