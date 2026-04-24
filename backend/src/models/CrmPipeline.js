module.exports = (sequelize, DataTypes) => {
  const CrmPipeline = sequelize.define('CrmPipeline', {
    nome: { type: DataTypes.STRING(120), allowNull: false },
    descricao: { type: DataTypes.STRING(255), allowNull: true },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  }, { tableName: 'crm_pipelines' });

  return CrmPipeline;
};
