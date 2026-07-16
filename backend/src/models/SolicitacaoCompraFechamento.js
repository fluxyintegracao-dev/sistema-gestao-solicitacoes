module.exports = (sequelize, DataTypes) => {
  const SolicitacaoCompraFechamento = sequelize.define(
    'SolicitacaoCompraFechamento',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      solicitacao_compra_id: { type: DataTypes.INTEGER, allowNull: false },
      numero_rodada: { type: DataTypes.INTEGER, allowNull: false },
      tipo: { type: DataTypes.STRING(20), allowNull: false },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'CONCLUIDO' },
      idempotency_key: { type: DataTypes.STRING(180), allowNull: true },
      quantidade_total: { type: DataTypes.DECIMAL(14, 3), allowNull: false, defaultValue: 0 },
      valor_total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      justificativa: { type: DataTypes.TEXT, allowNull: true },
      criado_por: { type: DataTypes.INTEGER, allowNull: true },
      fechado_em: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    },
    { tableName: 'solicitacao_compra_fechamentos', timestamps: true }
  );

  return SolicitacaoCompraFechamento;
};
