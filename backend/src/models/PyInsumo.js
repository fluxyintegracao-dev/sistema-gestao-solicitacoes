module.exports = (sequelize, DataTypes) => {
  const PyInsumo = sequelize.define(
    'PyInsumo',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      nome: {
        type: DataTypes.STRING,
        allowNull: false
      },
      categoria_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      foto_path: {
        type: DataTypes.STRING,
        allowNull: true
      },
      is_custom: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      tableName: 'py_insumos',
      timestamps: false
    }
  );

  return PyInsumo;
};
