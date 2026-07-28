'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('CrCompetencia', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: false },
  competencia: {
    type: DataTypes.STRING(7),
    allowNull: false,
    validate: { is: /^\d{4}-(0[1-9]|1[0-2])$/ }
  },
  estado: { type: DataTypes.ENUM('ABERTA', 'EM_PREENCHIMENTO', 'FINALIZADA', 'REABERTA'), allowNull: false, defaultValue: 'ABERTA' },
  plano_versao_snapshot: { type: DataTypes.INTEGER, allowNull: true },
  finalizado_por: { type: DataTypes.INTEGER, allowNull: true },
  finalizado_em: { type: DataTypes.DATE, allowNull: true },
  total_custo_previsto: { type: DataTypes.DECIMAL(16, 2), allowNull: false, defaultValue: 0 },
  total_receita_prevista: { type: DataTypes.DECIMAL(16, 2), allowNull: false, defaultValue: 0 }
}, {
  tableName: 'cr_competencias',
  timestamps: true,
  indexes: [
    { name: 'uq_cr_competencias_obra_competencia', unique: true, fields: ['obra_id', 'competencia'] },
    { name: 'idx_cr_competencias_estado', fields: ['estado', 'competencia'] }
  ]
});
