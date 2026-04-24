const { tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    // -------------------------------------------------------
    // crm_interactions — timeline de interacoes do lead
    // -------------------------------------------------------
    if (!(await tableExists(sequelize, 'crm_interactions'))) {
      await sequelize.query(`
        CREATE TABLE crm_interactions (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          lead_id INT NOT NULL,
          user_id INT NULL,
          interaction_type ENUM('CALL','WHATSAPP','NOTE','EMAIL','MEETING','STATUS_CHANGE','SYSTEM_EVENT') NOT NULL DEFAULT 'NOTE',
          title VARCHAR(200) NULL,
          content TEXT NULL,
          metadata_json JSON NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_crm_interactions_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_crm_interactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_crm_interactions_lead (lead_id),
          KEY idx_crm_interactions_type (interaction_type),
          KEY idx_crm_interactions_created (createdAt)
        )
      `);
    }

    // -------------------------------------------------------
    // crm_tasks — tarefas e follow-up
    // -------------------------------------------------------
    if (!(await tableExists(sequelize, 'crm_tasks'))) {
      await sequelize.query(`
        CREATE TABLE crm_tasks (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          lead_id INT NOT NULL,
          assigned_user_id INT NULL,
          title VARCHAR(200) NOT NULL,
          description TEXT NULL,
          task_type ENUM('CALL','VISIT','WHATSAPP','EMAIL','PROPOSAL','OTHER') NOT NULL DEFAULT 'OTHER',
          due_at DATETIME NULL,
          completed_at DATETIME NULL,
          status ENUM('PENDING','DONE','OVERDUE','CANCELLED') NOT NULL DEFAULT 'PENDING',
          priority ENUM('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
          metadata_json JSON NULL,
          criado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_crm_tasks_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_crm_tasks_assigned FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_crm_tasks_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_crm_tasks_lead (lead_id),
          KEY idx_crm_tasks_assigned (assigned_user_id),
          KEY idx_crm_tasks_status (status),
          KEY idx_crm_tasks_due (due_at),
          KEY idx_crm_tasks_created (createdAt)
        )
      `);
    }

    // -------------------------------------------------------
    // crm_rollout_phases — fases de implantacao por tenant
    // -------------------------------------------------------
    if (!(await tableExists(sequelize, 'crm_rollout_phases'))) {
      await sequelize.query(`
        CREATE TABLE crm_rollout_phases (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          chave VARCHAR(80) NOT NULL,
          nome VARCHAR(120) NOT NULL,
          descricao TEXT NULL,
          ordem INT NOT NULL DEFAULT 0,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          is_current TINYINT(1) NOT NULL DEFAULT 0,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_crm_rollout_chave (chave),
          KEY idx_crm_rollout_current (is_current)
        )
      `);
      await sequelize.query(`
        INSERT INTO crm_rollout_phases (chave, nome, descricao, ordem, ativo, is_current) VALUES
          ('pilot_selected_brokers', 'Piloto com corretores selecionados', 'Operacao com grupo reduzido de corretores selecionados', 1, 1, 1),
          ('expanded_broker_base', 'Base expandida de corretores', 'Operacao com todos os corretores ativos', 2, 1, 0),
          ('internal_prequalification', 'Pre-qualificacao interna', 'Equipe interna pre-qualifica antes de distribuir para corretores', 3, 1, 0),
          ('full_omnichannel', 'Operacao omnichannel completa', 'Integracao completa com todos os canais e automacoes', 4, 1, 0)
      `);
    }
  }
};
