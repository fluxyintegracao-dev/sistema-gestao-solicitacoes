module.exports = (sequelize, DataTypes) => sequelize.define(
  'PaymentIntent',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    titulo_financeiro_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    payment_account_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    payment_beneficiary_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    provider_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    metodo: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'PIX_CHAVE'
    },
    valor: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    data_pagamento: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'RASCUNHO'
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
    payload_hash: {
      type: DataTypes.STRING(128),
      allowNull: true
    },
    beneficiary_snapshot: {
      type: DataTypes.JSON,
      allowNull: true
    },
    titulo_snapshot: {
      type: DataTypes.JSON,
      allowNull: true
    },
    aprovado_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    aprovado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    enviado_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    confirmado_banco_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    baixa_confirmada_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    baixa_confirmada_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    cancelado_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    motivo_cancelamento: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: 'payment_intents',
    timestamps: true
  }
);
