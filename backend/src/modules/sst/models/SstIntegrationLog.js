'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstIntegrationLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  integracao: { type: DataTypes.STRING(80), allowNull: false },
  tipo_evento: { type: DataTypes.STRING(100), allowNull: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  origem_tipo: { type: DataTypes.STRING(80), allowNull: true },
  origem_id: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'REGISTRADO' },
  mensagem: { type: DataTypes.TEXT, allowNull: true },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  erro: { type: DataTypes.TEXT, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_integration_logs',
  timestamps: true,
  indexes: [
    { fields: ['integracao'] },
    { fields: ['tipo_evento'] },
    { fields: ['empresa_id'] },
    { fields: ['obra_id'] },
    { fields: ['colaborador_id'] },
    { fields: ['status'] }
  ]
});
