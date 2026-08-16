module.exports = (sequelize, DataTypes) => sequelize.define('FinanceiroDdaSincronizacao', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  provider: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'BB' },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  payment_account_id: { type: DataTypes.INTEGER, allowNull: true },
  modo: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ESTRUTURAL' },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'INICIADA' },
  cursor_provider: { type: DataTypes.STRING(255), allowNull: true },
  request_id: { type: DataTypes.STRING(100), allowNull: true },
  total_recebidos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  total_novos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  total_atualizados: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  total_erros: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  erro_codigo: { type: DataTypes.STRING(80), allowNull: true },
  erro_mensagem: { type: DataTypes.STRING(500), allowNull: true },
  iniciado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  finalizado_em: { type: DataTypes.DATE, allowNull: true },
  criado_por: { type: DataTypes.INTEGER, allowNull: true }
}, { tableName: 'financeiro_dda_sincronizacoes', timestamps: true });
