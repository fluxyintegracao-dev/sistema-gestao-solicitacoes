const { tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    // -------------------------------------------------------
    // crm_channels — canais de comunicacao com distinção de numeros
    // -------------------------------------------------------
    if (!(await tableExists(sequelize, 'crm_channels'))) {
      await sequelize.query(`
        CREATE TABLE crm_channels (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(120) NOT NULL,
          type ENUM('WHATSAPP','PHONE','EMAIL','FORM','CHAT') NOT NULL DEFAULT 'WHATSAPP',
          status ENUM('ACTIVE','INACTIVE','BLOCKED') NOT NULL DEFAULT 'ACTIVE',
          provider VARCHAR(80) NULL,
          public_label VARCHAR(120) NULL,
          business_main_phone VARCHAR(30) NULL,
          operational_phone VARCHAR(30) NULL,
          tracking_phone VARCHAR(30) NULL,
          destination_phone VARCHAR(30) NULL,
          meta_waba_id VARCHAR(120) NULL,
          meta_phone_number_id VARCHAR(120) NULL,
          google_customer_id VARCHAR(120) NULL,
          config_json JSON NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          KEY idx_crm_channels_type (type),
          KEY idx_crm_channels_status (status)
        )
      `);
    }

    // -------------------------------------------------------
    // crm_phone_assets — ativos de numero com papel definido
    // -------------------------------------------------------
    if (!(await tableExists(sequelize, 'crm_phone_assets'))) {
      await sequelize.query(`
        CREATE TABLE crm_phone_assets (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          label VARCHAR(120) NOT NULL,
          phone_number VARCHAR(30) NOT NULL,
          country_code VARCHAR(5) NOT NULL DEFAULT '+55',
          role_type ENUM('MAIN','OPERATIONAL','TRACKING','DESTINATION') NOT NULL,
          provider VARCHAR(80) NULL,
          is_whatsapp_enabled TINYINT(1) NOT NULL DEFAULT 0,
          is_google_ads_enabled TINYINT(1) NOT NULL DEFAULT 0,
          is_meta_ads_enabled TINYINT(1) NOT NULL DEFAULT 0,
          display_name VARCHAR(120) NULL,
          risk_level ENUM('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'LOW',
          can_receive_messages TINYINT(1) NOT NULL DEFAULT 1,
          can_receive_calls TINYINT(1) NOT NULL DEFAULT 1,
          forward_to_phone VARCHAR(30) NULL,
          status ENUM('ACTIVE','INACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
          notes TEXT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          KEY idx_crm_phone_role (role_type),
          KEY idx_crm_phone_status (status),
          KEY idx_crm_phone_number (phone_number)
        )
      `);
    }

    // -------------------------------------------------------
    // crm_integration_meta_events — eventos do webhook Meta Ads
    // -------------------------------------------------------
    if (!(await tableExists(sequelize, 'crm_integration_meta_events'))) {
      await sequelize.query(`
        CREATE TABLE crm_integration_meta_events (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          external_event_id VARCHAR(120) NULL,
          event_type VARCHAR(80) NULL,
          campaign_name VARCHAR(160) NULL,
          adset_name VARCHAR(160) NULL,
          ad_name VARCHAR(160) NULL,
          form_name VARCHAR(160) NULL,
          page_id VARCHAR(80) NULL,
          form_id VARCHAR(80) NULL,
          payload_json JSON NOT NULL,
          processing_status ENUM('PENDING','PROCESSED','DUPLICATE','ERROR') NOT NULL DEFAULT 'PENDING',
          processed_lead_id INT NULL,
          error_message TEXT NULL,
          received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          processed_at DATETIME NULL,
          CONSTRAINT fk_crm_meta_lead FOREIGN KEY (processed_lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL ON UPDATE CASCADE,
          UNIQUE KEY uk_meta_external_event (external_event_id),
          KEY idx_crm_meta_status (processing_status),
          KEY idx_crm_meta_received (received_at)
        )
      `);
    }

    // -------------------------------------------------------
    // crm_integration_google_events — eventos do webhook Google Ads
    // -------------------------------------------------------
    if (!(await tableExists(sequelize, 'crm_integration_google_events'))) {
      await sequelize.query(`
        CREATE TABLE crm_integration_google_events (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          external_event_id VARCHAR(120) NULL,
          event_type VARCHAR(80) NULL,
          campaign_name VARCHAR(160) NULL,
          ad_group_name VARCHAR(160) NULL,
          asset_name VARCHAR(160) NULL,
          tracking_phone VARCHAR(30) NULL,
          destination_phone VARCHAR(30) NULL,
          payload_json JSON NOT NULL,
          processing_status ENUM('PENDING','PROCESSED','DUPLICATE','ERROR') NOT NULL DEFAULT 'PENDING',
          processed_lead_id INT NULL,
          error_message TEXT NULL,
          received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          processed_at DATETIME NULL,
          CONSTRAINT fk_crm_google_lead FOREIGN KEY (processed_lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_crm_google_status (processing_status),
          KEY idx_crm_google_external (external_event_id),
          KEY idx_crm_google_received (received_at)
        )
      `);
    }

    // Adicionar chaves de config para webhooks se ainda nao existem
    await sequelize.query(`
      INSERT IGNORE INTO crm_config (chave, valor, descricao) VALUES
        ('CRM_META_WEBHOOK_SECRET', NULL, 'Token secreto para validacao de assinatura do webhook Meta'),
        ('CRM_META_VERIFY_TOKEN', NULL, 'Token de verificacao para handshake inicial do webhook Meta'),
        ('CRM_GOOGLE_WEBHOOK_SECRET', NULL, 'Token secreto para validacao do webhook Google Ads')
    `);
  }
};
