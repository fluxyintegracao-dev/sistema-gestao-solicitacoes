module.exports = (sequelize, DataTypes) => {
  const SolicitacaoApropriacao = sequelize.define(
    'SolicitacaoApropriacao',
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
      contrato_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      apropriacao_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      percentual: {
        type: DataTypes.DECIMAL(7, 4),
        allowNull: true
      },
      quantidade: {
        type: DataTypes.DECIMAL(14, 4),
        allowNull: true
      },
      valor_rateio: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true
      },
      observacao: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      tableName: 'solicitacao_apropriacoes',
      timestamps: true
    }
  );

  return SolicitacaoApropriacao;
};
