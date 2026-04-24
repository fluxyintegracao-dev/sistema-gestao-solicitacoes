module.exports = (sequelize, DataTypes) => {
  const ParceiroCategoriaItem = sequelize.define(
    'ParceiroCategoriaItem',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      parceiro_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      parceiro_categoria_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      }
    },
    {
      tableName: 'parceiro_categoria_itens',
      timestamps: true
    }
  );

  return ParceiroCategoriaItem;
};
