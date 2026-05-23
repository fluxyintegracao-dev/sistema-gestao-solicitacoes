'use strict';

module.exports = (sequelize, DataTypes) => sequelize.define('SstEventoOperacional', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  obra_id: { type: DataTypes.INTEGER, allowNull: true },
  colaborador_id: { type: DataTypes.INTEGER, allowNull: true },
  tipo_evento: { type: DataTypes.STRING(80), allowNull: false },
  severidade: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'INFO' },
  origem_tipo: { type: DataTypes.STRING(60), allowNull: true },
  origem_id: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'ABERTO' },
  mensagem: { type: DataTypes.TEXT, allowNull: false },
  payload: { type: DataTypes.TEXT('long'), allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true },
  atualizado_por: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'sst_eventos_operacionais',
  timestamps: true
});
