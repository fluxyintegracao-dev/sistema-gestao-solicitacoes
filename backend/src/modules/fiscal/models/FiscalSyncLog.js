module.exports = (sequelize, DataTypes) => sequelize.define(
  'FiscalSyncLog',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fiscal_company_id: { type: DataTypes.INTEGER, allowNull: true },
    document_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'nfe' },
    ambiente_sefaz: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'homologacao' },
    started_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    finished_at: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'skipped' },
    request_type: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'manual_probe' },
    request_nsu_start: { type: DataTypes.STRING(30), allowNull: true },
    response_ult_nsu: { type: DataTypes.STRING(30), allowNull: true },
    response_max_nsu: { type: DataTypes.STRING(30), allowNull: true },
    response_code: { type: DataTypes.STRING(30), allowNull: true },
    response_message: { type: DataTypes.STRING(255), allowNull: true },
    documents_found: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    documents_processed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    error_message: { type: DataTypes.TEXT, allowNull: true },
    raw_request_storage_key: { type: DataTypes.STRING(500), allowNull: true },
    raw_response_storage_key: { type: DataTypes.STRING(500), allowNull: true }
  },
  {
    tableName: 'fiscal_sync_logs',
    timestamps: true
  }
);
