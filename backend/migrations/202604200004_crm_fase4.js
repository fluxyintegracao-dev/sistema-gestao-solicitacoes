const { tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'crm_conversations'))) {
      await sequelize.query(`
        CREATE TABLE crm_conversations (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          lead_id INT NULL,
          channel_id INT NULL,
          phone_asset_id INT NULL,
          assigned_user_id INT NULL,
          external_conversation_id VARCHAR(160) NULL,
          channel_type ENUM('WHATSAPP','PHONE','EMAIL','FORM','CHAT','OTHER') NOT NULL DEFAULT 'WHATSAPP',
          status ENUM('OPEN','PENDING','RESOLVED','ARCHIVED') NOT NULL DEFAULT 'OPEN',
          priority ENUM('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
          contact_name VARCHAR(160) NULL,
          contact_phone VARCHAR(30) NULL,
          contact_email VARCHAR(160) NULL,
          subject VARCHAR(200) NULL,
          last_message_preview VARCHAR(255) NULL,
          last_message_at DATETIME NULL,
          unread_count INT NOT NULL DEFAULT 0,
          closed_at DATETIME NULL,
          created_by_user_id INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_crm_conversations_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_crm_conversations_channel FOREIGN KEY (channel_id) REFERENCES crm_channels(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_crm_conversations_phone_asset FOREIGN KEY (phone_asset_id) REFERENCES crm_phone_assets(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_crm_conversations_assigned FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_crm_conversations_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_crm_conversations_status (status),
          KEY idx_crm_conversations_channel_type (channel_type),
          KEY idx_crm_conversations_assigned (assigned_user_id),
          KEY idx_crm_conversations_last_message (last_message_at),
          KEY idx_crm_conversations_external (external_conversation_id)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'crm_messages'))) {
      await sequelize.query(`
        CREATE TABLE crm_messages (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          conversation_id INT NOT NULL,
          lead_id INT NULL,
          user_id INT NULL,
          external_message_id VARCHAR(160) NULL,
          sender_type ENUM('USER','CONTACT','SYSTEM','INTERNAL') NOT NULL DEFAULT 'USER',
          direction ENUM('INBOUND','OUTBOUND','INTERNAL') NOT NULL DEFAULT 'OUTBOUND',
          message_type ENUM('TEXT','NOTE','TEMPLATE','FILE','EVENT') NOT NULL DEFAULT 'TEXT',
          content TEXT NOT NULL,
          metadata_json JSON NULL,
          read_at DATETIME NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_crm_messages_conversation FOREIGN KEY (conversation_id) REFERENCES crm_conversations(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_crm_messages_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_crm_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_crm_messages_conversation (conversation_id),
          KEY idx_crm_messages_lead (lead_id),
          KEY idx_crm_messages_created (createdAt),
          KEY idx_crm_messages_external (external_message_id)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'crm_message_templates'))) {
      await sequelize.query(`
        CREATE TABLE crm_message_templates (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(160) NOT NULL,
          channel_type ENUM('WHATSAPP','PHONE','EMAIL','FORM','CHAT','OTHER') NOT NULL DEFAULT 'WHATSAPP',
          categoria VARCHAR(80) NULL,
          content TEXT NOT NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          created_by_user_id INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_crm_templates_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_crm_templates_channel (channel_type),
          KEY idx_crm_templates_ativo (ativo)
        )
      `);

      await sequelize.query(`
        INSERT INTO crm_message_templates (nome, channel_type, categoria, content, ativo)
        VALUES
          ('Primeiro contato WhatsApp', 'WHATSAPP', 'ABORDAGEM', 'Olá, tudo bem? Recebemos seu interesse e podemos te ajudar com mais informações.', 1),
          ('Follow-up comercial', 'WHATSAPP', 'FOLLOW_UP', 'Passando para saber se ficou alguma dúvida e se podemos avançar para o próximo passo.', 1)
      `);
    }

    if (!(await tableExists(sequelize, 'crm_conversation_participants'))) {
      await sequelize.query(`
        CREATE TABLE crm_conversation_participants (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          conversation_id INT NOT NULL,
          user_id INT NOT NULL,
          role ENUM('OWNER','PARTICIPANT','WATCHER') NOT NULL DEFAULT 'PARTICIPANT',
          unread_count INT NOT NULL DEFAULT 0,
          last_read_at DATETIME NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_crm_participants_conversation FOREIGN KEY (conversation_id) REFERENCES crm_conversations(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_crm_participants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
          UNIQUE KEY uk_crm_participants_conversation_user (conversation_id, user_id),
          KEY idx_crm_participants_user (user_id)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'crm_automation_rules'))) {
      await sequelize.query(`
        CREATE TABLE crm_automation_rules (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(160) NOT NULL,
          trigger_type ENUM('LEAD_CREATED','NO_FIRST_CONTACT','NO_ACTIVITY','STAGE_CHANGED','MESSAGE_RECEIVED','LEAD_REFUSED','DAILY_LIMIT_REACHED','ROLLOUT_PHASE_CHANGED') NOT NULL,
          conditions_json JSON NULL,
          actions_json JSON NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          priority INT NOT NULL DEFAULT 100,
          last_run_at DATETIME NULL,
          created_by_user_id INT NULL,
          updated_by_user_id INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_crm_automation_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_crm_automation_updated_by FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_crm_automation_trigger (trigger_type),
          KEY idx_crm_automation_ativo (ativo),
          KEY idx_crm_automation_priority (priority)
        )
      `);
    }
  }
};
