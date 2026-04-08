module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ProvisaoFinanceiraSequencia', {
    obra_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    ultimo_numero: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'provisao_financeira_sequencias',
    timestamps: true
  });
};
