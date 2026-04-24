module.exports = (sequelize, DataTypes) => {
  const CrmAutomationRule = sequelize.define('CrmAutomationRule', {
    nome: { type: DataTypes.STRING(160), allowNull: false },
    trigger_type: {
      type: DataTypes.ENUM(
        'LEAD_CREATED',
        'NO_FIRST_CONTACT',
        'NO_ACTIVITY',
        'STAGE_CHANGED',
        'MESSAGE_RECEIVED',
        'LEAD_REFUSED',
        'DAILY_LIMIT_REACHED',
        'ROLLOUT_PHASE_CHANGED'
      ),
      allowNull: false
    },
    conditions_json: { type: DataTypes.JSON, allowNull: true },
    actions_json: { type: DataTypes.JSON, allowNull: true },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
    last_run_at: { type: DataTypes.DATE, allowNull: true },
    created_by_user_id: { type: DataTypes.INTEGER, allowNull: true },
    updated_by_user_id: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'crm_automation_rules',
    timestamps: true
  });

  return CrmAutomationRule;
};
