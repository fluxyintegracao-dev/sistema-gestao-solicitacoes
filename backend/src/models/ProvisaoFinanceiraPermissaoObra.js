module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ProvisaoFinanceiraPermissaoObra', {
    permissao_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    obra_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'provisao_financeira_permissao_obras',
    timestamps: true
  });
};
