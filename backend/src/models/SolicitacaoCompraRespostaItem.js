module.exports = (sequelize, DataTypes) => {
  const SolicitacaoCompraRespostaItem = sequelize.define(
    'SolicitacaoCompraRespostaItem',
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
        type: DataTypes.STRING,
        allowNull: false
      },
      solicitacao_compra_item_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      solicitacao_compra_item_manual_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      disponivel: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      preco: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
      },
      prazo: {
        type: DataTypes.STRING,
        allowNull: true
      },
      observacao: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      vencedor: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      tableName: 'solicitacao_compra_resposta_itens',
      timestamps: true
    }
  );

  return SolicitacaoCompraRespostaItem;
};
