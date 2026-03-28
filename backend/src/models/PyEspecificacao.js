module.exports = (sequelize, DataTypes) => {
  const PyEspecificacao = sequelize.define(
    'PyEspecificacao',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      insumo_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      nome: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      tableName: 'py_especificacoes',
      timestamps: false
    }
  );

  return PyEspecificacao;
};
