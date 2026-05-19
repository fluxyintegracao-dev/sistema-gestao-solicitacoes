module.exports = (sequelize, DataTypes) => sequelize.define(
  'FiscalAccountingBatch',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fiscal_company_id: { type: DataTypes.INTEGER, allowNull: false },
    reference_month: { type: DataTypes.INTEGER, allowNull: false },
    reference_year: { type: DataTypes.INTEGER, allowNull: false },
    period_start: { type: DataTypes.DATEONLY, allowNull: false },
    period_end: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'draft' },
    zip_storage_key: { type: DataTypes.STRING(500), allowNull: true },
    report_storage_key: { type: DataTypes.STRING(500), allowNull: true },
    total_documents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    total_value: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    generated_by: { type: DataTypes.INTEGER, allowNull: true },
    generated_at: { type: DataTypes.DATE, allowNull: true }
  },
  {
    tableName: 'fiscal_accounting_batches',
    timestamps: true
  }
);
