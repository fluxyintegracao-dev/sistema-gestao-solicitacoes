module.exports = (sequelize, DataTypes) => sequelize.define(
  'TituloFinanceiroRateio',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    titulo_financeiro_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    obra_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    apropriacao_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    tipo_rateio: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PERCENTUAL'
    },
    percentual: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true
    },
    valor_rateio: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
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
    tableName: 'titulos_financeiros_rateios',
    timestamps: true
  }
);
