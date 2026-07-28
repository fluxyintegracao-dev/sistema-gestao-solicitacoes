'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('CrImportacao', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: false },
  plano_id: { type: DataTypes.INTEGER, allowNull: true },
  arquivo_nome: { type: DataTypes.STRING(255), allowNull: false },
  arquivo_hash: { type: DataTypes.STRING(128), allowNull: false },
  linhas_total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  linhas_validas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  linhas_rejeitadas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  resultado_json: { type: DataTypes.JSON, allowNull: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'cr_importacoes',
  timestamps: true,
  indexes: [
    { name: 'uq_cr_importacoes_obra_hash', unique: true, fields: ['obra_id', 'arquivo_hash'] }
  ]
});
