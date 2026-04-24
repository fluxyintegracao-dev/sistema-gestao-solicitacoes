module.exports = (sequelize, DataTypes) => {
  const CrmPipelineStage = sequelize.define('CrmPipelineStage', {
    pipeline_id: { type: DataTypes.INTEGER, allowNull: false },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    cor: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '#6366f1' },
    is_initial: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    is_won: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    is_lost: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    requires_loss_reason: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    requires_followup: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    sla_minutes: { type: DataTypes.INTEGER, allowNull: true },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  }, { tableName: 'crm_pipeline_stages' });

  return CrmPipelineStage;
};
