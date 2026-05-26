'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('EsocialLayoutVersion', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  layout_version: { type: DataTypes.STRING(20), allowNull: false },
  schema_version: { type: DataTypes.STRING(40), allowNull: true },
  source_package: { type: DataTypes.STRING(160), allowNull: true },
  namespace_base: { type: DataTypes.STRING(255), allowNull: true },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  metadados_json: { type: DataTypes.TEXT('long'), allowNull: true }
}, {
  tableName: 'esocial_layout_versions',
  timestamps: true
});
