'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstAmbienteTrabalho', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  setor_id: { type: DataTypes.INTEGER, allowNull: true },
  nome: { type: DataTypes.STRING(160), allowNull: false },
  tipo_ambiente: { type: DataTypes.STRING(60), allowNull: true },
  descricao: { type: DataTypes.TEXT, allowNull: true },
  local_amb: { type: DataTypes.STRING(60), allowNull: true },
  esocial_tp_insc: { type: DataTypes.STRING(10), allowNull: true },
  esocial_nr_insc: { type: DataTypes.STRING(30), allowNull: true },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_ambientes_trabalho',
  timestamps: true
});
