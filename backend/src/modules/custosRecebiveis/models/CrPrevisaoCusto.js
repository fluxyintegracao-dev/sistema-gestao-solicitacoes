'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('CrPrevisaoCusto', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  competencia_id: { type: DataTypes.INTEGER, allowNull: false },
  plano_item_id: { type: DataTypes.INTEGER, allowNull: true },
  etapa_macro_codigo: { type: DataTypes.STRING(80), allowNull: true },
  descricao: { type: DataTypes.STRING(500), allowNull: true },
  unidade: { type: DataTypes.STRING(30), allowNull: true },
  ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  chave_local: { type: DataTypes.STRING(80), allowNull: true },
  quantidade: { type: DataTypes.DECIMAL(18, 4), allowNull: false, defaultValue: 0 },
  custo_unitario: { type: DataTypes.DECIMAL(16, 4), allowNull: false, defaultValue: 0 },
  valor_previsto: { type: DataTypes.DECIMAL(16, 2), allowNull: false, defaultValue: 0 },
  parceiro_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'cr_previsoes_custo',
  timestamps: true,
  indexes: [
    { name: 'uq_cr_previsoes_custo_item', unique: true, fields: ['competencia_id', 'plano_item_id'] },
    { name: 'uq_cr_previsoes_custo_chave_local', unique: true, fields: ['competencia_id', 'chave_local'] },
    { name: 'idx_cr_previsoes_custo_macro_ordem', fields: ['competencia_id', 'etapa_macro_codigo', 'ordem'] }
  ]
});
