'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstBloqueioOperacional', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  politica_id: { type: DataTypes.INTEGER, allowNull: true },
  tipo_bloqueio: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'ALERTA' },
  criticidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
  motivo: { type: DataTypes.TEXT, allowNull: false },
  origem_tipo: { type: DataTypes.STRING(80), allowNull: true },
  origem_id: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ABERTO' },
  resolvido_em: { type: DataTypes.DATE, allowNull: true },
  resolvido_por: { type: DataTypes.INTEGER, allowNull: true },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_bloqueios_operacionais',
  timestamps: true,
  indexes: [
    { fields: ['empresa_id'] },
    { fields: ['obra_id'] },
    { fields: ['colaborador_id'] },
    { fields: ['status'] },
    { fields: ['tipo_bloqueio'] }
  ]
});
