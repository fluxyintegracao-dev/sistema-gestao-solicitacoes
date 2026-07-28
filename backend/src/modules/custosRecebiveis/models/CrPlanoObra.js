'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('CrPlanoObra', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: false },
  versao: { type: DataTypes.INTEGER, allowNull: false },
  situacao: { type: DataTypes.ENUM('RASCUNHO', 'PUBLICADA', 'SUBSTITUIDA'), allowNull: false, defaultValue: 'RASCUNHO' },
  motivo_versao: { type: DataTypes.TEXT, allowNull: true },
  total_micro: { type: DataTypes.DECIMAL(16, 2), allowNull: false, defaultValue: 0 },
  divergencia_macro_pct: { type: DataTypes.DECIMAL(7, 4), allowNull: true },
  publicado_por: { type: DataTypes.INTEGER, allowNull: true },
  publicado_em: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'cr_planos_obra',
  timestamps: true,
  indexes: [
    { name: 'uq_cr_planos_obra_versao', unique: true, fields: ['obra_id', 'versao'] },
    { name: 'idx_cr_planos_obra_situacao', fields: ['obra_id', 'situacao'] }
  ]
});
