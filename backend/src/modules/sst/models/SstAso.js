'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstAso', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo_exame: { type: DataTypes.STRING(40), allowNull: false },
  apto: { type: DataTypes.BOOLEAN, allowNull: true },
  restricoes: { type: DataTypes.TEXT, allowNull: true },
  data_exame: { type: DataTypes.DATEONLY, allowNull: false },
  validade: { type: DataTypes.DATEONLY, allowNull: true },
  medico: { type: DataTypes.STRING(160), allowNull: true },
  crm: { type: DataTypes.STRING(40), allowNull: true },
  documento_url: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'VALIDO' },
  observacoes: { type: DataTypes.TEXT, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_aso',
  timestamps: true
});
