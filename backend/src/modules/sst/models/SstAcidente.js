'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstAcidente', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  tipo: { type: DataTypes.STRING(60), allowNull: false },
  gravidade: { type: DataTypes.STRING(40), allowNull: false },
  local: { type: DataTypes.STRING(180), allowNull: true },
  data_ocorrencia: { type: DataTypes.DATEONLY, allowNull: false },
  descricao: { type: DataTypes.TEXT, allowNull: false },
  afastamento: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  dias_afastamento: { type: DataTypes.INTEGER, allowNull: true },
  cat_emitida: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  cat_url: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'REGISTRADO' },
  observacoes: { type: DataTypes.TEXT, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_acidentes',
  timestamps: true
});
