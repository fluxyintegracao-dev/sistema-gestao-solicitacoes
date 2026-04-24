module.exports = (sequelize, DataTypes) => {
  const CrmIntegrationMetaEvent = sequelize.define('CrmIntegrationMetaEvent', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    external_event_id: { type: DataTypes.STRING(120), allowNull: true },
    event_type: { type: DataTypes.STRING(80), allowNull: true },
    campaign_name: { type: DataTypes.STRING(160), allowNull: true },
    adset_name: { type: DataTypes.STRING(160), allowNull: true },
    ad_name: { type: DataTypes.STRING(160), allowNull: true },
    form_name: { type: DataTypes.STRING(160), allowNull: true },
    page_id: { type: DataTypes.STRING(80), allowNull: true },
    form_id: { type: DataTypes.STRING(80), allowNull: true },
    payload_json: { type: DataTypes.JSON, allowNull: false },
    processing_status: {
      type: DataTypes.ENUM('PENDING', 'PROCESSED', 'DUPLICATE', 'ERROR'),
      allowNull: false,
      defaultValue: 'PENDING'
    },
    processed_lead_id: { type: DataTypes.INTEGER, allowNull: true },
    processed_conversation_id: { type: DataTypes.INTEGER, allowNull: true },
    processed_message_id: { type: DataTypes.INTEGER, allowNull: true },
    error_message: { type: DataTypes.TEXT, allowNull: true },
    received_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    processed_at: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'crm_integration_meta_events',
    timestamps: false
  });
  return CrmIntegrationMetaEvent;
};
