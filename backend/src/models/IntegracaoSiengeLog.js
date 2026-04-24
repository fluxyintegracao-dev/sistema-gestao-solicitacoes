module.exports = (sequelize, DataTypes) => sequelize.define(
  'IntegracaoSiengeLog',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    fila_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    acao: {
      type: DataTypes.STRING(60),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    mensagem: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    request_snapshot: {
      type: DataTypes.JSON,
      allowNull: true
    },
    response_snapshot: {
      type: DataTypes.JSON,
      allowNull: true
    },
    criado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  },
  {
    tableName: 'sienge_integracao_logs',
    timestamps: true
  }
);
