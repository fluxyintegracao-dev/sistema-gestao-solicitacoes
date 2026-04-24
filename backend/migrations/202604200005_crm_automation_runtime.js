const { tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'crm_automation_executions'))) {
      await sequelize.query(`
        CREATE TABLE crm_automation_executions (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          rule_id INT NOT NULL,
          lead_id INT NULL,
          conversation_id INT NULL,
          trigger_type ENUM('LEAD_CREATED','NO_FIRST_CONTACT','NO_ACTIVITY','STAGE_CHANGED','MESSAGE_RECEIVED','LEAD_REFUSED','DAILY_LIMIT_REACHED','ROLLOUT_PHASE_CHANGED') NOT NULL,
          execution_key VARCHAR(255) NOT NULL,
          status ENUM('PROCESSING','SUCCESS','SKIPPED','ERROR') NOT NULL DEFAULT 'PROCESSING',
          message VARCHAR(255) NULL,
          metadata_json JSON NULL,
          created_by_user_id INT NULL,
          processed_at DATETIME NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_crm_automation_exec_rule FOREIGN KEY (rule_id) REFERENCES crm_automation_rules(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_crm_automation_exec_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_crm_automation_exec_conversation FOREIGN KEY (conversation_id) REFERENCES crm_conversations(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_crm_automation_exec_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          UNIQUE KEY uk_crm_automation_exec_key (execution_key),
          KEY idx_crm_automation_exec_rule (rule_id),
          KEY idx_crm_automation_exec_trigger (trigger_type),
          KEY idx_crm_automation_exec_status (status),
          KEY idx_crm_automation_exec_processed (processed_at)
        )
      `);
    }
  }
};
