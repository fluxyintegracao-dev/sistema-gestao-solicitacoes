module.exports = (sequelize, DataTypes) => sequelize.define(
  'TransferenciaFinanceira',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    conta_origem_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    conta_destino_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    caixa_sessao_origem_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    caixa_sessao_destino_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    conciliacao_origem_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    conciliacao_destino_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    data_transferencia: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    valor: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'ATIVA'
    },
    criado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    cancelado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    cancelado_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    observacoes_cancelamento: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'transferencias_financeiras',
    timestamps: true
  }
);
