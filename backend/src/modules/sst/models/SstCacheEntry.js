'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstCacheEntry', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  namespace: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'sst' },
  cache_key: { type: DataTypes.STRING(180), allowNull: false },
  value_json: { type: DataTypes.TEXT('long'), allowNull: true },
  tags_json: { type: DataTypes.TEXT('long'), allowNull: true },
  expires_at: { type: DataTypes.DATE, allowNull: true },
  last_hit_at: { type: DataTypes.DATE, allowNull: true },
  hit_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_cache_entries',
  timestamps: true,
  indexes: [
    { fields: ['namespace', 'cache_key'] },
    { fields: ['expires_at'] }
  ]
});
