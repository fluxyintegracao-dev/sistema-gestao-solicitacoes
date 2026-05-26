'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstCriticidade', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  codigo: { type: DataTypes.STRING(80), allowNull: false },
  nome: { type: DataTypes.STRING(160), allowNull: false },
  nivel: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'MEDIA' },
  tipo_alvo: { type: DataTypes.STRING(80), allowNull: true },
  peso: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  parametros_json: { type: DataTypes.TEXT('long'), allowNull: true },
  observacoes: { type: DataTypes.TEXT, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_criticidades',
  timestamps: true,
  indexes: [
    { fields: ['empresa_id'] },
    { fields: ['codigo'] },
    { fields: ['nivel'] },
    { fields: ['ativo'] }
  ]
});
