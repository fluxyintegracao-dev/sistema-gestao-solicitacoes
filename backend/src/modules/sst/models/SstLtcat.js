'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstLtcat', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  codigo: { type: DataTypes.STRING(60), allowNull: true },
  titulo: { type: DataTypes.STRING(180), allowNull: false },
  data_emissao: { type: DataTypes.DATEONLY, allowNull: true },
  vigencia_inicio: { type: DataTypes.DATEONLY, allowNull: true },
  vigencia_fim: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'RASCUNHO' },
  responsavel_tecnico: { type: DataTypes.STRING(180), allowNull: true },
  observacoes: { type: DataTypes.TEXT, allowNull: true },
  documento_url: { type: DataTypes.TEXT, allowNull: true },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_ltcats',
  timestamps: true
});
