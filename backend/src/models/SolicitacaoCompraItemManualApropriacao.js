module.exports = (sequelize, DataTypes) => {
  const SolicitacaoCompraItemManualApropriacao = sequelize.define(
    'SolicitacaoCompraItemManualApropriacao',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      solicitacao_compra_item_manual_id: {
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
      tableName: 'solicitacao_compra_item_manual_apropriacoes',
      timestamps: true
    }
  );

  return SolicitacaoCompraItemManualApropriacao;
};
