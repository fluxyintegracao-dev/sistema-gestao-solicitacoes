module.exports = (sequelize, DataTypes) => {
  const CrmAutomationExecution = sequelize.define('CrmAutomationExecution', {
    rule_id: { type: DataTypes.INTEGER, allowNull: false },
    lead_id: { type: DataTypes.INTEGER, allowNull: true },
    conversation_id: { type: DataTypes.INTEGER, allowNull: true },
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
    execution_key: { type: DataTypes.STRING(255), allowNull: false },
    status: {
      type: DataTypes.ENUM('PROCESSING', 'SUCCESS', 'SKIPPED', 'ERROR'),
      allowNull: false,
      defaultValue: 'PROCESSING'
    },
    message: { type: DataTypes.STRING(255), allowNull: true },
    metadata_json: { type: DataTypes.JSON, allowNull: true },
    created_by_user_id: { type: DataTypes.INTEGER, allowNull: true },
    processed_at: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'crm_automation_executions',
    timestamps: true
  });

  return CrmAutomationExecution;
};
