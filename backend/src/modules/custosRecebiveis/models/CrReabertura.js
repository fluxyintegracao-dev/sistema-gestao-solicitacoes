'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('CrReabertura', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  competencia_id: { type: DataTypes.INTEGER, allowNull: false },
  solicitado_por: { type: DataTypes.INTEGER, allowNull: false },
  motivo: { type: DataTypes.TEXT, allowNull: false },
  situacao: { type: DataTypes.ENUM('SOLICITADA', 'APROVADA', 'NEGADA'), allowNull: false, defaultValue: 'SOLICITADA' },
  aprovado_por: { type: DataTypes.INTEGER, allowNull: true },
  aprovado_em: { type: DataTypes.DATE, allowNull: true },
  expira_em: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'cr_reaberturas',
  timestamps: true,
  indexes: [
    { name: 'idx_cr_reaberturas_competencia_situacao', fields: ['competencia_id', 'situacao'] }
  ]
});
