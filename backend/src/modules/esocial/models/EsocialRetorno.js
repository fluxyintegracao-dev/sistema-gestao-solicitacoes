'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('EsocialRetorno', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  evento_id: { type: DataTypes.INTEGER, allowNull: true },
  lote_id: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'RECEBIDO' },
  codigo: { type: DataTypes.STRING(60), allowNull: true },
  descricao: { type: DataTypes.TEXT, allowNull: true },
  payload_xml: { type: DataTypes.TEXT('long'), allowNull: true },
  payload_json: { type: DataTypes.TEXT('long'), allowNull: true },
  recebido_em: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'esocial_retornos',
  timestamps: true
});
