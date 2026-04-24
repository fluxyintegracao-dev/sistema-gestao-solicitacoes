module.exports = (sequelize, DataTypes) => {
  const CrmInteraction = sequelize.define('CrmInteraction', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    lead_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    interaction_type: {
      type: DataTypes.ENUM('CALL', 'WHATSAPP', 'NOTE', 'EMAIL', 'MEETING', 'STATUS_CHANGE', 'SYSTEM_EVENT'),
      allowNull: false,
      defaultValue: 'NOTE'
    },
    title: { type: DataTypes.STRING(200), allowNull: true },
    content: { type: DataTypes.TEXT, allowNull: true },
    metadata_json: { type: DataTypes.JSON, allowNull: true }
  }, {
    tableName: 'crm_interactions',
    timestamps: true,
    updatedAt: false
  });
  return CrmInteraction;
};
