module.exports = (sequelize, DataTypes) => sequelize.define(
  'ContratoComercialParcela',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    contrato_comercial_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    titulo_financeiro_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    sequencia: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    tipo_parcela: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'PARCELA'
    },
    descricao: {
      type: DataTypes.STRING(160),
      allowNull: false
    },
    forma_recebimento_prevista: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    periodicidade: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    reajuste_tipo: {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: 'FIXA'
    },
    data_vencimento: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    competencia_data: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    valor_original: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'contratos_comerciais_parcelas',
    timestamps: true
  }
);
