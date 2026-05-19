module.exports = (sequelize, DataTypes) => sequelize.define(
  'FiscalDfeSyncState',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fiscal_company_id: { type: DataTypes.INTEGER, allowNull: false },
    document_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'nfe' },
    ambiente_sefaz: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'homologacao' },
    ult_nsu: { type: DataTypes.STRING(30), allowNull: false, defaultValue: '0' },
    max_nsu: { type: DataTypes.STRING(30), allowNull: true },
    last_success_at: { type: DataTypes.DATE, allowNull: true },
    last_attempt_at: { type: DataTypes.DATE, allowNull: true },
    next_allowed_sync_at: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'idle' },
    last_error_code: { type: DataTypes.STRING(80), allowNull: true },
    last_error_message: { type: DataTypes.TEXT, allowNull: true },
    consecutive_errors: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lock_token: { type: DataTypes.STRING(120), allowNull: true },
    locked_until: { type: DataTypes.DATE, allowNull: true }
  },
  {
    tableName: 'fiscal_dfe_sync_states',
    timestamps: true
  }
);
