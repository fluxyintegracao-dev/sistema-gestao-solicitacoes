module.exports = (sequelize, DataTypes) => {
  const CrmConfig = sequelize.define('CrmConfig', {
    chave: { type: DataTypes.STRING(120), allowNull: false },
    valor: { type: DataTypes.TEXT, allowNull: true },
    descricao: { type: DataTypes.STRING(255), allowNull: true }
  }, { tableName: 'crm_config' });

  return CrmConfig;
};
