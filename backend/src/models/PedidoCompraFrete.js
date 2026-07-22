module.exports = (sequelize, DataTypes) => {
  const PedidoCompraFrete = sequelize.define(
    'PedidoCompraFrete',
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
      solicitacao_compra_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      origem_cotacao_fornecedor_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      solicitacao_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      obra_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      tipo: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'EMBUTIDO'
      },
      momento: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'FECHAMENTO'
      },
      criterio_rateio: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'VALOR_ITENS'
      },
      status_financeiro: {
        type: DataTypes.STRING(40),
        allowNull: false,
        defaultValue: 'NAO_GERA_TITULO'
      },
      valor_total: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      },
      data_vencimento: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      fornecedor_compra_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      parceiro_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      titulo_financeiro_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      dados_pagamento: {
        type: DataTypes.TEXT('long'),
        allowNull: true
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      idempotency_key: {
        type: DataTypes.STRING(120),
        allowNull: true
      },
      registrado_por: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    },
    {
      tableName: 'pedido_compra_fretes',
      timestamps: true
    }
  );

  return PedidoCompraFrete;
};
