'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('CrPlanoMacroVinculo', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  plano_item_id: { type: DataTypes.INTEGER, allowNull: false },
  apropriacao_id: { type: DataTypes.INTEGER, allowNull: false },
  observacao: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'cr_plano_macro_vinculos',
  timestamps: true,
  indexes: [
    { name: 'uq_cr_plano_macro_vinculos', unique: true, fields: ['plano_item_id', 'apropriacao_id'] },
    { name: 'idx_cr_plano_macro_apropriacao', fields: ['apropriacao_id'] }
  ]
});
