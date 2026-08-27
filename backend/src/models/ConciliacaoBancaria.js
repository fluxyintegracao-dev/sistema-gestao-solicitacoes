module.exports = (sequelize, DataTypes) => sequelize.define(
  'ConciliacaoBancaria',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    conta_bancaria_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    caixa_sessao_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    transferencia_financeira_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    titulo_financeiro_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    movimento_financeiro_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    fatura_cartao_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    ofx_uid: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    documento: {
      type: DataTypes.STRING(120),
      allowNull: true
    },
    descricao_banco: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    valor: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    data_movimento: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PENDENTE'
    },
    match_inicial_tipo: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    match_inicial_candidatos: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    match_inicial_movimento_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    match_inicial_avaliado_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolucao_tipo: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    evento_bancario_tipo: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    estorno_status: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    estorno_conciliacao_origem_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    estorno_candidatos: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    estorno_avaliado_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    confirmado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    confirmado_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deleted_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    deleted_reason: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    criado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: 'conciliacoes_bancarias',
    timestamps: true
  }
);
