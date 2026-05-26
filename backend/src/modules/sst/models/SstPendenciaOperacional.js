'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstPendenciaOperacional', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  tipo_pendencia: { type: DataTypes.STRING(80), allowNull: false },
  criticidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ABERTA' },
  titulo: { type: DataTypes.STRING(180), allowNull: false },
  descricao: { type: DataTypes.TEXT, allowNull: true },
  origem_tipo: { type: DataTypes.STRING(80), allowNull: true },
  origem_id: { type: DataTypes.INTEGER, allowNull: true },
  responsavel_id: { type: DataTypes.INTEGER, allowNull: true },
  prazo_limite: { type: DataTypes.DATEONLY, allowNull: true },
  resolvida_em: { type: DataTypes.DATE, allowNull: true },
  resolvida_por: { type: DataTypes.INTEGER, allowNull: true },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_pendencias_operacionais',
  timestamps: true,
  indexes: [
    { fields: ['empresa_id'] },
    { fields: ['obra_id'] },
    { fields: ['colaborador_id'] },
    { fields: ['status'] },
    { fields: ['tipo_pendencia'] },
    { fields: ['criticidade'] }
  ]
});
