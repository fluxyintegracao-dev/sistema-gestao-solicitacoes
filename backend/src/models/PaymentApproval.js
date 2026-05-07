module.exports = (sequelize, DataTypes) => sequelize.define(
  'PaymentApproval',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    entity_type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'BATCH'
    },
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    nivel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    acao: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PENDENTE'
    },
    aprovado_por: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    aprovado_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    justificativa: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    mfa_verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    snapshot_hash: {
      type: DataTypes.STRING(128),
      allowNull: true
    }
  },
  {
    tableName: 'payment_approvals',
    timestamps: true
  }
);
