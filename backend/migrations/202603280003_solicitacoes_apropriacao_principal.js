const {
  columnExists,
  foreignKeyExists,
  indexExists
} = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await columnExists(sequelize, 'solicitacoes', 'apropriacao_id'))) {
      await sequelize.query(
        'ALTER TABLE solicitacoes ADD COLUMN apropriacao_id INT NULL'
      );
    }

    if (!(await indexExists(sequelize, 'solicitacoes', 'idx_solicitacoes_apropriacao_id'))) {
      await sequelize.query(
        'CREATE INDEX idx_solicitacoes_apropriacao_id ON solicitacoes (apropriacao_id)'
      );
    }

    if (!(await foreignKeyExists(sequelize, 'solicitacoes', 'fk_solicitacoes_apropriacao'))) {
      await sequelize.query(
        'ALTER TABLE solicitacoes ADD CONSTRAINT fk_solicitacoes_apropriacao FOREIGN KEY (apropriacao_id) REFERENCES apropriacoes(id) ON DELETE SET NULL ON UPDATE CASCADE'
      );
    }
  }
};
