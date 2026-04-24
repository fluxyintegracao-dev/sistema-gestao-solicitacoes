module.exports = (sequelize, DataTypes) => {
  const CrmPhoneAsset = sequelize.define('CrmPhoneAsset', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    label: { type: DataTypes.STRING(120), allowNull: false },
    phone_number: { type: DataTypes.STRING(30), allowNull: false },
    country_code: { type: DataTypes.STRING(5), allowNull: false, defaultValue: '+55' },
    role_type: {
      type: DataTypes.ENUM('MAIN', 'OPERATIONAL', 'TRACKING', 'DESTINATION'),
      allowNull: false
    },
    provider: { type: DataTypes.STRING(80), allowNull: true },
    is_whatsapp_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    is_google_ads_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    is_meta_ads_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    display_name: { type: DataTypes.STRING(120), allowNull: true },
    risk_level: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
      allowNull: false,
      defaultValue: 'LOW'
    },
    can_receive_messages: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    can_receive_calls: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    forward_to_phone: { type: DataTypes.STRING(30), allowNull: true },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED'),
      allowNull: false,
      defaultValue: 'ACTIVE'
    },
    notes: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'crm_phone_assets',
    timestamps: true
  });
  return CrmPhoneAsset;
};
