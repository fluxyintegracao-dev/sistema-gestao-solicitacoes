'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('CrPrevisaoCusto', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  competencia_id: { type: DataTypes.INTEGER, allowNull: false },
  plano_item_id: { type: DataTypes.INTEGER, allowNull: false },
  etapa_macro_codigo: { type: DataTypes.STRING(80), allowNull: true },
  quantidade: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
  custo_unitario: { type: DataTypes.DECIMAL(16, 4), allowNull: false, defaultValue: 0 },
  valor_previsto: { type: DataTypes.DECIMAL(16, 2), allowNull: false, defaultValue: 0 },
  parceiro_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'cr_previsoes_custo',
  timestamps: true,
  indexes: [
    { name: 'uq_cr_previsoes_custo_item', unique: true, fields: ['competencia_id', 'plano_item_id'] }
  ]
});
