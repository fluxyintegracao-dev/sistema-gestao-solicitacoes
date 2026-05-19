module.exports = (sequelize, DataTypes) => sequelize.define(
  'FiscalDivergence',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fiscal_dfe_document_id: { type: DataTypes.INTEGER, allowNull: false },
    fiscal_document_link_id: { type: DataTypes.INTEGER, allowNull: true },
    divergence_type: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'other' },
    severity: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'medium' },
    description: { type: DataTypes.TEXT, allowNull: false },
    expected_value: { type: DataTypes.STRING(255), allowNull: true },
    actual_value: { type: DataTypes.STRING(255), allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' },
    resolved_by: { type: DataTypes.INTEGER, allowNull: true },
    resolved_at: { type: DataTypes.DATE, allowNull: true }
  },
  {
    tableName: 'fiscal_divergences',
    timestamps: true
  }
);
