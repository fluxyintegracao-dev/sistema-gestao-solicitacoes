const {
  columnExists,
  foreignKeyExists,
  indexExists
} = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await columnExists(sequelize, 'crm_integration_meta_events', 'processed_conversation_id'))) {
      await sequelize.query(`
        ALTER TABLE crm_integration_meta_events
        ADD COLUMN processed_conversation_id INT NULL AFTER processed_lead_id
      `);
    }

    if (!(await columnExists(sequelize, 'crm_integration_meta_events', 'processed_message_id'))) {
      await sequelize.query(`
        ALTER TABLE crm_integration_meta_events
        ADD COLUMN processed_message_id INT NULL AFTER processed_conversation_id
      `);
    }

    if (!(await indexExists(sequelize, 'crm_integration_meta_events', 'idx_crm_meta_processed_conversation'))) {
      await sequelize.query(`
        ALTER TABLE crm_integration_meta_events
        ADD KEY idx_crm_meta_processed_conversation (processed_conversation_id)
      `);
    }

    if (!(await indexExists(sequelize, 'crm_integration_meta_events', 'idx_crm_meta_processed_message'))) {
      await sequelize.query(`
        ALTER TABLE crm_integration_meta_events
        ADD KEY idx_crm_meta_processed_message (processed_message_id)
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'crm_integration_meta_events', 'fk_crm_meta_conversation'))) {
      await sequelize.query(`
        ALTER TABLE crm_integration_meta_events
        ADD CONSTRAINT fk_crm_meta_conversation
        FOREIGN KEY (processed_conversation_id) REFERENCES crm_conversations(id)
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'crm_integration_meta_events', 'fk_crm_meta_message'))) {
      await sequelize.query(`
        ALTER TABLE crm_integration_meta_events
        ADD CONSTRAINT fk_crm_meta_message
        FOREIGN KEY (processed_message_id) REFERENCES crm_messages(id)
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
    }

    if (!(await columnExists(sequelize, 'crm_integration_google_events', 'processed_conversation_id'))) {
      await sequelize.query(`
        ALTER TABLE crm_integration_google_events
        ADD COLUMN processed_conversation_id INT NULL AFTER processed_lead_id
      `);
    }

    if (!(await columnExists(sequelize, 'crm_integration_google_events', 'processed_message_id'))) {
      await sequelize.query(`
        ALTER TABLE crm_integration_google_events
        ADD COLUMN processed_message_id INT NULL AFTER processed_conversation_id
      `);
    }

    if (!(await indexExists(sequelize, 'crm_integration_google_events', 'idx_crm_google_processed_conversation'))) {
      await sequelize.query(`
        ALTER TABLE crm_integration_google_events
        ADD KEY idx_crm_google_processed_conversation (processed_conversation_id)
      `);
    }

    if (!(await indexExists(sequelize, 'crm_integration_google_events', 'idx_crm_google_processed_message'))) {
      await sequelize.query(`
        ALTER TABLE crm_integration_google_events
        ADD KEY idx_crm_google_processed_message (processed_message_id)
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'crm_integration_google_events', 'fk_crm_google_conversation'))) {
      await sequelize.query(`
        ALTER TABLE crm_integration_google_events
        ADD CONSTRAINT fk_crm_google_conversation
        FOREIGN KEY (processed_conversation_id) REFERENCES crm_conversations(id)
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'crm_integration_google_events', 'fk_crm_google_message'))) {
      await sequelize.query(`
        ALTER TABLE crm_integration_google_events
        ADD CONSTRAINT fk_crm_google_message
        FOREIGN KEY (processed_message_id) REFERENCES crm_messages(id)
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
    }
  }
};
