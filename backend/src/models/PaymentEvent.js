module.exports = (sequelize, DataTypes) => sequelize.define(
  'PaymentEvent',
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
      allowNull: true
    },
    provider_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    event_type: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    provider_event_id: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    dedupe_key: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: true
    },
    received_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    processed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    processing_status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'PENDENTE'
    },
    processing_error: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'payment_events',
    timestamps: true
  }
);
