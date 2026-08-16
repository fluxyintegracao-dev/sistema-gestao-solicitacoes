module.exports = (sequelize, DataTypes) => sequelize.define('FinanceiroDdaEvento', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  boleto_id: { type: DataTypes.BIGINT, allowNull: true },
  sincronizacao_id: { type: DataTypes.BIGINT, allowNull: true },
  tipo_evento: { type: DataTypes.STRING(80), allowNull: false },
  status_anterior: { type: DataTypes.STRING(30), allowNull: true },
  status_novo: { type: DataTypes.STRING(30), allowNull: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true },
  detalhe_json: { type: DataTypes.TEXT('long'), allowNull: true },
  dedupe_key: { type: DataTypes.STRING(120), allowNull: false }
}, { tableName: 'financeiro_dda_eventos', timestamps: true, updatedAt: false });
