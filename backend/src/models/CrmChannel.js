module.exports = (sequelize, DataTypes) => {
  const CrmChannel = sequelize.define('CrmChannel', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING(120), allowNull: false },
    type: {
      type: DataTypes.ENUM('WHATSAPP', 'PHONE', 'EMAIL', 'FORM', 'CHAT'),
      allowNull: false,
      defaultValue: 'WHATSAPP'
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'BLOCKED'),
      allowNull: false,
      defaultValue: 'ACTIVE'
    },
    provider: { type: DataTypes.STRING(80), allowNull: true },
    public_label: { type: DataTypes.STRING(120), allowNull: true },
    business_main_phone: { type: DataTypes.STRING(30), allowNull: true },
    operational_phone: { type: DataTypes.STRING(30), allowNull: true },
    tracking_phone: { type: DataTypes.STRING(30), allowNull: true },
    destination_phone: { type: DataTypes.STRING(30), allowNull: true },
    meta_waba_id: { type: DataTypes.STRING(120), allowNull: true },
    meta_phone_number_id: { type: DataTypes.STRING(120), allowNull: true },
    google_customer_id: { type: DataTypes.STRING(120), allowNull: true },
    config_json: { type: DataTypes.JSON, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true }
  }, {
    tableName: 'crm_channels',
    timestamps: true
  });
  return CrmChannel;
};
