module.exports = (sequelize, DataTypes) => sequelize.define(
  'ProvisaoCategoriaMacro',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: {
      type: DataTypes.STRING(160),
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
  },
  {
    tableName: 'provisao_categorias_macro',
    timestamps: true
  }
);
