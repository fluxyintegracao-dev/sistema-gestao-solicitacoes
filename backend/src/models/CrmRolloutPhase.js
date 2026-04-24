module.exports = (sequelize, DataTypes) => {
  const CrmRolloutPhase = sequelize.define('CrmRolloutPhase', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    chave: { type: DataTypes.STRING(80), allowNull: false },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    descricao: { type: DataTypes.TEXT, allowNull: true },
    ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    is_current: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  }, {
    tableName: 'crm_rollout_phases',
    timestamps: true
  });
  return CrmRolloutPhase;
};
