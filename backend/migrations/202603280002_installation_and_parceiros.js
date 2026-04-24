const {
  INSTALLATION_CONFIG_KEY,
  getDefaultInstallationConfig
} = require('../src/services/installationConfig');
const {
  columnExists,
  foreignKeyExists,
  indexExists,
  tableExists
} = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'parceiros'))) {
      await sequelize.query(
        `CREATE TABLE parceiros (
          id INT AUTO_INCREMENT PRIMARY KEY,
          cpf_cnpj VARCHAR(20) NOT NULL,
          nome VARCHAR(255) NOT NULL,
          telefone VARCHAR(50) NOT NULL,
          email VARCHAR(255) NULL,
          endereco VARCHAR(255) NULL,
          numero VARCHAR(50) NULL,
          bairro VARCHAR(120) NULL,
          cep VARCHAR(20) NULL,
          municipio VARCHAR(120) NULL,
          estado VARCHAR(2) NULL,
          tipo_pessoa VARCHAR(1) NOT NULL,
          cliente TINYINT(1) NOT NULL DEFAULT 1,
          fornecedor TINYINT(1) NOT NULL DEFAULT 1,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_parceiros_cpf_cnpj (cpf_cnpj)
        )`
      );
    }

    if (!(await indexExists(sequelize, 'parceiros', 'idx_parceiros_nome'))) {
      await sequelize.query('CREATE INDEX idx_parceiros_nome ON parceiros (nome)');
    }

    if (!(await columnExists(sequelize, 'solicitacoes', 'parceiro_id'))) {
      await sequelize.query(
        'ALTER TABLE solicitacoes ADD COLUMN parceiro_id INT NULL'
      );
    }

    if (!(await indexExists(sequelize, 'solicitacoes', 'idx_solicitacoes_parceiro_id'))) {
      await sequelize.query(
        'CREATE INDEX idx_solicitacoes_parceiro_id ON solicitacoes (parceiro_id)'
      );
    }

    if (!(await foreignKeyExists(sequelize, 'solicitacoes', 'fk_solicitacoes_parceiro'))) {
      await sequelize.query(
        'ALTER TABLE solicitacoes ADD CONSTRAINT fk_solicitacoes_parceiro FOREIGN KEY (parceiro_id) REFERENCES parceiros(id) ON DELETE SET NULL ON UPDATE CASCADE'
      );
    }

    const valorPadrao = JSON.stringify(getDefaultInstallationConfig());
    const [rows] = await sequelize.query(
      `SELECT id
         FROM configuracoes_sistema
        WHERE chave = ${sequelize.escape(INSTALLATION_CONFIG_KEY)}
        ORDER BY id DESC
        LIMIT 1`
    );

    if (rows.length === 0) {
      await sequelize.query(
        `INSERT INTO configuracoes_sistema (chave, valor, createdAt, updatedAt)
         VALUES (
           ${sequelize.escape(INSTALLATION_CONFIG_KEY)},
           ${sequelize.escape(valorPadrao)},
           NOW(),
           NOW()
         )`
      );
    }
  }
};
