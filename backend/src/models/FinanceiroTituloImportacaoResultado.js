module.exports = (sequelize, DataTypes) => sequelize.define('FinanceiroTituloImportacaoResultado', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  importacao_id: { type: DataTypes.INTEGER, allowNull: false },
  linha_id: { type: DataTypes.INTEGER, allowNull: false },
  titulo_financeiro_id: { type: DataTypes.INTEGER, allowNull: false },
  numero_parcela: { type: DataTypes.INTEGER, allowNull: true },
  valor: { type: DataTypes.DECIMAL(15, 2), allowNull: false }
}, {
  tableName: 'financeiro_titulo_importacao_resultados',
  timestamps: true
});
