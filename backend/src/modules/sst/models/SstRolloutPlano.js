'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstRolloutPlano', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo: { type: DataTypes.STRING(80), allowNull: false },
  nome: { type: DataTypes.STRING(160), allowNull: false },
  descricao: { type: DataTypes.TEXT, allowNull: true },
  escopo_tipo: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'PILOTO' },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  setor_id: { type: DataTypes.INTEGER, allowNull: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true },
  grupo_piloto: { type: DataTypes.STRING(120), allowNull: true },
  status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'PLANEJADO' },
  percentual_ativacao: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
  flags_json: { type: DataTypes.TEXT('long'), allowNull: true },
  criterios_json: { type: DataTypes.TEXT('long'), allowNull: true },
  iniciado_em: { type: DataTypes.DATE, allowNull: true },
  encerrado_em: { type: DataTypes.DATE, allowNull: true },
  rollback_em: { type: DataTypes.DATE, allowNull: true },
  rollback_motivo: { type: DataTypes.TEXT, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_rollout_planos',
  timestamps: true,
  indexes: [
    { fields: ['codigo'] },
    { fields: ['status'] },
    { fields: ['escopo_tipo'] },
    { fields: ['empresa_id'] },
    { fields: ['obra_id'] }
  ]
});
