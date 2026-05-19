module.exports = (sequelize, DataTypes) => sequelize.define(
  'FiscalDfeDocument',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fiscal_company_id: { type: DataTypes.INTEGER, allowNull: false },
    document_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'nfe' },
    access_key: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    nsu: { type: DataTypes.STRING(30), allowNull: true },
    schema_version: { type: DataTypes.STRING(30), allowNull: true },
    issuer_cnpj: { type: DataTypes.STRING(20), allowNull: true },
    issuer_name: { type: DataTypes.STRING(255), allowNull: true },
    recipient_cnpj: { type: DataTypes.STRING(20), allowNull: true },
    recipient_name: { type: DataTypes.STRING(255), allowNull: true },
    emission_date: { type: DataTypes.DATE, allowNull: true },
    received_at: { type: DataTypes.DATE, allowNull: true },
    total_value: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'BRL' },
    document_number: { type: DataTypes.STRING(60), allowNull: true },
    series: { type: DataTypes.STRING(20), allowNull: true },
    operation_nature: { type: DataTypes.STRING(255), allowNull: true },
    sefaz_status_code: { type: DataTypes.STRING(20), allowNull: true },
    sefaz_status_description: { type: DataTypes.STRING(255), allowNull: true },
    document_status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'discovered' },
    manifestation_status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'pending' },
    xml_storage_key: { type: DataTypes.STRING(500), allowNull: true },
    pdf_storage_key: { type: DataTypes.STRING(500), allowNull: true },
    danfe_storage_key: { type: DataTypes.STRING(500), allowNull: true },
    raw_summary_json: { type: DataTypes.JSON, allowNull: true },
    parsed_xml_json: { type: DataTypes.JSON, allowNull: true },
    source: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'sefaz_distribution' },
    hash_xml: { type: DataTypes.STRING(128), allowNull: true },
    is_duplicate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  },
  {
    tableName: 'fiscal_dfe_documents',
    timestamps: true
  }
);
