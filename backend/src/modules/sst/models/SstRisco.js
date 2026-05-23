'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstRisco', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  setor_id: { type: DataTypes.INTEGER, allowNull: true },
  funcao_id: { type: DataTypes.INTEGER, allowNull: true },
  nome: { type: DataTypes.STRING(160), allowNull: false },
  categoria: { type: DataTypes.STRING(80), allowNull: true },
  severidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
  probabilidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
  descricao: { type: DataTypes.TEXT, allowNull: true },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_riscos',
  timestamps: true
});
