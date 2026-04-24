module.exports = (sequelize, DataTypes) => {
  const CrmLossReason = sequelize.define('CrmLossReason', {
    nome: { type: DataTypes.STRING(120), allowNull: false },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
  }, { tableName: 'crm_loss_reasons' });

  return CrmLossReason;
};
