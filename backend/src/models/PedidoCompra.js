module.exports = (sequelize, DataTypes) => {
  const PedidoCompra = sequelize.define(
    'PedidoCompra',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      solicitacao_compra_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      obra_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      fornecedor_compra_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      criado_por: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: 'ABERTO'
      },
      origem: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: 'COTACAO'
      },
      valor_total: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      valor_minimo_pedido: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
      },
      atingiu_pedido_minimo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      encerrado_em: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      tableName: 'pedido_compras',
      timestamps: true
    }
  );

  return PedidoCompra;
};
