'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstEventoEsocial', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  tipo_evento: { type: DataTypes.STRING(20), allowNull: false },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'PREPARADO' },
  xml_original: { type: DataTypes.TEXT('long'), allowNull: true },
  xml_assinado: { type: DataTypes.TEXT('long'), allowNull: true },
  protocolo: { type: DataTypes.STRING(120), allowNull: true },
  recibo: { type: DataTypes.STRING(120), allowNull: true },
  retorno: { type: DataTypes.TEXT('long'), allowNull: true },
  enviado_em: { type: DataTypes.DATE, allowNull: true },
  observacoes: { type: DataTypes.TEXT, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_eventos_esocial',
  timestamps: true
});
