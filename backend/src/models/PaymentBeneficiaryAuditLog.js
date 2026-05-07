module.exports = (sequelize, DataTypes) => sequelize.define(
  'PaymentBeneficiaryAuditLog',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    payment_beneficiary_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    parceiro_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    acao: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    campo_alterado: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    valor_anterior: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    valor_novo: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    snapshot_anterior: {
      type: DataTypes.JSON,
      allowNull: true
    },
    snapshot_novo: {
      type: DataTypes.JSON,
      allowNull: true
    },
    alterado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    alterado_em: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    ip: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  },
  {
    tableName: 'payment_beneficiary_audit_logs',
    timestamps: true
  }
);
