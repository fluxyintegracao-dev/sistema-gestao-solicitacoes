'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstBlockingLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  bloqueio_id: { type: DataTypes.INTEGER, allowNull: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  tipo_bloqueio: { type: DataTypes.STRING(40), allowNull: true },
  criticidade: { type: DataTypes.STRING(30), allowNull: true },
  acao: { type: DataTypes.STRING(80), allowNull: false },
  status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'REGISTRADO' },
  mensagem: { type: DataTypes.TEXT, allowNull: true },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  erro: { type: DataTypes.TEXT, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_blocking_logs',
  timestamps: true,
  indexes: [
    { fields: ['bloqueio_id'] },
    { fields: ['empresa_id'] },
    { fields: ['obra_id'] },
    { fields: ['colaborador_id'] },
    { fields: ['status'] },
    { fields: ['criticidade'] }
  ]
});
