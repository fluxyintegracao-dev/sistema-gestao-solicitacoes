'use strict';

async function createTableIfMissing(queryInterface, tableName, schema) {
  const existing = await queryInterface.describeTable(tableName).catch(() => null);
  if (existing) return;
  await queryInterface.createTable(tableName, schema);
}

module.exports = {
  async up({ DataTypes, queryInterface }) {
    await createTableIfMissing(queryInterface, 'fiscal_companies', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      empresa_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'empresas_grupo', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      razao_social: { type: DataTypes.STRING(200), allowNull: false },
      nome_fantasia: { type: DataTypes.STRING(200), allowNull: true },
      cnpj: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      uf: { type: DataTypes.STRING(2), allowNull: false },
      inscricao_estadual: { type: DataTypes.STRING(40), allowNull: true },
      ambiente_sefaz: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'homologacao' },
      ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      modulo_fiscal_habilitado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      observacoes: { type: DataTypes.TEXT, allowNull: true },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await createTableIfMissing(queryInterface, 'fiscal_dfe_sync_states', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      fiscal_company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'fiscal_companies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
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
      locked_until: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await createTableIfMissing(queryInterface, 'fiscal_dfe_documents', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      fiscal_company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'fiscal_companies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
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
      is_duplicate: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await createTableIfMissing(queryInterface, 'fiscal_sync_logs', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      fiscal_company_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'fiscal_companies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
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
      raw_response_storage_key: { type: DataTypes.STRING(500), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await createTableIfMissing(queryInterface, 'fiscal_document_links', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      fiscal_dfe_document_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'fiscal_dfe_documents', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      solicitacao_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'solicitacoes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      solicitacao_compra_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'solicitacao_compras', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      pedido_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'pedido_compras', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      pedido_item_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'pedido_compra_itens', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      financeiro_titulo_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'titulos_financeiros', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      obra_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'Obras', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      centro_custo_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'apropriacoes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      plano_financeiro_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'categorias_financeiras', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      fornecedor_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'parceiros', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      link_status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'suggested' },
      confidence_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      matched_by: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'manual' },
      matched_reason: { type: DataTypes.TEXT, allowNull: true },
      created_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      confirmed_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      confirmed_at: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await createTableIfMissing(queryInterface, 'fiscal_divergences', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      fiscal_dfe_document_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'fiscal_dfe_documents', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fiscal_document_link_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'fiscal_document_links', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      divergence_type: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'other' },
      severity: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'medium' },
      description: { type: DataTypes.TEXT, allowNull: false },
      expected_value: { type: DataTypes.STRING(255), allowNull: true },
      actual_value: { type: DataTypes.STRING(255), allowNull: true },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' },
      resolved_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      resolved_at: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    const indexTasks = [
      ['fiscal_companies', ['cnpj'], { unique: true, name: 'ux_fiscal_companies_cnpj' }],
      ['fiscal_companies', ['ativo'], { name: 'idx_fiscal_companies_ativo' }],
      ['fiscal_companies', ['empresa_id'], { name: 'idx_fiscal_companies_empresa' }],
      ['fiscal_dfe_sync_states', ['fiscal_company_id', 'document_type', 'ambiente_sefaz'], { unique: true, name: 'ux_fiscal_sync_state_company_type_env' }],
      ['fiscal_dfe_documents', ['access_key'], { unique: true, name: 'ux_fiscal_dfe_documents_access_key' }],
      ['fiscal_dfe_documents', ['fiscal_company_id'], { name: 'idx_fiscal_dfe_documents_company' }],
      ['fiscal_dfe_documents', ['issuer_cnpj'], { name: 'idx_fiscal_dfe_documents_issuer' }],
      ['fiscal_dfe_documents', ['emission_date'], { name: 'idx_fiscal_dfe_documents_emission' }],
      ['fiscal_dfe_documents', ['document_status'], { name: 'idx_fiscal_dfe_documents_status' }],
      ['fiscal_dfe_documents', ['nsu'], { name: 'idx_fiscal_dfe_documents_nsu' }],
      ['fiscal_sync_logs', ['fiscal_company_id', 'started_at'], { name: 'idx_fiscal_sync_logs_company_started' }],
      ['fiscal_document_links', ['fiscal_dfe_document_id'], { name: 'idx_fiscal_document_links_document' }],
      ['fiscal_divergences', ['fiscal_dfe_document_id', 'status'], { name: 'idx_fiscal_divergences_document_status' }]
    ];

    for (const [table, fields, options] of indexTasks) {
      await queryInterface.addIndex(table, fields, options).catch(() => {});
    }
  },

  async down({ queryInterface }) {
    await queryInterface.dropTable('fiscal_divergences').catch(() => {});
    await queryInterface.dropTable('fiscal_document_links').catch(() => {});
    await queryInterface.dropTable('fiscal_sync_logs').catch(() => {});
    await queryInterface.dropTable('fiscal_dfe_documents').catch(() => {});
    await queryInterface.dropTable('fiscal_dfe_sync_states').catch(() => {});
    await queryInterface.dropTable('fiscal_companies').catch(() => {});
  }
};
