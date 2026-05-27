'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstHardeningPolicy', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo: { type: DataTypes.STRING(80), allowNull: false },
  nome: { type: DataTypes.STRING(160), allowNull: false },
  tipo_alvo: { type: DataTypes.STRING(80), allowNull: false },
  timeout_ms: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30000 },
  max_retries: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  cooldown_minutos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
  circuit_breaker_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  parametros_json: { type: DataTypes.TEXT('long'), allowNull: true },
  observacoes: { type: DataTypes.TEXT, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_hardening_policies',
  timestamps: true,
  indexes: [
    { fields: ['codigo'] },
    { fields: ['tipo_alvo'] },
    { fields: ['ativo'] }
  ]
});
