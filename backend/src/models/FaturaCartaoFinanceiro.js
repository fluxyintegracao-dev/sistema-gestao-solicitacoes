module.exports = (sequelize, DataTypes) => sequelize.define(
  'FaturaCartaoFinanceiro',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    cartao_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    competencia: {
      type: DataTypes.STRING(7),
      allowNull: false
    },
    data_inicio: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    data_fechamento: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    data_vencimento: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    valor_total: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'ABERTA'
    },
    conta_bancaria_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    data_pagamento: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    conciliacao_bancaria_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pago_por: {
      type: DataTypes.INTEGER,
      allowNull: true
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
    tableName: 'financeiro_faturas_cartao',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['cartao_id', 'competencia']
      }
    ]
  }
);
