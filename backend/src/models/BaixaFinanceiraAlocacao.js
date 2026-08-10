module.exports = (sequelize, DataTypes) => sequelize.define('BaixaFinanceiraAlocacao', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  baixa_grupo_id: { type: DataTypes.INTEGER, allowNull: false },
  componente_id: { type: DataTypes.INTEGER, allowNull: false },
  titulo_financeiro_id: { type: DataTypes.INTEGER, allowNull: false },
  movimento_financeiro_id: { type: DataTypes.INTEGER, allowNull: true },
  valor: { type: DataTypes.DECIMAL(15, 2), allowNull: false }
}, {
  tableName: 'baixas_financeiras_alocacoes',
  timestamps: true
});
