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
    confirmado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    confirmado_em: {
      type: DataTypes.DATE,
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
