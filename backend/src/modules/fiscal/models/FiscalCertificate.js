module.exports = (sequelize, DataTypes) => sequelize.define(
  'FiscalCertificate',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fiscal_company_id: { type: DataTypes.INTEGER, allowNull: false },
    certificate_alias: { type: DataTypes.STRING(120), allowNull: false },
    storage_type: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'local_secure_path' },
    certificate_path_encrypted: { type: DataTypes.TEXT, allowNull: true },
    certificate_s3_key_encrypted: { type: DataTypes.TEXT, allowNull: true },
    password_encrypted: { type: DataTypes.TEXT, allowNull: true },
    valid_from: { type: DataTypes.DATE, allowNull: true },
    valid_until: { type: DataTypes.DATE, allowNull: true },
    serial_number: { type: DataTypes.STRING(160), allowNull: true },
    issuer: { type: DataTypes.TEXT, allowNull: true },
    subject: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    last_validated_at: { type: DataTypes.DATE, allowNull: true },
    validation_status: { type: DataTypes.STRING(40), allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    updated_by: { type: DataTypes.INTEGER, allowNull: true }
  },
  {
    tableName: 'fiscal_certificates',
    timestamps: true,
    defaultScope: {
      attributes: {
        exclude: ['certificate_path_encrypted', 'certificate_s3_key_encrypted', 'password_encrypted']
      }
    },
    scopes: {
      withSecrets: {}
    }
  }
);
