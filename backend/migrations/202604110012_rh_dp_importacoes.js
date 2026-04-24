const { tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'rh_importacoes'))) {
      await sequelize.query(`
        CREATE TABLE rh_importacoes (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          tipo VARCHAR(30) NOT NULL,
          competencia VARCHAR(7) NOT NULL,
          empresa_grupo_id INT NOT NULL,
          obra_id INT NULL,
          tipo_vinculo VARCHAR(20) NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'PREVIEW',
          nome_arquivo VARCHAR(255) NOT NULL,
          total_linhas INT NOT NULL DEFAULT 0,
          total_validas INT NOT NULL DEFAULT 0,
          total_erros INT NOT NULL DEFAULT 0,
          observacoes TEXT NULL,
          resumo_json JSON NULL,
          criado_por INT NULL,
          confirmado_por INT NULL,
          confirmado_em DATETIME NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_rh_importacoes_empresa FOREIGN KEY (empresa_grupo_id) REFERENCES rh_empresas_grupo(id) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT fk_rh_importacoes_obra FOREIGN KEY (obra_id) REFERENCES obras(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_rh_importacoes_criado_por FOREIGN KEY (criado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_rh_importacoes_confirmado_por FOREIGN KEY (confirmado_por) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_rh_importacoes_tipo (tipo),
          KEY idx_rh_importacoes_competencia (competencia),
          KEY idx_rh_importacoes_empresa (empresa_grupo_id),
          KEY idx_rh_importacoes_status (status)
        )
      `);
    }

    if (!(await tableExists(sequelize, 'rh_importacao_linhas'))) {
      await sequelize.query(`
        CREATE TABLE rh_importacao_linhas (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          importacao_id INT NOT NULL,
          numero_linha INT NOT NULL,
          colaborador_id INT NULL,
          matricula_ref VARCHAR(60) NULL,
          cpf_ref VARCHAR(14) NULL,
          nome_ref VARCHAR(180) NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'VALIDA',
          payload_json JSON NULL,
          erro_mensagem TEXT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_rh_importacao_linhas_importacao FOREIGN KEY (importacao_id) REFERENCES rh_importacoes(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_rh_importacao_linhas_colaborador FOREIGN KEY (colaborador_id) REFERENCES rh_colaboradores(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_rh_importacao_linhas_importacao (importacao_id),
          KEY idx_rh_importacao_linhas_colaborador (colaborador_id),
          KEY idx_rh_importacao_linhas_status (status),
          KEY idx_rh_importacao_linhas_numero (numero_linha)
        )
      `);
    }
  }
};
