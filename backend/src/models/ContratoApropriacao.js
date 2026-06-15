module.exports = (sequelize, DataTypes) => {
  const ContratoApropriacao = sequelize.define(
    'ContratoApropriacao',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      contrato_id: {
        type: DataTypes.INTEGER,
        allowNull: false
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
      observacao: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      tableName: 'contrato_apropriacoes',
      timestamps: true
    }
  );

  return ContratoApropriacao;
};
