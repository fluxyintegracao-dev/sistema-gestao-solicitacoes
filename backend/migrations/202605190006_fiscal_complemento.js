'use strict';

async function createTableIfMissing(queryInterface, tableName, schema) {
  const existing = await queryInterface.describeTable(tableName).catch(() => null);
  if (existing) return;
  await queryInterface.createTable(tableName, schema);
}

async function addIndexSafe(queryInterface, table, fields, options) {
  await queryInterface.addIndex(table, fields, options).catch(() => {});
}

module.exports = {
  async up({ DataTypes, queryInterface }) {
    await createTableIfMissing(queryInterface, 'fiscal_certificates', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      fiscal_company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'fiscal_companies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
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
      created_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      updated_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await createTableIfMissing(queryInterface, 'fiscal_dfe_events', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      fiscal_dfe_document_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'fiscal_dfe_documents', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      event_type: { type: DataTypes.STRING(80), allowNull: false },
      event_sequence: { type: DataTypes.INTEGER, allowNull: true },
      event_protocol: { type: DataTypes.STRING(120), allowNull: true },
      event_date: { type: DataTypes.DATE, allowNull: true },
      event_description: { type: DataTypes.STRING(255), allowNull: true },
      raw_event_xml_storage_key: { type: DataTypes.STRING(500), allowNull: true },
      raw_event_json: { type: DataTypes.JSON, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await createTableIfMissing(queryInterface, 'fiscal_accounting_batches', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      fiscal_company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'fiscal_companies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      reference_month: { type: DataTypes.INTEGER, allowNull: false },
      reference_year: { type: DataTypes.INTEGER, allowNull: false },
      period_start: { type: DataTypes.DATEONLY, allowNull: false },
      period_end: { type: DataTypes.DATEONLY, allowNull: false },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'draft' },
      zip_storage_key: { type: DataTypes.STRING(500), allowNull: true },
      report_storage_key: { type: DataTypes.STRING(500), allowNull: true },
      total_documents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      total_value: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
      generated_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      generated_at: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await createTableIfMissing(queryInterface, 'fiscal_accounting_batch_items', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      batch_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'fiscal_accounting_batches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fiscal_dfe_document_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'fiscal_dfe_documents', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      included_xml: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      included_pdf: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'included' },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await addIndexSafe(queryInterface, 'fiscal_certificates', ['fiscal_company_id', 'is_active'], { name: 'idx_fiscal_certificates_company_active' });
    await addIndexSafe(queryInterface, 'fiscal_certificates', ['valid_until'], { name: 'idx_fiscal_certificates_valid_until' });
    await addIndexSafe(queryInterface, 'fiscal_dfe_events', ['fiscal_dfe_document_id', 'event_type'], { name: 'idx_fiscal_dfe_events_document_type' });
    await addIndexSafe(queryInterface, 'fiscal_accounting_batches', ['fiscal_company_id', 'reference_year', 'reference_month'], { name: 'idx_fiscal_accounting_batches_period' });
    await addIndexSafe(queryInterface, 'fiscal_accounting_batch_items', ['batch_id', 'fiscal_dfe_document_id'], { unique: true, name: 'ux_fiscal_accounting_batch_items_document' });
  },

  async down({ queryInterface }) {
    await queryInterface.dropTable('fiscal_accounting_batch_items').catch(() => {});
    await queryInterface.dropTable('fiscal_accounting_batches').catch(() => {});
    await queryInterface.dropTable('fiscal_dfe_events').catch(() => {});
    await queryInterface.dropTable('fiscal_certificates').catch(() => {});
  }
};
