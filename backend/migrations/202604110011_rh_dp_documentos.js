const { tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'rh_documentos_tipos'))) {
      await sequelize.query(`
        CREATE TABLE rh_documentos_tipos (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          codigo VARCHAR(60) NOT NULL,
          nome VARCHAR(160) NOT NULL,
          tipo_vinculo VARCHAR(20) NULL,
          obrigatorio TINYINT(1) NOT NULL DEFAULT 0,
          exige_validade TINYINT(1) NOT NULL DEFAULT 0,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_rh_documentos_tipos_codigo (codigo),
          KEY idx_rh_documentos_tipos_tipo_vinculo (tipo_vinculo),
          KEY idx_rh_documentos_tipos_ativo (ativo)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'rh_documentos'))) {
      await sequelize.query(`
        CREATE TABLE rh_documentos (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          colaborador_id INT NOT NULL,
          documento_tipo_id INT NOT NULL,
          documento_anterior_id INT NULL,
          nome_original VARCHAR(255) NOT NULL,
          arquivo_url TEXT NOT NULL,
          mimetype VARCHAR(120) NULL,
          tamanho_bytes INT NULL,
          validade DATE NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'ENVIADO',
          observacoes TEXT NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          criado_por INT NULL,
          atualizado_por INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_rh_documentos_colaborador FOREIGN KEY (colaborador_id) REFERENCES rh_colaboradores(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_rh_documentos_tipo FOREIGN KEY (documento_tipo_id) REFERENCES rh_documentos_tipos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_rh_documentos_anterior FOREIGN KEY (documento_anterior_id) REFERENCES rh_documentos(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_rh_documentos_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_rh_documentos_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_rh_documentos_colaborador (colaborador_id),
          KEY idx_rh_documentos_tipo (documento_tipo_id),
          KEY idx_rh_documentos_status (status),
          KEY idx_rh_documentos_validade (validade),
          KEY idx_rh_documentos_ativo (ativo),
          KEY idx_rh_documentos_anterior (documento_anterior_id)
        )
      `);
    }

    await sequelize.query(`
      INSERT IGNORE INTO rh_documentos_tipos
        (codigo, nome, tipo_vinculo, obrigatorio, exige_validade, ativo)
      VALUES
        ('RG_CLT', 'RG', 'CLT', 1, 0, 1),
        ('CPF_CLT', 'CPF', 'CLT', 1, 0, 1),
        ('CTPS_CLT', 'CTPS', 'CLT', 1, 0, 1),
        ('ASO_CLT', 'ASO', 'CLT', 1, 1, 1),
        ('CONTRATO_CLT', 'Contrato ou ficha', 'CLT', 1, 0, 1),
        ('DOC_PESSOAL_NAO_CLT', 'Documento pessoal', 'NAO_CLT', 1, 0, 1),
        ('CONTRATO_NAO_CLT', 'Contrato', 'NAO_CLT', 1, 0, 1),
        ('DOCUMENTO_FISCAL_NAO_CLT', 'Documento fiscal ou cadastro', 'NAO_CLT', 0, 0, 1),
        ('COMPROVANTE_BANCARIO', 'Comprovante bancario', NULL, 1, 0, 1),
        ('OUTROS', 'Outros', NULL, 0, 0, 1)
    `);
  }
};
