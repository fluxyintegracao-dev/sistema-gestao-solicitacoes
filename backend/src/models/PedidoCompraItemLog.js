module.exports = (sequelize, DataTypes) => {
  const PedidoCompraItemLog = sequelize.define(
    'PedidoCompraItemLog',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      pedido_compra_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      pedido_compra_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      acao: {
        type: DataTypes.STRING(60),
        allowNull: false
      },
      descricao: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      dados_anteriores: {
        type: DataTypes.TEXT('long'),
        allowNull: true
      },
      dados_novos: {
        type: DataTypes.TEXT('long'),
        allowNull: true
      }
    },
    {
      tableName: 'pedido_compra_item_logs',
      timestamps: true,
      updatedAt: false
    }
  );

  return PedidoCompraItemLog;
};
