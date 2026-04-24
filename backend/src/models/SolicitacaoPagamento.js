module.exports = (sequelize, DataTypes) => sequelize.define(
  'SolicitacaoPagamento',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    solicitacao_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    valor: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    data_pagamento: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    tableName: 'solicitacao_pagamentos',
    timestamps: true
  }
);
