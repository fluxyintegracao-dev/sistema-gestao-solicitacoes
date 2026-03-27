module.exports = (sequelize, DataTypes) => {
  const PyCategoria = sequelize.define(
    'PyCategoria',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      nome: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      tableName: 'py_categorias',
      timestamps: false
    }
  );

  return PyCategoria;
};
