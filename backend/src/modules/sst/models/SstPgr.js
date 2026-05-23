'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstPgr', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  responsavel: { type: DataTypes.STRING(160), allowNull: false },
  vigencia_inicio: { type: DataTypes.DATEONLY, allowNull: true },
  vigencia_fim: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ATIVO' },
  documento_url: { type: DataTypes.TEXT, allowNull: true },
  observacoes: { type: DataTypes.TEXT, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_pgr',
  timestamps: true
});
