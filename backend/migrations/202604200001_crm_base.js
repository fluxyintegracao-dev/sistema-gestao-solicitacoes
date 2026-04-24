const { tableExists, columnExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    // -------------------------------------------------------
    // crm_config — configurações CRM por tenant
    // -------------------------------------------------------
    if (!(await tableExists(sequelize, 'crm_config'))) {
      await sequelize.query(`
        CREATE TABLE crm_config (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          chave VARCHAR(120) NOT NULL,
          valor TEXT NULL,
          descricao VARCHAR(255) NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_crm_config_chave (chave)
        )
      `);
      await sequelize.query(`
        INSERT INTO crm_config (chave, valor, descricao) VALUES
          ('CRM_HABILITADO', 'true', 'Habilita o modulo CRM'),
          ('CRM_ROLLOUT_FASE', '1', 'Fase atual de implantacao do CRM (1=piloto, 2=expansao, 3=completo)'),
          ('CRM_DEDUP_CAMPOS', '["telefone","email"]', 'Campos usados para deduplicacao de leads'),
          ('CRM_DISTRIBUICAO_MODO', 'ROUND_ROBIN', 'Modo de distribuicao de leads: ROUND_ROBIN, WEIGHTED, MANUAL'),
          ('CRM_PIPELINE_PADRAO_ID', NULL, 'ID do pipeline padrao'),
          ('CRM_SLA_PRIMEIRO_CONTATO_MIN', '60', 'SLA em minutos para primeiro contato apos novo lead')
      `);
    }

    // -------------------------------------------------------
    // crm_pipelines
    // -------------------------------------------------------
    if (!(await tableExists(sequelize, 'crm_pipelines'))) {
      await sequelize.query(`
        CREATE TABLE crm_pipelines (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(120) NOT NULL,
          descricao VARCHAR(255) NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          is_default TINYINT(1) NOT NULL DEFAULT 0,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          KEY idx_crm_pipelines_ativo (ativo)
        )
      `);
      await sequelize.query(`
        INSERT INTO crm_pipelines (nome, descricao, ativo, is_default) VALUES
          ('Pipeline Principal', 'Funil comercial padrao', 1, 1)
      `);
    }

    // -------------------------------------------------------
    // crm_pipeline_stages
    // -------------------------------------------------------
    if (!(await tableExists(sequelize, 'crm_pipeline_stages'))) {
      await sequelize.query(`
        CREATE TABLE crm_pipeline_stages (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          pipeline_id INT NOT NULL,
          nome VARCHAR(120) NOT NULL,
          ordem INT NOT NULL DEFAULT 0,
          cor VARCHAR(20) NOT NULL DEFAULT '#6366f1',
          is_initial TINYINT(1) NOT NULL DEFAULT 0,
          is_won TINYINT(1) NOT NULL DEFAULT 0,
          is_lost TINYINT(1) NOT NULL DEFAULT 0,
          requires_loss_reason TINYINT(1) NOT NULL DEFAULT 0,
          requires_followup TINYINT(1) NOT NULL DEFAULT 0,
          sla_minutes INT NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_crm_stages_pipeline FOREIGN KEY (pipeline_id) REFERENCES crm_pipelines(id) ON DELETE CASCADE ON UPDATE CASCADE,
          KEY idx_crm_stages_pipeline (pipeline_id),
          KEY idx_crm_stages_ordem (pipeline_id, ordem)
        )
      `);
      await sequelize.query(`
        INSERT INTO crm_pipeline_stages
          (pipeline_id, nome, ordem, cor, is_initial, is_won, is_lost, requires_loss_reason, requires_followup, sla_minutes)
        VALUES
          (1, 'Novo Lead',          1,  '#6366f1', 1, 0, 0, 0, 0, 60),
          (1, 'Aguardando Contato', 2,  '#8b5cf6', 0, 0, 0, 0, 1, 120),
          (1, 'Em Atendimento',     3,  '#3b82f6', 0, 0, 0, 0, 1, NULL),
          (1, 'Contato Realizado',  4,  '#06b6d4', 0, 0, 0, 0, 1, NULL),
          (1, 'Qualificado',        5,  '#10b981', 0, 0, 0, 0, 1, NULL),
          (1, 'Agendamento',        6,  '#f59e0b', 0, 0, 0, 0, 1, NULL),
          (1, 'Proposta',           7,  '#f97316', 0, 0, 0, 0, 1, NULL),
          (1, 'Negociacao',         8,  '#ef4444', 0, 0, 0, 0, 1, NULL),
          (1, 'Fechado Ganho',      9,  '#22c55e', 0, 1, 0, 0, 0, NULL),
          (1, 'Perdido',            10, '#6b7280', 0, 0, 1, 1, 0, NULL),
          (1, 'Nutricao',           11, '#a78bfa', 0, 0, 0, 0, 1, NULL)
      `);
    }

    // -------------------------------------------------------
    // crm_loss_reasons
    // -------------------------------------------------------
    if (!(await tableExists(sequelize, 'crm_loss_reasons'))) {
      await sequelize.query(`
        CREATE TABLE crm_loss_reasons (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(120) NOT NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          ordem INT NOT NULL DEFAULT 0,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          KEY idx_crm_loss_reasons_ativo (ativo)
        )
      `);
      await sequelize.query(`
        INSERT INTO crm_loss_reasons (nome, ordem) VALUES
          ('Sem interesse', 1),
          ('Preco fora do perfil', 2),
          ('Comprou com concorrente', 3),
          ('Lead invalido / sem contato', 4),
          ('Ja possui imovel', 5),
          ('Perfil financeiro incompativel', 6),
          ('Fora da regiao de interesse', 7),
          ('Desistiu durante negociacao', 8),
          ('Outros', 99)
      `);
    }

    // -------------------------------------------------------
    // crm_leads — tabela principal
    // -------------------------------------------------------
    if (!(await tableExists(sequelize, 'crm_leads'))) {
      await sequelize.query(`
        CREATE TABLE crm_leads (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,

          -- origem
          external_source_id VARCHAR(120) NULL,
          source_type ENUM('META_ADS','GOOGLE_ADS','MANUAL','SITE','INDICACAO','OUTRO') NOT NULL DEFAULT 'MANUAL',
          source_name VARCHAR(120) NULL,
          source_detail TEXT NULL,
          campaign_name VARCHAR(120) NULL,
          adset_name VARCHAR(120) NULL,
          ad_name VARCHAR(120) NULL,
          form_name VARCHAR(120) NULL,
          landing_page_url TEXT NULL,
          utm_source VARCHAR(120) NULL,
          utm_medium VARCHAR(120) NULL,
          utm_campaign VARCHAR(120) NULL,
          utm_content VARCHAR(120) NULL,
          utm_term VARCHAR(120) NULL,

          -- dados do lead
          nome VARCHAR(160) NOT NULL,
          telefone VARCHAR(30) NULL,
          email VARCHAR(120) NULL,
          documento VARCHAR(30) NULL,
          cidade VARCHAR(120) NULL,
          estado VARCHAR(2) NULL,
          empreendimento_interesse VARCHAR(160) NULL,
          produto_interesse VARCHAR(160) NULL,
          faixa_valor VARCHAR(80) NULL,
          observacoes TEXT NULL,
          tags JSON NULL,

          -- qualificacao
          score TINYINT UNSIGNED NOT NULL DEFAULT 0,
          temperatura ENUM('FRIO','MORNO','QUENTE') NOT NULL DEFAULT 'FRIO',
          lifecycle_status ENUM('NOVO','CONTATO','QUALIFICADO','OPORTUNIDADE','CONVERTIDO','PERDIDO','ARQUIVADO') NOT NULL DEFAULT 'NOVO',

          -- funil
          pipeline_id INT NULL,
          pipeline_stage_id INT NULL,

          -- atribuicao
          assigned_user_id INT NULL,
          owner_type ENUM('INDIVIDUAL','SHARED','POOL') NOT NULL DEFAULT 'INDIVIDUAL',

          -- datas de acompanhamento
          primeiro_contato_at DATETIME NULL,
          ultima_interacao_at DATETIME NULL,
          proximo_followup_at DATETIME NULL,
          convertido_at DATETIME NULL,
          archived_at DATETIME NULL,

          -- perda
          motivo_perda_id INT NULL,
          motivo_perda_obs TEXT NULL,

          -- audit
          criado_por INT NULL,
          atualizado_por INT NULL,

          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

          CONSTRAINT fk_crm_leads_pipeline FOREIGN KEY (pipeline_id) REFERENCES crm_pipelines(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_crm_leads_stage FOREIGN KEY (pipeline_stage_id) REFERENCES crm_pipeline_stages(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_crm_leads_assigned_user FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_crm_leads_motivo_perda FOREIGN KEY (motivo_perda_id) REFERENCES crm_loss_reasons(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_crm_leads_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_crm_leads_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,

          KEY idx_crm_leads_lifecycle (lifecycle_status),
          KEY idx_crm_leads_temperatura (temperatura),
          KEY idx_crm_leads_stage (pipeline_stage_id),
          KEY idx_crm_leads_assigned (assigned_user_id),
          KEY idx_crm_leads_source_type (source_type),
          KEY idx_crm_leads_followup (proximo_followup_at),
          KEY idx_crm_leads_created (createdAt),
          KEY idx_crm_leads_external_source (external_source_id),
          KEY idx_crm_leads_telefone (telefone),
          KEY idx_crm_leads_email (email)
        )
      `);
    }

    // -------------------------------------------------------
    // crm_audit_logs — rastreabilidade
    // -------------------------------------------------------
    if (!(await tableExists(sequelize, 'crm_audit_logs'))) {
      await sequelize.query(`
        CREATE TABLE crm_audit_logs (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          lead_id INT NULL,
          user_id INT NULL,
          event_type VARCHAR(80) NOT NULL,
          resource_type VARCHAR(60) NOT NULL DEFAULT 'LEAD',
          resource_id INT NULL,
          field_changed VARCHAR(80) NULL,
          old_value TEXT NULL,
          new_value TEXT NULL,
          metadata JSON NULL,
          ip_address VARCHAR(45) NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_crm_audit_lead FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_crm_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_crm_audit_lead (lead_id),
          KEY idx_crm_audit_user (user_id),
          KEY idx_crm_audit_event (event_type),
          KEY idx_crm_audit_created (createdAt)
        )
      `);
    }

    // Atualizar crm_config com pipeline padrão
    await sequelize.query(`
      UPDATE crm_config SET valor = '1' WHERE chave = 'CRM_PIPELINE_PADRAO_ID' AND (valor IS NULL OR valor = '')
    `);
  }
};
