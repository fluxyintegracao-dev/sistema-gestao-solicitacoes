'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('GovernancaAccessLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true },
  acao: { type: DataTypes.STRING(120), allowNull: false },
  ip: { type: DataTypes.STRING(80), allowNull: true },
  user_agent: { type: DataTypes.STRING(500), allowNull: true },
  contexto_json: { type: DataTypes.TEXT('long'), allowNull: true }
}, {
  tableName: 'governanca_access_logs',
  timestamps: true,
  indexes: [
    { fields: ['usuario_id'] },
    { fields: ['acao'] },
    { fields: ['createdAt'] }
  ]
});
