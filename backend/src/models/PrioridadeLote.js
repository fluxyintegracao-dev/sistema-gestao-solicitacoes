module.exports = (sequelize, DataTypes) => sequelize.define(
  'PrioridadeLote',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    classificacao_alvo: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    diretoria_alvo_codigo: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    valor_disponivel: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    valor_utilizado: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'ABERTO'
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    solicitado_por: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    finalizado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    finalizado_em: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'prioridade_lotes',
    timestamps: true
  }
);
