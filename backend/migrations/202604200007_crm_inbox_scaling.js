const { indexExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await indexExists(sequelize, 'crm_messages', 'idx_crm_messages_conversation_created'))) {
      await sequelize.query(`
        ALTER TABLE crm_messages
        ADD KEY idx_crm_messages_conversation_created (conversation_id, createdAt)
      `);
    }

    if (!(await indexExists(sequelize, 'crm_messages', 'idx_crm_messages_conversation_id'))) {
      await sequelize.query(`
        ALTER TABLE crm_messages
        ADD KEY idx_crm_messages_conversation_id (conversation_id, id)
      `);
    }

    if (!(await indexExists(sequelize, 'crm_conversations', 'idx_crm_conversations_assigned_status_last'))) {
      await sequelize.query(`
        ALTER TABLE crm_conversations
        ADD KEY idx_crm_conversations_assigned_status_last (assigned_user_id, status, last_message_at)
      `);
    }

    if (!(await indexExists(sequelize, 'crm_conversations', 'idx_crm_conversations_lead_status_last'))) {
      await sequelize.query(`
        ALTER TABLE crm_conversations
        ADD KEY idx_crm_conversations_lead_status_last (lead_id, status, last_message_at)
      `);
    }

    if (!(await indexExists(sequelize, 'crm_conversation_participants', 'idx_crm_participants_user_conversation'))) {
      await sequelize.query(`
        ALTER TABLE crm_conversation_participants
        ADD KEY idx_crm_participants_user_conversation (user_id, conversation_id)
      `);
    }
  }
};
