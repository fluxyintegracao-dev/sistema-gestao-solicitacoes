module.exports = (sequelize, DataTypes) => {
  const ContratoCredor = sequelize.define(
    'ContratoCredor',
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
      parceiro_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      observacao: {
        type: DataTypes.STRING(500),
        allowNull: true
      },
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: 'contrato_credores',
      timestamps: true
    }
  );

  return ContratoCredor;
};
