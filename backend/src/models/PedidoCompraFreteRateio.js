module.exports = (sequelize, DataTypes) => {
  const PedidoCompraFreteRateio = sequelize.define(
    'PedidoCompraFreteRateio',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      frete_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      pedido_compra_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      pedido_compra_item_id: {
        type: DataTypes.INTEGER,
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
      obra_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      valor_item_base: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      percentual_rateio: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: false,
        defaultValue: 0
      },
      valor_rateado: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      manual: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      tableName: 'pedido_compra_frete_rateios',
      timestamps: true
    }
  );

  return PedidoCompraFreteRateio;
};
