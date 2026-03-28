module.exports = (sequelize, DataTypes) => {
  const PyRequisicao = sequelize.define(
    'PyRequisicao',
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
      criado_em: {
        type: DataTypes.DATE,
        allowNull: false
      },
      solicitante: {
        type: DataTypes.STRING,
        allowNull: true
      },
      necessario_em: {
        type: DataTypes.DATEONLY,
        allowNull: true
      }
    },
    {
      tableName: 'py_requisicoes',
      timestamps: false
    }
  );

  return PyRequisicao;
};
