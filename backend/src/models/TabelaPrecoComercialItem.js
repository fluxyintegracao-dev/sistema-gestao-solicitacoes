module.exports = (sequelize, DataTypes) => sequelize.define(
  'TabelaPrecoComercialItem',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tabela_preco_comercial_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    unidade_comercial_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    valor_tabela: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    valor_minimo: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'tabelas_precos_comerciais_itens',
    timestamps: true
  }
);
