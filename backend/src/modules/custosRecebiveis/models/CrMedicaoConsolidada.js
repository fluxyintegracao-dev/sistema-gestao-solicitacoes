'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('CrMedicaoConsolidada', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  competencia_id: { type: DataTypes.INTEGER, allowNull: false },
  plano_item_id: { type: DataTypes.INTEGER, allowNull: false },
  quantidade_medida: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
  valor_medido: { type: DataTypes.DECIMAL(16, 2), allowNull: false, defaultValue: 0 },
  valor_glosa: { type: DataTypes.DECIMAL(16, 2), allowNull: false, defaultValue: 0 },
  justificativa_glosa: { type: DataTypes.TEXT, allowNull: true },
  data_medicao: { type: DataTypes.DATEONLY, allowNull: true },
  numero_medicao: { type: DataTypes.STRING(80), allowNull: true },
  registrado_por: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'cr_medicoes_consolidadas',
  timestamps: true,
  indexes: [
    { name: 'uq_cr_medicoes_competencia_item', unique: true, fields: ['competencia_id', 'plano_item_id'] }
  ]
});
