module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ProvisaoFinanceiraHistorico', {
    provisao_financeira_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    acao: {
      type: DataTypes.STRING,
      allowNull: false
    },
    status_anterior: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status_novo: {
      type: DataTypes.STRING,
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
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    dados_depois_json: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    },
    metadata_json: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    }
  }, {
    tableName: 'provisao_financeira_historico',
    timestamps: true
  });
};
