const {
  tableExists,
  columnExists,
  foreignKeyExists,
  indexExists
} = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'contrato_apropriacoes'))) {
      await sequelize.query(`
        CREATE TABLE contrato_apropriacoes (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          contrato_id INT NOT NULL,
          apropriacao_id INT NOT NULL,
          percentual DECIMAL(7,4) NULL,
          quantidade DECIMAL(14,4) NULL,
          observacao VARCHAR(255) NULL,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          UNIQUE KEY uq_contrato_apropriacao (contrato_id, apropriacao_id),
          KEY idx_contrato_apropriacoes_contrato (contrato_id),
          KEY idx_contrato_apropriacoes_apropriacao (apropriacao_id),
          CONSTRAINT fk_contrato_apropriacoes_contrato FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_contrato_apropriacoes_apropriacao FOREIGN KEY (apropriacao_id) REFERENCES apropriacoes(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);
    }

    if (!(await tableExists(sequelize, 'solicitacao_apropriacoes'))) {
      await sequelize.query(`
        CREATE TABLE solicitacao_apropriacoes (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          solicitacao_id INT NOT NULL,
          contrato_id INT NULL,
          apropriacao_id INT NOT NULL,
          percentual DECIMAL(7,4) NULL,
          quantidade DECIMAL(14,4) NULL,
          observacao VARCHAR(255) NULL,
          createdAt DATETIME NOT NULL,
          updatedAt DATETIME NOT NULL,
          UNIQUE KEY uq_solicitacao_apropriacao (solicitacao_id, apropriacao_id),
          KEY idx_solicitacao_apropriacoes_solicitacao (solicitacao_id),
          KEY idx_solicitacao_apropriacoes_contrato (contrato_id),
          KEY idx_solicitacao_apropriacoes_apropriacao (apropriacao_id),
          CONSTRAINT fk_solicitacao_apropriacoes_solicitacao FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_solicitacao_apropriacoes_contrato FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_solicitacao_apropriacoes_apropriacao FOREIGN KEY (apropriacao_id) REFERENCES apropriacoes(id) ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `);
    }

    if ((await tableExists(sequelize, 'contrato_apropriacoes')) && !(await columnExists(sequelize, 'contrato_apropriacoes', 'observacao'))) {
      await sequelize.query('ALTER TABLE contrato_apropriacoes ADD COLUMN observacao VARCHAR(255) NULL AFTER quantidade');
    }

    if ((await tableExists(sequelize, 'solicitacao_apropriacoes')) && !(await columnExists(sequelize, 'solicitacao_apropriacoes', 'observacao'))) {
      await sequelize.query('ALTER TABLE solicitacao_apropriacoes ADD COLUMN observacao VARCHAR(255) NULL AFTER quantidade');
    }

    if (!(await indexExists(sequelize, 'contrato_apropriacoes', 'uq_contrato_apropriacao'))) {
      await sequelize.query('CREATE UNIQUE INDEX uq_contrato_apropriacao ON contrato_apropriacoes (contrato_id, apropriacao_id)');
    }

    if (!(await indexExists(sequelize, 'solicitacao_apropriacoes', 'uq_solicitacao_apropriacao'))) {
      await sequelize.query('CREATE UNIQUE INDEX uq_solicitacao_apropriacao ON solicitacao_apropriacoes (solicitacao_id, apropriacao_id)');
    }

    if (!(await foreignKeyExists(sequelize, 'contrato_apropriacoes', 'fk_contrato_apropriacoes_contrato'))) {
      await sequelize.query('ALTER TABLE contrato_apropriacoes ADD CONSTRAINT fk_contrato_apropriacoes_contrato FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE ON UPDATE CASCADE');
    }

    if (!(await foreignKeyExists(sequelize, 'contrato_apropriacoes', 'fk_contrato_apropriacoes_apropriacao'))) {
      await sequelize.query('ALTER TABLE contrato_apropriacoes ADD CONSTRAINT fk_contrato_apropriacoes_apropriacao FOREIGN KEY (apropriacao_id) REFERENCES apropriacoes(id) ON DELETE RESTRICT ON UPDATE CASCADE');
    }

    if (!(await foreignKeyExists(sequelize, 'solicitacao_apropriacoes', 'fk_solicitacao_apropriacoes_solicitacao'))) {
      await sequelize.query('ALTER TABLE solicitacao_apropriacoes ADD CONSTRAINT fk_solicitacao_apropriacoes_solicitacao FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE ON UPDATE CASCADE');
    }

    if (!(await foreignKeyExists(sequelize, 'solicitacao_apropriacoes', 'fk_solicitacao_apropriacoes_contrato'))) {
      await sequelize.query('ALTER TABLE solicitacao_apropriacoes ADD CONSTRAINT fk_solicitacao_apropriacoes_contrato FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE SET NULL ON UPDATE CASCADE');
    }

    if (!(await foreignKeyExists(sequelize, 'solicitacao_apropriacoes', 'fk_solicitacao_apropriacoes_apropriacao'))) {
      await sequelize.query('ALTER TABLE solicitacao_apropriacoes ADD CONSTRAINT fk_solicitacao_apropriacoes_apropriacao FOREIGN KEY (apropriacao_id) REFERENCES apropriacoes(id) ON DELETE RESTRICT ON UPDATE CASCADE');
    }
  }
};
