'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstDocumento', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  tipo_documento: { type: DataTypes.STRING(60), allowNull: false },
  titulo: { type: DataTypes.STRING(180), allowNull: false },
  arquivo_url: { type: DataTypes.TEXT, allowNull: true },
  nome_original: { type: DataTypes.STRING(255), allowNull: true },
  mimetype: { type: DataTypes.STRING(120), allowNull: true },
  tamanho_bytes: { type: DataTypes.INTEGER, allowNull: true },
  validade: { type: DataTypes.DATEONLY, allowNull: true },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ENVIADO' },
  observacoes: { type: DataTypes.TEXT, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_documentos',
  timestamps: true
});
