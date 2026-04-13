module.exports = (sequelize, DataTypes) => {
  const PrioridadeLoteItem = sequelize.define(
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
        allowNull: false
      },
      valor_considerado: {
        type: DataTypes.DECIMAL(12, 2),
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

  return PrioridadeLoteItem;
};
