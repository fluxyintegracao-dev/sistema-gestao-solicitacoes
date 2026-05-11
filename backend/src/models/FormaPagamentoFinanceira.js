module.exports = (sequelize, DataTypes) => sequelize.define(
  'FormaPagamentoFinanceira',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    codigo: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: true
    },
    tipo: {
      type: DataTypes.STRING(40),
      allowNull: false
    },
    permite_parcelamento: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    gera_fatura: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    gera_boleto: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    exige_cartao: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    exige_cheque: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    ordem: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    tableName: 'financeiro_formas_pagamento',
    timestamps: true
  }
);
