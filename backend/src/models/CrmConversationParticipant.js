module.exports = (sequelize, DataTypes) => {
  const CrmConversationParticipant = sequelize.define('CrmConversationParticipant', {
    conversation_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    role: {
      type: DataTypes.ENUM('OWNER', 'PARTICIPANT', 'WATCHER'),
      allowNull: false,
      defaultValue: 'PARTICIPANT'
    },
    unread_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    last_read_at: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'crm_conversation_participants',
    timestamps: true
  });

  return CrmConversationParticipant;
};
