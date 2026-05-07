module.exports = (sequelize, DataTypes) => sequelize.define(
  'PaymentReconciliation',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    payment_intent_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    movimento_financeiro_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    conciliacao_bancaria_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'PENDENTE'
    },
    matched_by: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    matched_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: 'payment_reconciliations',
    timestamps: true
  }
);
