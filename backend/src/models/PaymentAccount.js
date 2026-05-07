module.exports = (sequelize, DataTypes) => sequelize.define(
  'PaymentAccount',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    conta_bancaria_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    cnpj_pagador: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    provider_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    banco_codigo: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    agencia: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    agencia_digito: {
      type: DataTypes.STRING(5),
      allowNull: true
    },
    conta: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    conta_digito: {
      type: DataTypes.STRING(5),
      allowNull: true
    },
    tipo_conta: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    convenio: {
      type: DataTypes.STRING(60),
      allowNull: false
    },
    client_id_ref: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    client_secret_ref: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    certificate_ref: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    ambiente: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'HOMOLOGACAO'
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    tableName: 'payment_accounts',
    timestamps: true
  }
);
