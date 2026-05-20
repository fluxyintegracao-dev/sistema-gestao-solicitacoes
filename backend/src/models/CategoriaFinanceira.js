module.exports = (sequelize, DataTypes) => sequelize.define(
  'CategoriaFinanceira',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    tipo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'AMBOS'
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    dre_grupo: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    dre_subgrupo: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    dre_ordem: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    considera_dre: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    criado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    atualizado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: 'categorias_financeiras',
    timestamps: true
  }
);
