module.exports = (sequelize, DataTypes) => {
  const SolicitacaoCompraFornecedor = sequelize.define(
    'SolicitacaoCompraFornecedor',
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
      fornecedor_compra_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      token: {
        type: DataTypes.STRING,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'ENVIADO'
      },
      enviado_em: {
        type: DataTypes.DATE,
        allowNull: true
      },
      visualizado_em: {
        type: DataTypes.DATE,
        allowNull: true
      },
      respondido_em: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      tableName: 'solicitacao_compra_fornecedores',
      timestamps: true
    }
  );

  return SolicitacaoCompraFornecedor;
};
