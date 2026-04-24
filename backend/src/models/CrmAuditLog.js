module.exports = (sequelize, DataTypes) => {
  const CrmAuditLog = sequelize.define('CrmAuditLog', {
    lead_id: { type: DataTypes.INTEGER, allowNull: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    event_type: { type: DataTypes.STRING(80), allowNull: false },
    resource_type: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'LEAD' },
    resource_id: { type: DataTypes.INTEGER, allowNull: true },
    field_changed: { type: DataTypes.STRING(80), allowNull: true },
    old_value: { type: DataTypes.TEXT, allowNull: true },
    new_value: { type: DataTypes.TEXT, allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    ip_address: { type: DataTypes.STRING(45), allowNull: true }
  }, {
    tableName: 'crm_audit_logs',
    updatedAt: false
  });

  return CrmAuditLog;
};
