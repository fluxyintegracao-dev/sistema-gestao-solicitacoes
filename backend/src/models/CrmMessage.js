module.exports = (sequelize, DataTypes) => {
  const CrmMessage = sequelize.define('CrmMessage', {
    conversation_id: { type: DataTypes.INTEGER, allowNull: false },
    lead_id: { type: DataTypes.INTEGER, allowNull: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    external_message_id: { type: DataTypes.STRING(160), allowNull: true },
    sender_type: {
      type: DataTypes.ENUM('USER', 'CONTACT', 'SYSTEM', 'INTERNAL'),
      allowNull: false,
      defaultValue: 'USER'
    },
    direction: {
      type: DataTypes.ENUM('INBOUND', 'OUTBOUND', 'INTERNAL'),
      allowNull: false,
      defaultValue: 'OUTBOUND'
    },
    message_type: {
      type: DataTypes.ENUM('TEXT', 'NOTE', 'TEMPLATE', 'FILE', 'EVENT'),
      allowNull: false,
      defaultValue: 'TEXT'
    },
    content: { type: DataTypes.TEXT, allowNull: false },
    metadata_json: { type: DataTypes.JSON, allowNull: true },
    read_at: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'crm_messages',
    timestamps: true,
    updatedAt: false
  });

  return CrmMessage;
};
