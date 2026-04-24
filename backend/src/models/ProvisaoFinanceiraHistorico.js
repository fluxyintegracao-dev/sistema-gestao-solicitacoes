module.exports = (sequelize, DataTypes) => sequelize.define(
  'ProvisaoFinanceiraHistorico',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    provisao_financeira_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    acao: {
      type: DataTypes.STRING(60),
      allowNull: false
    },
    status_anterior: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    status_novo: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    comentario: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dados_antes_json: {
      type: DataTypes.JSON,
      allowNull: true
    },
    dados_depois_json: {
      type: DataTypes.JSON,
      allowNull: true
    },
    metadata_json: {
      type: DataTypes.JSON,
      allowNull: true
    }
  },
  {
    tableName: 'provisao_financeira_historico',
    timestamps: true
  }
);
