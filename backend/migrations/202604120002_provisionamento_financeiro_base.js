const { indexExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'provisao_categorias_macro'))) {
      await sequelize.query(`
        CREATE TABLE provisao_categorias_macro (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(160) NOT NULL,
          descricao TEXT NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          ordem_exibicao INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_provisao_categorias_macro_nome (nome),
          KEY idx_provisao_categorias_macro_ativo (ativo),
          KEY idx_provisao_categorias_macro_ordem (ordem_exibicao)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'provisao_financeira_sequencias'))) {
      await sequelize.query(`
        CREATE TABLE provisao_financeira_sequencias (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          obra_id INT NOT NULL,
          ultimo_numero INT NOT NULL DEFAULT 0,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_provisao_financeira_sequencias_obra FOREIGN KEY (obra_id) REFERENCES obras(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          UNIQUE KEY uq_provisao_financeira_sequencias_obra (obra_id)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'provisoes_financeiras'))) {
      await sequelize.query(`
        CREATE TABLE provisoes_financeiras (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          codigo VARCHAR(80) NOT NULL,
          obra_id INT NOT NULL,
          categoria_macro_id INT NOT NULL,
          descricao TEXT NOT NULL,
          fornecedor_id INT NULL,
          fornecedor_texto VARCHAR(180) NULL,
          data_prevista_desembolso DATE NOT NULL,
          valor_previsto DECIMAL(15,2) NOT NULL,
          comentario TEXT NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'previsto',
          prioridade VARCHAR(20) NULL,
          usuario_criacao_id INT NOT NULL,
          usuario_atualizacao_id INT NULL,
          aprovado_por_id INT NULL,
          aprovado_em DATETIME NULL,
          cancelado_por_id INT NULL,
          cancelado_em DATETIME NULL,
          realizado_em DATETIME NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          deletedAt DATETIME NULL,
          CONSTRAINT fk_provisoes_financeiras_obra FOREIGN KEY (obra_id) REFERENCES obras(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_provisoes_financeiras_categoria_macro FOREIGN KEY (categoria_macro_id) REFERENCES provisao_categorias_macro(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_provisoes_financeiras_fornecedor FOREIGN KEY (fornecedor_id) REFERENCES parceiros(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_provisoes_financeiras_usuario_criacao FOREIGN KEY (usuario_criacao_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_provisoes_financeiras_usuario_atualizacao FOREIGN KEY (usuario_atualizacao_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_provisoes_financeiras_aprovado_por FOREIGN KEY (aprovado_por_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_provisoes_financeiras_cancelado_por FOREIGN KEY (cancelado_por_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          UNIQUE KEY uq_provisoes_financeiras_codigo (codigo),
          KEY idx_provisoes_financeiras_obra (obra_id),
          KEY idx_provisoes_financeiras_categoria (categoria_macro_id),
          KEY idx_provisoes_financeiras_status (status),
          KEY idx_provisoes_financeiras_data (data_prevista_desembolso),
          KEY idx_provisoes_financeiras_valor (valor_previsto),
          KEY idx_provisoes_financeiras_prioridade (prioridade),
          KEY idx_provisoes_financeiras_deleted (deletedAt)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'provisao_financeira_historico'))) {
      await sequelize.query(`
        CREATE TABLE provisao_financeira_historico (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          provisao_financeira_id INT NOT NULL,
          usuario_id INT NULL,
          acao VARCHAR(60) NOT NULL,
          status_anterior VARCHAR(30) NULL,
          status_novo VARCHAR(30) NULL,
          descricao TEXT NULL,
          comentario TEXT NULL,
          dados_antes_json JSON NULL,
          dados_depois_json JSON NULL,
          metadata_json JSON NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_provisao_financeira_historico_provisao FOREIGN KEY (provisao_financeira_id) REFERENCES provisoes_financeiras(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_provisao_financeira_historico_usuario FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_provisao_financeira_historico_provisao (provisao_financeira_id),
          KEY idx_provisao_financeira_historico_acao (acao),
          KEY idx_provisao_financeira_historico_created (createdAt)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'provisao_financeira_anexos'))) {
      await sequelize.query(`
        CREATE TABLE provisao_financeira_anexos (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          provisao_financeira_id INT NOT NULL,
          nome_original VARCHAR(255) NOT NULL,
          caminho_arquivo TEXT NOT NULL,
          tipo VARCHAR(40) NOT NULL DEFAULT 'ANEXO',
          uploaded_by INT NOT NULL,
          area_origem VARCHAR(80) NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_provisao_financeira_anexos_provisao FOREIGN KEY (provisao_financeira_id) REFERENCES provisoes_financeiras(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_provisao_financeira_anexos_upload_user FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          KEY idx_provisao_financeira_anexos_provisao (provisao_financeira_id),
          KEY idx_provisao_financeira_anexos_upload_user (uploaded_by),
          KEY idx_provisao_financeira_anexos_created (createdAt)
        )
      `);
    }

    if (!(await indexExists(sequelize, 'provisoes_financeiras', 'idx_provisoes_financeiras_obra_status_data'))) {
      await sequelize.query(`
        CREATE INDEX idx_provisoes_financeiras_obra_status_data
          ON provisoes_financeiras (obra_id, status, data_prevista_desembolso)
      `);
    }

    if (!(await indexExists(sequelize, 'provisoes_financeiras', 'idx_provisoes_financeiras_categoria_data'))) {
      await sequelize.query(`
        CREATE INDEX idx_provisoes_financeiras_categoria_data
          ON provisoes_financeiras (categoria_macro_id, data_prevista_desembolso)
      `);
    }
  }
};
