module.exports = (sequelize, DataTypes) => {
  const PyApropriacao = sequelize.define(
    'PyApropriacao',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      obra_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      numero: {
        type: DataTypes.STRING,
        allowNull: false
      },
      nome: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: ''
      }
    },
    {
      tableName: 'py_apropriacoes',
      timestamps: false
    }
  );

  return PyApropriacao;
};
