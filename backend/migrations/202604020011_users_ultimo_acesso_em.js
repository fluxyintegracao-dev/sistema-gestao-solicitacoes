const { columnExists, indexExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await columnExists(sequelize, 'users', 'ultimo_acesso_em'))) {
      await sequelize.query(`
        ALTER TABLE users
        ADD COLUMN ultimo_acesso_em DATETIME NULL
        AFTER ativo
      `);
    }

    if (!(await indexExists(sequelize, 'users', 'idx_users_ultimo_acesso_em'))) {
      await sequelize.query(`
        CREATE INDEX idx_users_ultimo_acesso_em
          ON users (ultimo_acesso_em)
      `);
    }
  }
};
