'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('CrRealizado', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  competencia_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: false },
  etapa_macro_codigo: { type: DataTypes.STRING(80), allowNull: true },
  plano_item_id: { type: DataTypes.INTEGER, allowNull: true },
  titulo_financeiro_id: { type: DataTypes.INTEGER, allowNull: true },
  movimento_financeiro_id: { type: DataTypes.INTEGER, allowNull: false },
  valor: { type: DataTypes.DECIMAL(16, 2), allowNull: false },
  estado: { type: DataTypes.ENUM('COMPROMETIDO', 'INCORRIDO', 'BAIXA_ATIVA', 'NAO_MAPEADO'), allowNull: false },
  processado_em: { type: DataTypes.DATE, allowNull: false }
}, {
  tableName: 'cr_realizados',
  timestamps: true,
  indexes: [
    { name: 'uq_cr_realizados_movimento_item', unique: true, fields: ['movimento_financeiro_id', 'plano_item_id'] },
    { name: 'idx_cr_realizados_obra_competencia_estado', fields: ['obra_id', 'competencia_id', 'estado'] }
  ]
});
