'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstOperationalAlert', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tipo_alerta: { type: DataTypes.STRING(100), allowNull: false },
  criticidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  titulo: { type: DataTypes.STRING(180), allowNull: false },
  mensagem: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'ABERTO' },
  origem_tipo: { type: DataTypes.STRING(80), allowNull: true },
  origem_id: { type: DataTypes.INTEGER, allowNull: true },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  resolvido_em: { type: DataTypes.DATE, allowNull: true },
  resolvido_por: { type: DataTypes.INTEGER, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_operational_alerts',
  timestamps: true,
  indexes: [
    { fields: ['tipo_alerta'] },
    { fields: ['criticidade'] },
    { fields: ['status'] },
    { fields: ['empresa_id'] },
    { fields: ['obra_id'] },
    { fields: ['origem_tipo', 'origem_id'] }
  ]
});
