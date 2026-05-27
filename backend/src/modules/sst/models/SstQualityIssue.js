'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstQualityIssue', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  issue_type: { type: DataTypes.STRING(100), allowNull: false },
  severidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
  status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'ABERTA' },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  titulo: { type: DataTypes.STRING(180), allowNull: false },
  descricao: { type: DataTypes.TEXT, allowNull: true },
  origem_tipo: { type: DataTypes.STRING(80), allowNull: true },
  origem_id: { type: DataTypes.INTEGER, allowNull: true },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  resolvido_em: { type: DataTypes.DATE, allowNull: true },
  resolvido_por: { type: DataTypes.INTEGER, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_quality_issues',
  timestamps: true,
  indexes: [
    { fields: ['issue_type'] },
    { fields: ['status'] },
    { fields: ['severidade'] }
  ]
});
