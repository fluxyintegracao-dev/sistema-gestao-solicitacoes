module.exports = (sequelize, DataTypes) => {
  const PyObra = sequelize.define(
    'PyObra',
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
      tableName: 'py_obras',
      timestamps: false
    }
  );

  return PyObra;
};
