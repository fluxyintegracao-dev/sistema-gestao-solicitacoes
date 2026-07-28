module.exports = (sequelize, DataTypes) => sequelize.define(
  'PaymentBatch',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    codigo: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: true
    },
    provider_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    payment_account_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'RASCUNHO'
    },
    quantidade_itens: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    valor_total: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    },
    data_programada: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    idempotency_key: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true
    },
    correlation_id: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true
    },
    provider_request_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true
    },
    payment_account_snapshot: {
      type: DataTypes.JSON,
      allowNull: true
    },
    provider_snapshot: {
      type: DataTypes.JSON,
      allowNull: true
    },
    aprovacao_status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'RASCUNHO'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    submitted_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sent_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    closed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'payment_batches',
    timestamps: true
  }
);
