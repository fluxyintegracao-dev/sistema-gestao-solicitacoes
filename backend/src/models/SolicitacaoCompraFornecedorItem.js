module.exports = (sequelize, DataTypes) => {
  const SolicitacaoCompraFornecedorItem = sequelize.define(
    'SolicitacaoCompraFornecedorItem',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      solicitacao_compra_fornecedor_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      item_tipo: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      solicitacao_compra_item_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      solicitacao_compra_item_manual_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      tableName: 'solicitacao_compra_fornecedor_itens',
      timestamps: true
    }
  );

  return SolicitacaoCompraFornecedorItem;
};
