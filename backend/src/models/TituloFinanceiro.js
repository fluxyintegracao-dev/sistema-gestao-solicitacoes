module.exports = (sequelize, DataTypes) => sequelize.define(
  'TituloFinanceiro',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    codigo: {
      type: DataTypes.STRING(40),
      allowNull: true,
      unique: true
    },
    solicitacao_id: {
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
      allowNull: false
    },
    categoria_financeira_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    forma_pagamento_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    cartao_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    fatura_cartao_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    grupo_parcelamento_id: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    numero_parcela: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    total_parcelas: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    data_compra: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    origem_titulo: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'MANUAL'
    },
    tipo: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'ABERTO'
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    numero_documento: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    cheque_numero: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    cheque_banco: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    cheque_agencia: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    cheque_conta: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    cheque_emitente: {
      type: DataTypes.STRING(160),
      allowNull: true
    },
    forma_cobranca: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    status_cobranca: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'NAO_APLICAVEL'
    },
    banco_cobranca: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    nosso_numero: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    linha_digitavel: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    codigo_barras: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    identificador_externo: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    boleto_emitido_em: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    valor_original: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    valor_saldo: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    valor_baixado: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    },
    data_emissao: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    data_vencimento: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    data_quitacao: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    observacoes: {
      type: DataTypes.TEXT,
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
    tableName: 'titulos_financeiros',
    timestamps: true
  }
);
