module.exports = (sequelize, DataTypes) => {
  const PyInsumoUnidade = sequelize.define(
    'PyInsumoUnidade',
    {
      insumo_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
      },
      unidade_id: {
        type: DataTypes.INTEGER,
        primaryKey: true
      }
    },
    {
      tableName: 'py_insumo_unidades',
      timestamps: false
    }
  );

  return PyInsumoUnidade;
};
