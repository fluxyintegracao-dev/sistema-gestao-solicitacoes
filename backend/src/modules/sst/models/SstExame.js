'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstExame', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: false },
  aso_id: { type: DataTypes.INTEGER, allowNull: true },
  tipo_exame: { type: DataTypes.STRING(40), allowNull: false },
  nome_exame: { type: DataTypes.STRING(160), allowNull: false },
  data_exame: { type: DataTypes.DATEONLY, allowNull: true },
  validade: { type: DataTypes.DATEONLY, allowNull: true },
  resultado: { type: DataTypes.STRING(80), allowNull: true },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'PENDENTE' },
  documento_url: { type: DataTypes.TEXT, allowNull: true },
  observacoes: { type: DataTypes.TEXT, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_exames',
  timestamps: true
});
