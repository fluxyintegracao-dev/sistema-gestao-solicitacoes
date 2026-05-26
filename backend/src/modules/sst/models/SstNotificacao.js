'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstNotificacao', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true },
  tipo_notificacao: { type: DataTypes.STRING(80), allowNull: false },
  prioridade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'NORMAL' },
  criticidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
  titulo: { type: DataTypes.STRING(180), allowNull: false },
  mensagem: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'NAO_LIDA' },
  agrupador: { type: DataTypes.STRING(120), allowNull: true },
  origem_tipo: { type: DataTypes.STRING(80), allowNull: true },
  origem_id: { type: DataTypes.INTEGER, allowNull: true },
  lida_em: { type: DataTypes.DATE, allowNull: true },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_notificacoes',
  timestamps: true,
  indexes: [
    { fields: ['empresa_id'] },
    { fields: ['obra_id'] },
    { fields: ['colaborador_id'] },
    { fields: ['usuario_id'] },
    { fields: ['status'] },
    { fields: ['tipo_notificacao'] }
  ]
});
