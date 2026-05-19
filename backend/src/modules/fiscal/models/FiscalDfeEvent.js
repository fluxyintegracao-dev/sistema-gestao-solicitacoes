module.exports = (sequelize, DataTypes) => sequelize.define(
  'FiscalDfeEvent',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fiscal_dfe_document_id: { type: DataTypes.INTEGER, allowNull: false },
    event_type: { type: DataTypes.STRING(80), allowNull: false },
    event_sequence: { type: DataTypes.INTEGER, allowNull: true },
    event_protocol: { type: DataTypes.STRING(120), allowNull: true },
    event_date: { type: DataTypes.DATE, allowNull: true },
    event_description: { type: DataTypes.STRING(255), allowNull: true },
    raw_event_xml_storage_key: { type: DataTypes.STRING(500), allowNull: true },
    raw_event_json: { type: DataTypes.JSON, allowNull: true }
  },
  {
    tableName: 'fiscal_dfe_events',
    timestamps: true
  }
);
