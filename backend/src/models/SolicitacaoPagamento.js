module.exports = (sequelize, DataTypes) => {
  const SolicitacaoPagamento = sequelize.define(
    'SolicitacaoPagamento',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      solicitacao_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'solicitacoes',
          key: 'id'
        }
      },
      valor: {
        type: DataTypes.DECIMAL(12, 2),
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
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      }
    },
    {
      tableName: 'solicitacao_pagamentos',
      timestamps: true
    }
  );

  return SolicitacaoPagamento;
};
