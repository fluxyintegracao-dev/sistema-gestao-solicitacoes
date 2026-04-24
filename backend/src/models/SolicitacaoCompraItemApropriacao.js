module.exports = (sequelize, DataTypes) => {
  const SolicitacaoCompraItemApropriacao = sequelize.define(
    'SolicitacaoCompraItemApropriacao',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      solicitacao_compra_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      apropriacao_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      quantidade_apropriada: {
        type: DataTypes.DECIMAL(12, 4),
        allowNull: false
      }
    },
    {
      tableName: 'solicitacao_compra_item_apropriacoes',
      timestamps: true
    }
  );

  return SolicitacaoCompraItemApropriacao;
};
