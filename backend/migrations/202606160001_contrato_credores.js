const {
  tableExists,
  foreignKeyExists,
  indexExists
} = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'contrato_credores'))) {
      await sequelize.query(`
        CREATE TABLE contrato_credores (
          id INT NOT NULL AUTO_INCREMENT,
          contrato_id INT NOT NULL,
          parceiro_id INT NOT NULL,
          observacao VARCHAR(500) NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_contrato_credores_contrato_parceiro (contrato_id, parceiro_id),
          KEY idx_contrato_credores_contrato (contrato_id),
          KEY idx_contrato_credores_parceiro (parceiro_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'contrato_credores', 'fk_contrato_credores_contrato'))) {
      await sequelize.query(`
        ALTER TABLE contrato_credores
        ADD CONSTRAINT fk_contrato_credores_contrato
        FOREIGN KEY (contrato_id) REFERENCES contratos(id)
        ON DELETE CASCADE
      `);
    }

    if (!(await foreignKeyExists(sequelize, 'contrato_credores', 'fk_contrato_credores_parceiro'))) {
      await sequelize.query(`
        ALTER TABLE contrato_credores
        ADD CONSTRAINT fk_contrato_credores_parceiro
        FOREIGN KEY (parceiro_id) REFERENCES parceiros(id)
      `);
    }

    if (!(await indexExists(sequelize, 'contrato_credores', 'uk_contrato_credores_contrato_parceiro'))) {
      await sequelize.query(`
        ALTER TABLE contrato_credores
        ADD UNIQUE KEY uk_contrato_credores_contrato_parceiro (contrato_id, parceiro_id)
      `);
    }
  }
};
