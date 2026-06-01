module.exports = (sequelize, DataTypes) => sequelize.define(
  'PrioridadeLoteItem',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    lote_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    solicitacao_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    titulo_financeiro_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    valor_considerado: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false
    },
    autorizado_por: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    autorizado_em: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    tableName: 'prioridade_lote_itens',
    timestamps: true
  }
);
