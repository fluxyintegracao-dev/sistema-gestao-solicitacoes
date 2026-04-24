const {
  columnExists,
  foreignKeyExists,
  indexExists,
  tableExists
} = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'tabelas_precos_comerciais'))) {
      await sequelize.query(`
        CREATE TABLE tabelas_precos_comerciais (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          empreendimento_id INT NOT NULL,
          codigo VARCHAR(60) NULL,
          nome VARCHAR(160) NOT NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'RASCUNHO',
          vigencia_inicio DATE NULL,
          vigencia_fim DATE NULL,
          observacoes TEXT NULL,
          criado_por INT NULL,
          atualizado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_tabelas_precos_comerciais_empreendimento FOREIGN KEY (empreendimento_id) REFERENCES empreendimentos(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_tabelas_precos_comerciais_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_tabelas_precos_comerciais_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_tabelas_precos_comerciais_empreendimento (empreendimento_id),
          KEY idx_tabelas_precos_comerciais_status (status)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'tabelas_precos_comerciais_itens'))) {
      await sequelize.query(`
        CREATE TABLE tabelas_precos_comerciais_itens (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          tabela_preco_comercial_id INT NOT NULL,
          unidade_comercial_id INT NOT NULL,
          valor_tabela DECIMAL(14,2) NOT NULL,
          valor_minimo DECIMAL(14,2) NULL,
          observacoes TEXT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_tabelas_precos_comerciais_itens_tabela FOREIGN KEY (tabela_preco_comercial_id) REFERENCES tabelas_precos_comerciais(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_tabelas_precos_comerciais_itens_unidade FOREIGN KEY (unidade_comercial_id) REFERENCES unidades_comerciais(id) ON DELETE CASCADE ON UPDATE CASCADE,
          UNIQUE KEY uk_tabelas_precos_comerciais_itens_unidade (tabela_preco_comercial_id, unidade_comercial_id),
          KEY idx_tabelas_precos_comerciais_itens_unidade (unidade_comercial_id)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'contratos_comerciais_eventos'))) {
      await sequelize.query(`
        CREATE TABLE contratos_comerciais_eventos (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          contrato_comercial_id INT NOT NULL,
          tipo_evento VARCHAR(40) NOT NULL,
          data_evento DATE NOT NULL,
          descricao VARCHAR(255) NOT NULL,
          metadata_json TEXT NULL,
          criado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_contratos_comerciais_eventos_contrato FOREIGN KEY (contrato_comercial_id) REFERENCES contratos_comerciais(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_contratos_comerciais_eventos_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_contratos_comerciais_eventos_contrato (contrato_comercial_id),
          KEY idx_contratos_comerciais_eventos_tipo (tipo_evento),
          KEY idx_contratos_comerciais_eventos_data (data_evento)
        )
      `);
    }

    if (!(await columnExists(sequelize, 'contratos_comerciais', 'data_distrato'))) {
      await sequelize.query(`
        ALTER TABLE contratos_comerciais
        ADD COLUMN data_distrato DATE NULL AFTER observacoes
      `);
    }

    if (!(await columnExists(sequelize, 'contratos_comerciais', 'motivo_distrato'))) {
      await sequelize.query(`
        ALTER TABLE contratos_comerciais
        ADD COLUMN motivo_distrato VARCHAR(255) NULL AFTER data_distrato
      `);
    }

    if (!(await indexExists(sequelize, 'contratos_comerciais', 'idx_contratos_comerciais_data_distrato'))) {
      await sequelize.query(`
        CREATE INDEX idx_contratos_comerciais_data_distrato
        ON contratos_comerciais (data_distrato)
      `);
    }

    if (
      (await tableExists(sequelize, 'tabelas_precos_comerciais_itens')) &&
      !(await foreignKeyExists(sequelize, 'tabelas_precos_comerciais_itens', 'fk_tabelas_precos_comerciais_itens_unidade'))
    ) {
      await sequelize.query(`
        ALTER TABLE tabelas_precos_comerciais_itens
        ADD CONSTRAINT fk_tabelas_precos_comerciais_itens_unidade
        FOREIGN KEY (unidade_comercial_id) REFERENCES unidades_comerciais(id) ON DELETE CASCADE ON UPDATE CASCADE
      `);
    }
  }
};
