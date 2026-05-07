module.exports = (sequelize, DataTypes) => sequelize.define(
  'PaymentTransaction',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    payment_intent_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    payment_batch_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    provider_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    attempt: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false
    },
    http_status: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    provider_transaction_id: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    provider_batch_id: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    correlation_id: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    idempotency_key: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    request_snapshot: {
      type: DataTypes.JSON,
      allowNull: true
    },
    response_snapshot: {
      type: DataTypes.JSON,
      allowNull: true
    },
    error_code: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    finished_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'payment_transactions',
    timestamps: true
  }
);
