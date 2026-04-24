module.exports = (sequelize, DataTypes) => {
  const CrmConversation = sequelize.define('CrmConversation', {
    lead_id: { type: DataTypes.INTEGER, allowNull: true },
    channel_id: { type: DataTypes.INTEGER, allowNull: true },
    phone_asset_id: { type: DataTypes.INTEGER, allowNull: true },
    assigned_user_id: { type: DataTypes.INTEGER, allowNull: true },
    external_conversation_id: { type: DataTypes.STRING(160), allowNull: true },
    channel_type: {
      type: DataTypes.ENUM('WHATSAPP', 'PHONE', 'EMAIL', 'FORM', 'CHAT', 'OTHER'),
      allowNull: false,
      defaultValue: 'WHATSAPP'
    },
    status: {
      type: DataTypes.ENUM('OPEN', 'PENDING', 'RESOLVED', 'ARCHIVED'),
      allowNull: false,
      defaultValue: 'OPEN'
    },
    priority: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
      allowNull: false,
      defaultValue: 'MEDIUM'
    },
    contact_name: { type: DataTypes.STRING(160), allowNull: true },
    contact_phone: { type: DataTypes.STRING(30), allowNull: true },
    contact_email: { type: DataTypes.STRING(160), allowNull: true },
    subject: { type: DataTypes.STRING(200), allowNull: true },
    last_message_preview: { type: DataTypes.STRING(255), allowNull: true },
    last_message_at: { type: DataTypes.DATE, allowNull: true },
    unread_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    closed_at: { type: DataTypes.DATE, allowNull: true },
    created_by_user_id: { type: DataTypes.INTEGER, allowNull: true }
  }, {
    tableName: 'crm_conversations',
    timestamps: true
  });

  return CrmConversation;
};
