module.exports = (sequelize, DataTypes) => sequelize.define(
  'FiscalAccountingBatchItem',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    batch_id: { type: DataTypes.INTEGER, allowNull: false },
    fiscal_dfe_document_id: { type: DataTypes.INTEGER, allowNull: false },
    included_xml: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    included_pdf: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'included' }
  },
  {
    tableName: 'fiscal_accounting_batch_items',
    timestamps: true
  }
);
