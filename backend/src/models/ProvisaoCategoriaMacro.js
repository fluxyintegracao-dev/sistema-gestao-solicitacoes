module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ProvisaoCategoriaMacro', {
    nome: {
      type: DataTypes.STRING,
      allowNull: false
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    ordem_exibicao: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'provisao_categorias_macro',
    timestamps: true
  });
};
