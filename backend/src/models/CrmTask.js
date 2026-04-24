module.exports = (sequelize, DataTypes) => {
  const CrmTask = sequelize.define('CrmTask', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    lead_id: { type: DataTypes.INTEGER, allowNull: false },
    assigned_user_id: { type: DataTypes.INTEGER, allowNull: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    task_type: {
      type: DataTypes.ENUM('CALL', 'VISIT', 'WHATSAPP', 'EMAIL', 'PROPOSAL', 'OTHER'),
      allowNull: false,
      defaultValue: 'OTHER'
    },
    due_at: { type: DataTypes.DATE, allowNull: true },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    status: {
      type: DataTypes.ENUM('PENDING', 'DONE', 'OVERDUE', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PENDING'
    },
    priority: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
      allowNull: false,
      defaultValue: 'MEDIUM'
    },
    metadata_json: { type: DataTypes.JSON, allowNull: true },
    criado_por: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'crm_tasks',
    timestamps: true
  });
  return CrmTask;
};
