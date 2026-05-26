'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstComplianceScore', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  setor_id: { type: DataTypes.INTEGER, allowNull: true },
  escopo_tipo: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'COLABORADOR' },
  escopo_id: { type: DataTypes.INTEGER, allowNull: true },
  score: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  nivel: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'CRITICO' },
  calculado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  componentes_json: { type: DataTypes.TEXT('long'), allowNull: true },
  pendencias_total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  pendencias_criticas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_compliance_scores',
  timestamps: true,
  indexes: [
    { fields: ['empresa_id'] },
    { fields: ['obra_id'] },
    { fields: ['colaborador_id'] },
    { fields: ['escopo_tipo'] },
    { fields: ['nivel'] }
  ]
});
