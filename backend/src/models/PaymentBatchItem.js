module.exports = (sequelize, DataTypes) => sequelize.define(
  'PaymentBatchItem',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    payment_batch_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    payment_intent_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    sequencia: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'RASCUNHO'
    },
    valor: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    erro_codigo: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    erro_mensagem: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'payment_batch_items',
    timestamps: true
  }
);
