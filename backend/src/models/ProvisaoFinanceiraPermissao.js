module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ProvisaoFinanceiraPermissao', {
    escopo_tipo: {
      type: DataTypes.STRING,
      allowNull: false
    },
    escopo_valor: {
      type: DataTypes.STRING,
      allowNull: false
    },
    pode_acessar: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    pode_criar: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    pode_aprovar: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    pode_dashboard_global: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'provisao_financeira_permissoes',
    timestamps: true
  });
};
