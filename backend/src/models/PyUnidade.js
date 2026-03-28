module.exports = (sequelize, DataTypes) => {
  const PyUnidade = sequelize.define(
    'PyUnidade',
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
      tableName: 'py_unidades',
      timestamps: false
    }
  );

  return PyUnidade;
};
