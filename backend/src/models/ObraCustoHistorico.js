module.exports = (sequelize, DataTypes) => sequelize.define(
  'ObraCustoHistorico',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    importacao_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    obra_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    parceiro_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    categoria_financeira_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    tipo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PAGAR'
    },
    data_pagamento: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    data_vencimento: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    parceiro_nome: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    parceiro_documento: {
      type: DataTypes.STRING(32),
      allowNull: true
    },
    titulo_parcela: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    documento: {
      type: DataTypes.STRING(160),
      allowNull: true
    },
    plano_financeiro: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    descricao: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    valor: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    origem: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'HISTORICO_LEGADO'
    },
    hash_linha: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    criado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: 'obra_custos_historicos',
    timestamps: true
  }
);
