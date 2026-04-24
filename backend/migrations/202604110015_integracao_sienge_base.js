const { tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'sienge_integracao_config'))) {
      await sequelize.query(`
        CREATE TABLE sienge_integracao_config (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          ativo TINYINT(1) NOT NULL DEFAULT 0,
          base_url_override VARCHAR(255) NULL,
          endpoint_titulos VARCHAR(255) NULL,
          documento_padrao_id INT NULL,
          indexador_padrao_id INT NULL,
          timeout_ms INT NOT NULL DEFAULT 20000,
          max_tentativas INT NOT NULL DEFAULT 3,
          payload_defaults_json JSON NULL,
          observacoes TEXT NULL,
          criado_por INT NULL,
          atualizado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_sienge_integracao_config_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_sienge_integracao_config_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_sienge_integracao_config_ativo (ativo)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'sienge_integracao_fila'))) {
      await sequelize.query(`
        CREATE TABLE sienge_integracao_fila (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          titulo_financeiro_id INT NOT NULL,
          origem_modulo VARCHAR(40) NOT NULL DEFAULT 'FINANCEIRO',
          status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
          tentativas INT NOT NULL DEFAULT 0,
          enviado_em DATETIME NULL,
          ultimo_erro TEXT NULL,
          payload_snapshot JSON NULL,
          response_snapshot JSON NULL,
          external_title_id VARCHAR(120) NULL,
          external_creditor_id VARCHAR(120) NULL,
          criado_por INT NULL,
          atualizado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_sienge_integracao_fila_titulo FOREIGN KEY (titulo_financeiro_id) REFERENCES titulos_financeiros(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_sienge_integracao_fila_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_sienge_integracao_fila_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          UNIQUE KEY uq_sienge_integracao_fila_titulo (titulo_financeiro_id),
          KEY idx_sienge_integracao_fila_status (status),
          KEY idx_sienge_integracao_fila_origem (origem_modulo),
          KEY idx_sienge_integracao_fila_enviado_em (enviado_em)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'sienge_integracao_logs'))) {
      await sequelize.query(`
        CREATE TABLE sienge_integracao_logs (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          fila_id INT NOT NULL,
          acao VARCHAR(60) NOT NULL,
          status VARCHAR(20) NOT NULL,
          mensagem TEXT NULL,
          request_snapshot JSON NULL,
          response_snapshot JSON NULL,
          criado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_sienge_integracao_logs_fila FOREIGN KEY (fila_id) REFERENCES sienge_integracao_fila(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_sienge_integracao_logs_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_sienge_integracao_logs_status (status),
          KEY idx_sienge_integracao_logs_created (createdAt)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'sienge_integracao_mapeamentos'))) {
      await sequelize.query(`
        CREATE TABLE sienge_integracao_mapeamentos (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          entidade_tipo VARCHAR(40) NOT NULL,
          entidade_id INT NOT NULL,
          external_id VARCHAR(120) NOT NULL,
          metadata_json JSON NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          criado_por INT NULL,
          atualizado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_sienge_integracao_mapeamentos_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_sienge_integracao_mapeamentos_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          UNIQUE KEY uq_sienge_integracao_mapeamentos_entidade (entidade_tipo, entidade_id),
          KEY idx_sienge_integracao_mapeamentos_external (external_id),
          KEY idx_sienge_integracao_mapeamentos_ativo (ativo)
        )
      `);
    }
  }
};
