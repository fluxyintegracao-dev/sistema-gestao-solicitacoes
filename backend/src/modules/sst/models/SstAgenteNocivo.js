'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstAgenteNocivo', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  risco_id: { type: DataTypes.INTEGER, allowNull: true },
  tipo_agente: { type: DataTypes.STRING(80), allowNull: false },
  nome: { type: DataTypes.STRING(160), allowNull: false },
  intensidade: { type: DataTypes.STRING(60), allowNull: true },
  unidade: { type: DataTypes.STRING(30), allowNull: true },
  tecnica_avaliacao: { type: DataTypes.STRING(160), allowNull: true },
  limite_tolerancia: { type: DataTypes.STRING(80), allowNull: true },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_agentes_nocivos',
  timestamps: true
});
