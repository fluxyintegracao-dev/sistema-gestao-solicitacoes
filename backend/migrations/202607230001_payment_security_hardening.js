const {
  columnExists,
  indexExists,
  tableExists
} = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (await tableExists(sequelize, 'payment_providers')) {
      await sequelize.query(`
        INSERT IGNORE INTO payment_providers
          (codigo, nome, ambiente, ativo, config_ref, createdAt, updatedAt)
        VALUES
          ('BB', 'Banco do Brasil', 'PRODUCAO', 1, 'BB_REAL_PRODUCAO', NOW(), NOW())
      `);
    }

    if (
      await tableExists(sequelize, 'payment_intents')
      && await columnExists(sequelize, 'payment_intents', 'active_titulo_key')
    ) {
      const [activeIntentConflicts] = await sequelize.query(`
        SELECT titulo_financeiro_id, COUNT(*) AS total
          FROM payment_intents
         WHERE status IN (
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
         )
         GROUP BY titulo_financeiro_id
        HAVING COUNT(*) > 1
         LIMIT 20
      `);
      if (activeIntentConflicts.length) {
        const conflictIds = activeIntentConflicts
          .map((item) => item.titulo_financeiro_id)
          .join(', ');
        throw new Error(
          `Migration interrompida: titulos com mais de uma intencao ativa (${conflictIds}). Concilie os registros antes de continuar.`
        );
      }

      if (await indexExists(sequelize, 'payment_intents', 'uq_payment_intents_active_titulo')) {
        await sequelize.query(`
          ALTER TABLE payment_intents
          DROP INDEX uq_payment_intents_active_titulo
        `);
      }
      await sequelize.query(`
        ALTER TABLE payment_intents
        MODIFY COLUMN active_titulo_key INT GENERATED ALWAYS AS (
          CASE
            WHEN status IN (
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
            )
            THEN titulo_financeiro_id
            ELSE NULL
          END
        ) STORED
      `);
      await sequelize.query(`
        CREATE UNIQUE INDEX uq_payment_intents_active_titulo
        ON payment_intents (active_titulo_key)
      `);
    }

    if (await tableExists(sequelize, 'payment_batches')) {
      if (!(await columnExists(sequelize, 'payment_batches', 'provider_request_id'))) {
        await sequelize.query(`
          ALTER TABLE payment_batches
          ADD COLUMN provider_request_id VARCHAR(20) NULL AFTER correlation_id
        `);
      }

      if (!(await columnExists(sequelize, 'payment_batches', 'payment_account_snapshot'))) {
        await sequelize.query(`
          ALTER TABLE payment_batches
          ADD COLUMN payment_account_snapshot JSON NULL AFTER provider_request_id
        `);
      }

      if (!(await columnExists(sequelize, 'payment_batches', 'provider_snapshot'))) {
        await sequelize.query(`
          ALTER TABLE payment_batches
          ADD COLUMN provider_snapshot JSON NULL AFTER payment_account_snapshot
        `);
      }

      if (!(await indexExists(sequelize, 'payment_batches', 'uq_payment_batches_provider_request'))) {
        await sequelize.query(`
          CREATE UNIQUE INDEX uq_payment_batches_provider_request
          ON payment_batches (provider_request_id)
        `);
      }

      await sequelize.query(`
        UPDATE payment_batches b
        INNER JOIN payment_accounts a ON a.id = b.payment_account_id
        LEFT JOIN contas_bancarias cb ON cb.id = a.conta_bancaria_id
           SET b.payment_account_snapshot = JSON_OBJECT(
                 'id', a.id,
                 'conta_bancaria_id', a.conta_bancaria_id,
                 'empresa_id', a.empresa_id,
                 'cnpj_pagador', REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(a.cnpj_pagador, ''), '.', ''), '/', ''), '-', ''), ' ', ''),
                 'provider_id', a.provider_id,
                 'banco_codigo', COALESCE(a.banco_codigo, ''),
                 'agencia', COALESCE(a.agencia, ''),
                 'agencia_digito', COALESCE(a.agencia_digito, ''),
                 'conta', COALESCE(a.conta, ''),
                 'conta_digito', COALESCE(a.conta_digito, ''),
                 'tipo_conta', UPPER(COALESCE(a.tipo_conta, '')),
                 'convenio', COALESCE(a.convenio, ''),
                 'ambiente', UPPER(COALESCE(a.ambiente, '')),
                 'conta_bancaria_empresa_id', COALESCE(cb.empresa_id, 0)
               )
         WHERE b.payment_account_snapshot IS NULL
      `);

      await sequelize.query(`
        UPDATE payment_batches b
        INNER JOIN payment_providers p ON p.id = b.provider_id
           SET b.provider_snapshot = JSON_OBJECT(
                 'id', p.id,
                 'codigo', UPPER(COALESCE(p.codigo, '')),
                 'ambiente', UPPER(COALESCE(p.ambiente, '')),
                 'config_ref', COALESCE(p.config_ref, ''),
                 'legacy_backfill', TRUE
               )
         WHERE b.provider_snapshot IS NULL
      `);
    }

    if (await tableExists(sequelize, 'payment_jobs')) {
      if (!(await columnExists(sequelize, 'payment_jobs', 'dedupe_key'))) {
        await sequelize.query(`
          ALTER TABLE payment_jobs
          ADD COLUMN dedupe_key VARCHAR(180) NULL AFTER entity_id
        `);
      }

      if (!(await columnExists(sequelize, 'payment_jobs', 'requested_by'))) {
        await sequelize.query(`
          ALTER TABLE payment_jobs
          ADD COLUMN requested_by INT NULL AFTER dedupe_key
        `);
      }

      if (!(await indexExists(sequelize, 'payment_jobs', 'uq_payment_jobs_dedupe'))) {
        await sequelize.query(`
          CREATE UNIQUE INDEX uq_payment_jobs_dedupe
          ON payment_jobs (dedupe_key)
        `);
      }

      await sequelize.query(`
        UPDATE payment_jobs
           SET status = 'CANCELADO',
               locked_at = NULL,
               locked_by = NULL,
               last_error = 'Liberacao automatica removida por endurecimento de seguranca.',
               updatedAt = NOW()
         WHERE job_type = 'BB_RELEASE_BATCH'
           AND status IN ('PENDENTE', 'PROCESSANDO', 'RETRY')
      `);
    }

    if (await tableExists(sequelize, 'payment_events')) {
      if (!(await columnExists(sequelize, 'payment_events', 'dedupe_key'))) {
        await sequelize.query(`
          ALTER TABLE payment_events
          ADD COLUMN dedupe_key VARCHAR(255) NULL AFTER provider_event_id
        `);
      }

      if (!(await indexExists(sequelize, 'payment_events', 'uq_payment_events_dedupe'))) {
        await sequelize.query(`
          CREATE UNIQUE INDEX uq_payment_events_dedupe
          ON payment_events (dedupe_key)
        `);
      }
    }
  }
};
