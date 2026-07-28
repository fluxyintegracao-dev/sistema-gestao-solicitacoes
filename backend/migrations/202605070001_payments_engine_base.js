const { tableExists } = require('../src/database/schemaUtils');

const ACTIVE_INTENT_STATUSES = [
  'RASCUNHO',
  'PENDENTE_DADOS_FAVORECIDO',
  'PRONTO_PARA_LOTE',
  'EM_LOTE',
  'PENDENTE_APROVACAO',
  'APROVADO',
  'ENFILEIRADO',
  'ENVIANDO',
  'ENVIADO_AO_BANCO',
  'PROCESSANDO_BANCO',
  'ENVIO_INDETERMINADO',
  'CONFIRMADO_BANCO',
  'AGUARDANDO_CONFIRMACAO_BAIXA'
];

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'payment_providers'))) {
      await sequelize.query(`
        CREATE TABLE payment_providers (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          codigo VARCHAR(30) NOT NULL,
          nome VARCHAR(120) NOT NULL,
          ambiente VARCHAR(20) NOT NULL DEFAULT 'HOMOLOGACAO',
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          config_ref VARCHAR(255) NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_payment_providers_codigo_ambiente (codigo, ambiente),
          KEY idx_payment_providers_ativo (ativo)
        )
      `);

      await sequelize.query(`
        INSERT INTO payment_providers (codigo, nome, ambiente, ativo, config_ref, createdAt, updatedAt)
        VALUES ('BB', 'Banco do Brasil', 'HOMOLOGACAO', 1, 'BB_MOCK_HOMOLOGACAO', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          nome = VALUES(nome),
          ativo = VALUES(ativo),
          updatedAt = NOW()
      `);
    }

    if (!(await tableExists(sequelize, 'payment_accounts'))) {
      await sequelize.query(`
        CREATE TABLE payment_accounts (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          conta_bancaria_id INT NOT NULL,
          empresa_id INT NULL,
          cnpj_pagador VARCHAR(20) NOT NULL,
          provider_id INT NOT NULL,
          banco_codigo VARCHAR(10) NOT NULL,
          agencia VARCHAR(20) NOT NULL,
          agencia_digito VARCHAR(5) NULL,
          conta VARCHAR(30) NOT NULL,
          conta_digito VARCHAR(5) NULL,
          tipo_conta VARCHAR(30) NOT NULL,
          convenio VARCHAR(60) NOT NULL,
          client_id_ref VARCHAR(255) NULL,
          client_secret_ref VARCHAR(255) NULL,
          certificate_ref VARCHAR(255) NULL,
          ambiente VARCHAR(20) NOT NULL DEFAULT 'HOMOLOGACAO',
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          created_by INT NULL,
          updated_by INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_payment_accounts_conta FOREIGN KEY (conta_bancaria_id) REFERENCES contas_bancarias(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_payment_accounts_empresa FOREIGN KEY (empresa_id) REFERENCES rh_empresas_grupo(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_payment_accounts_provider FOREIGN KEY (provider_id) REFERENCES payment_providers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_payment_accounts_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_payment_accounts_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_payment_accounts_conta (conta_bancaria_id),
          KEY idx_payment_accounts_provider (provider_id),
          KEY idx_payment_accounts_empresa (empresa_id),
          KEY idx_payment_accounts_ativo (ativo)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'payment_beneficiaries'))) {
      await sequelize.query(`
        CREATE TABLE payment_beneficiaries (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          parceiro_id INT NOT NULL,
          nome VARCHAR(180) NOT NULL,
          cpf_cnpj VARCHAR(20) NOT NULL,
          metodo_preferencial VARCHAR(30) NOT NULL DEFAULT 'PIX_CHAVE',
          pix_tipo_chave VARCHAR(20) NOT NULL,
          pix_chave VARCHAR(255) NOT NULL,
          banco_codigo VARCHAR(10) NULL,
          agencia VARCHAR(20) NULL,
          agencia_digito VARCHAR(5) NULL,
          conta VARCHAR(30) NULL,
          conta_digito VARCHAR(5) NULL,
          tipo_conta VARCHAR(30) NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          validado_em DATETIME NULL,
          validado_por INT NULL,
          created_by INT NULL,
          updated_by INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_payment_beneficiaries_parceiro FOREIGN KEY (parceiro_id) REFERENCES parceiros(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_payment_beneficiaries_validado_por FOREIGN KEY (validado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_payment_beneficiaries_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_payment_beneficiaries_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_payment_beneficiaries_parceiro (parceiro_id),
          KEY idx_payment_beneficiaries_cpf_cnpj (cpf_cnpj),
          KEY idx_payment_beneficiaries_pix (pix_tipo_chave, pix_chave),
          KEY idx_payment_beneficiaries_ativo (ativo)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'payment_beneficiary_audit_logs'))) {
      await sequelize.query(`
        CREATE TABLE payment_beneficiary_audit_logs (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          payment_beneficiary_id INT NULL,
          parceiro_id INT NULL,
          acao VARCHAR(20) NOT NULL,
          campo_alterado VARCHAR(80) NULL,
          valor_anterior TEXT NULL,
          valor_novo TEXT NULL,
          snapshot_anterior JSON NULL,
          snapshot_novo JSON NULL,
          alterado_por INT NULL,
          alterado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ip VARCHAR(80) NULL,
          user_agent VARCHAR(255) NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_payment_beneficiary_logs_beneficiary FOREIGN KEY (payment_beneficiary_id) REFERENCES payment_beneficiaries(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_payment_beneficiary_logs_parceiro FOREIGN KEY (parceiro_id) REFERENCES parceiros(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_payment_beneficiary_logs_user FOREIGN KEY (alterado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_payment_beneficiary_logs_beneficiary (payment_beneficiary_id),
          KEY idx_payment_beneficiary_logs_parceiro (parceiro_id),
          KEY idx_payment_beneficiary_logs_acao (acao),
          KEY idx_payment_beneficiary_logs_data (alterado_em)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'payment_intents'))) {
      await sequelize.query(`
        CREATE TABLE payment_intents (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          titulo_financeiro_id INT NOT NULL,
          payment_account_id INT NOT NULL,
          payment_beneficiary_id INT NOT NULL,
          provider_id INT NOT NULL,
          metodo VARCHAR(30) NOT NULL DEFAULT 'PIX_CHAVE',
          valor DECIMAL(14,2) NOT NULL,
          data_pagamento DATE NOT NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO',
          idempotency_key VARCHAR(120) NOT NULL,
          correlation_id VARCHAR(120) NOT NULL,
          payload_hash VARCHAR(128) NULL,
          beneficiary_snapshot JSON NULL,
          titulo_snapshot JSON NULL,
          aprovado_em DATETIME NULL,
          aprovado_por INT NULL,
          enviado_em DATETIME NULL,
          confirmado_banco_em DATETIME NULL,
          baixa_confirmada_em DATETIME NULL,
          baixa_confirmada_por INT NULL,
          cancelado_em DATETIME NULL,
          motivo_cancelamento TEXT NULL,
          created_by INT NULL,
          updated_by INT NULL,
          active_titulo_key INT GENERATED ALWAYS AS (
            CASE
              WHEN status IN (${ACTIVE_INTENT_STATUSES.map((status) => `'${status}'`).join(', ')})
              THEN titulo_financeiro_id
              ELSE NULL
            END
          ) STORED,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_payment_intents_titulo FOREIGN KEY (titulo_financeiro_id) REFERENCES titulos_financeiros(id) ON DELETE RESTRICT,
          CONSTRAINT fk_payment_intents_account FOREIGN KEY (payment_account_id) REFERENCES payment_accounts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_payment_intents_beneficiary FOREIGN KEY (payment_beneficiary_id) REFERENCES payment_beneficiaries(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_payment_intents_provider FOREIGN KEY (provider_id) REFERENCES payment_providers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_payment_intents_aprovado_por FOREIGN KEY (aprovado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_payment_intents_baixa_por FOREIGN KEY (baixa_confirmada_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_payment_intents_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_payment_intents_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          UNIQUE KEY uq_payment_intents_idempotency (idempotency_key),
          UNIQUE KEY uq_payment_intents_correlation (correlation_id),
          UNIQUE KEY uq_payment_intents_active_titulo (active_titulo_key),
          KEY idx_payment_intents_titulo (titulo_financeiro_id),
          KEY idx_payment_intents_status (status),
          KEY idx_payment_intents_data (data_pagamento)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'payment_batches'))) {
      await sequelize.query(`
        CREATE TABLE payment_batches (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          codigo VARCHAR(60) NOT NULL,
          provider_id INT NOT NULL,
          payment_account_id INT NOT NULL,
          empresa_id INT NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO',
          quantidade_itens INT NOT NULL DEFAULT 0,
          valor_total DECIMAL(14,2) NOT NULL DEFAULT 0.00,
          data_programada DATE NOT NULL,
          idempotency_key VARCHAR(120) NOT NULL,
          correlation_id VARCHAR(120) NOT NULL,
          aprovacao_status VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO',
          created_by INT NULL,
          submitted_by INT NULL,
          submitted_at DATETIME NULL,
          sent_by INT NULL,
          sent_at DATETIME NULL,
          closed_at DATETIME NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_payment_batches_provider FOREIGN KEY (provider_id) REFERENCES payment_providers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_payment_batches_account FOREIGN KEY (payment_account_id) REFERENCES payment_accounts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_payment_batches_empresa FOREIGN KEY (empresa_id) REFERENCES rh_empresas_grupo(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_payment_batches_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_payment_batches_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_payment_batches_sent_by FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          UNIQUE KEY uq_payment_batches_codigo (codigo),
          UNIQUE KEY uq_payment_batches_idempotency (idempotency_key),
          UNIQUE KEY uq_payment_batches_correlation (correlation_id),
          KEY idx_payment_batches_status (status),
          KEY idx_payment_batches_data (data_programada)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'payment_batch_items'))) {
      await sequelize.query(`
        CREATE TABLE payment_batch_items (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          payment_batch_id INT NOT NULL,
          payment_intent_id INT NOT NULL,
          sequencia INT NOT NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO',
          valor DECIMAL(14,2) NOT NULL,
          erro_codigo VARCHAR(80) NULL,
          erro_mensagem TEXT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_payment_batch_items_batch FOREIGN KEY (payment_batch_id) REFERENCES payment_batches(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_payment_batch_items_intent FOREIGN KEY (payment_intent_id) REFERENCES payment_intents(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          UNIQUE KEY uq_payment_batch_items_batch_intent (payment_batch_id, payment_intent_id),
          KEY idx_payment_batch_items_intent (payment_intent_id),
          KEY idx_payment_batch_items_status (status)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'payment_approvals'))) {
      await sequelize.query(`
        CREATE TABLE payment_approvals (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          entity_type VARCHAR(30) NOT NULL DEFAULT 'BATCH',
          entity_id INT NOT NULL,
          nivel INT NOT NULL DEFAULT 1,
          acao VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
          aprovado_por INT NOT NULL,
          aprovado_em DATETIME NULL,
          justificativa TEXT NULL,
          mfa_verified_at DATETIME NULL,
          snapshot_hash VARCHAR(128) NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_payment_approvals_user FOREIGN KEY (aprovado_por) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          UNIQUE KEY uq_payment_approvals_entity_user (entity_type, entity_id, aprovado_por),
          KEY idx_payment_approvals_entity (entity_type, entity_id),
          KEY idx_payment_approvals_status (status)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'payment_transactions'))) {
      await sequelize.query(`
        CREATE TABLE payment_transactions (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          payment_intent_id INT NULL,
          payment_batch_id INT NOT NULL,
          provider_id INT NOT NULL,
          attempt INT NOT NULL DEFAULT 1,
          status VARCHAR(40) NOT NULL,
          http_status INT NULL,
          provider_transaction_id VARCHAR(120) NULL,
          provider_batch_id VARCHAR(120) NULL,
          correlation_id VARCHAR(120) NOT NULL,
          idempotency_key VARCHAR(120) NOT NULL,
          request_snapshot JSON NULL,
          response_snapshot JSON NULL,
          error_code VARCHAR(80) NULL,
          error_message TEXT NULL,
          started_at DATETIME NULL,
          finished_at DATETIME NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_payment_transactions_intent FOREIGN KEY (payment_intent_id) REFERENCES payment_intents(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_payment_transactions_batch FOREIGN KEY (payment_batch_id) REFERENCES payment_batches(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_payment_transactions_provider FOREIGN KEY (provider_id) REFERENCES payment_providers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          KEY idx_payment_transactions_batch (payment_batch_id),
          KEY idx_payment_transactions_intent (payment_intent_id),
          KEY idx_payment_transactions_correlation (correlation_id),
          KEY idx_payment_transactions_status (status)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'payment_events'))) {
      await sequelize.query(`
        CREATE TABLE payment_events (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          payment_intent_id INT NULL,
          payment_batch_id INT NULL,
          provider_id INT NOT NULL,
          event_type VARCHAR(80) NOT NULL,
          provider_event_id VARCHAR(120) NULL,
          payload JSON NULL,
          received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          processed_at DATETIME NULL,
          processing_status VARCHAR(40) NOT NULL DEFAULT 'PENDENTE',
          processing_error TEXT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_payment_events_intent FOREIGN KEY (payment_intent_id) REFERENCES payment_intents(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_payment_events_batch FOREIGN KEY (payment_batch_id) REFERENCES payment_batches(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_payment_events_provider FOREIGN KEY (provider_id) REFERENCES payment_providers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          KEY idx_payment_events_batch (payment_batch_id),
          KEY idx_payment_events_intent (payment_intent_id),
          KEY idx_payment_events_type (event_type),
          KEY idx_payment_events_status (processing_status)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'payment_reconciliations'))) {
      await sequelize.query(`
        CREATE TABLE payment_reconciliations (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          payment_intent_id INT NOT NULL,
          movimento_financeiro_id INT NULL,
          conciliacao_bancaria_id INT NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'PENDENTE',
          matched_by VARCHAR(40) NULL,
          matched_at DATETIME NULL,
          created_by INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_payment_reconciliations_intent FOREIGN KEY (payment_intent_id) REFERENCES payment_intents(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_payment_reconciliations_movimento FOREIGN KEY (movimento_financeiro_id) REFERENCES movimentos_financeiros(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_payment_reconciliations_conciliacao FOREIGN KEY (conciliacao_bancaria_id) REFERENCES conciliacoes_bancarias(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_payment_reconciliations_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          UNIQUE KEY uq_payment_reconciliations_intent (payment_intent_id),
          KEY idx_payment_reconciliations_status (status)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'payment_jobs'))) {
      await sequelize.query(`
        CREATE TABLE payment_jobs (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          job_type VARCHAR(60) NOT NULL,
          entity_type VARCHAR(40) NOT NULL,
          entity_id INT NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
          attempts INT NOT NULL DEFAULT 0,
          max_attempts INT NOT NULL DEFAULT 3,
          next_run_at DATETIME NULL,
          locked_at DATETIME NULL,
          locked_by VARCHAR(120) NULL,
          last_error TEXT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          KEY idx_payment_jobs_status_next (status, next_run_at),
          KEY idx_payment_jobs_entity (entity_type, entity_id),
          KEY idx_payment_jobs_locked (locked_at)
        )
      `);
    }
  },

  async down({ sequelize, queryInterface }) {
    const tables = [
      'payment_jobs',
      'payment_reconciliations',
      'payment_events',
      'payment_transactions',
      'payment_approvals',
      'payment_batch_items',
      'payment_batches',
      'payment_intents',
      'payment_beneficiary_audit_logs',
      'payment_beneficiaries',
      'payment_accounts',
      'payment_providers'
    ];

    for (const table of tables) {
      if (await tableExists(sequelize, table)) {
        await queryInterface.dropTable(table);
      }
    }
  }
};
