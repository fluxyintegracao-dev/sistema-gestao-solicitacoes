'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('CrPlanoItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  plano_id: { type: DataTypes.INTEGER, allowNull: false },
  codigo: { type: DataTypes.STRING(80), allowNull: false },
  descricao: { type: DataTypes.STRING(500), allowNull: false },
  unidade: { type: DataTypes.STRING(30), allowNull: true },
  quantidade: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
  custo_unitario: { type: DataTypes.DECIMAL(16, 4), allowNull: false, defaultValue: 0 },
  valor_total: { type: DataTypes.DECIMAL(16, 2), allowNull: false, defaultValue: 0 },
  etapa_macro_codigo: { type: DataTypes.STRING(80), allowNull: true },
  item_pai_id: { type: DataTypes.INTEGER, allowNull: true },
  somadora: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
}, {
  tableName: 'cr_plano_itens',
  timestamps: true,
  indexes: [
    { name: 'uq_cr_plano_itens_codigo', unique: true, fields: ['plano_id', 'codigo'] },
    { name: 'idx_cr_plano_itens_macro', fields: ['plano_id', 'etapa_macro_codigo'] }
  ]
});
