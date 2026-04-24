module.exports = (sequelize, DataTypes) => {
  const ParceiroCategoria = sequelize.define(
    'ParceiroCategoria',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      nome: {
        type: DataTypes.STRING(120),
        allowNull: false
      },
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: 'parceiro_categorias',
      timestamps: true
    }
  );

  return ParceiroCategoria;
};
