module.exports = (sequelize, DataTypes) => sequelize.define(
  'FinanciamentoBancarioParcela',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    financiamento_bancario_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    titulo_financeiro_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    numero_parcela: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    data_vencimento: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    valor_principal: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    valor_juros: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    },
    valor_iof: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    },
    valor_tarifa: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    },
    valor_parcela: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PREVISTA'
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'financiamento_bancario_parcelas',
    timestamps: true
  }
);
