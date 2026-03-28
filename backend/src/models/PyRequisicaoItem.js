module.exports = (sequelize, DataTypes) => {
  const PyRequisicaoItem = sequelize.define(
    'PyRequisicaoItem',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      requisicao_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      insumo_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      unidade: {
        type: DataTypes.STRING,
        allowNull: false
      },
      quantidade: {
        type: DataTypes.DECIMAL(15, 4),
        allowNull: false
      },
      especificacao: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      apropriacao: {
        type: DataTypes.STRING,
        allowNull: true
      },
      necessario_em: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      link_produto: {
        type: DataTypes.STRING,
        allowNull: true
      },
      foto_path: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      tableName: 'py_requisicao_itens',
      timestamps: false
    }
  );

  return PyRequisicaoItem;
};
