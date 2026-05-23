'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstHistorico', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  recurso: { type: DataTypes.STRING(60), allowNull: false },
  recurso_id: { type: DataTypes.INTEGER, allowNull: true },
  acao: { type: DataTypes.STRING(40), allowNull: false },
  resumo: { type: DataTypes.TEXT, allowNull: true },
  antes: { type: DataTypes.TEXT('long'), allowNull: true },
  depois: { type: DataTypes.TEXT('long'), allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_historicos',
  timestamps: true
});
