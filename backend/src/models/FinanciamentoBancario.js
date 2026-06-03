module.exports = (sequelize, DataTypes) => sequelize.define(
  'FinanciamentoBancario',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    codigo: {
      type: DataTypes.STRING(40),
      allowNull: true,
      unique: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'RASCUNHO'
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    conta_bancaria_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    obra_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    parceiro_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    categoria_financeira_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    numero_contrato: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    documento_referencia: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    tipo_contrato: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    sistema_amortizacao: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'FIXO'
    },
    taxa_juros_mensal: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true
    },
    data_contrato: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    data_credito: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    primeiro_vencimento: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    quantidade_parcelas: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    valor_credito: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    valor_juros_total: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    },
    valor_iof: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    },
    valor_tarifas: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    },
    valor_total: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    titulos_gerados_em: {
      type: DataTypes.DATE,
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
    tableName: 'financiamentos_bancarios',
    timestamps: true
  }
);
