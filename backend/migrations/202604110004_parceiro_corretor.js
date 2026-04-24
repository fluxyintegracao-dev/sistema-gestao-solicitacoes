const { columnExists, indexExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await columnExists(sequelize, 'parceiros', 'corretor'))) {
      await sequelize.query(`
        ALTER TABLE parceiros
        ADD COLUMN corretor TINYINT(1) NOT NULL DEFAULT 0 AFTER fornecedor
      `);
    }

    if (!(await indexExists(sequelize, 'parceiros', 'idx_parceiros_corretor'))) {
      await sequelize.query(`
        CREATE INDEX idx_parceiros_corretor
        ON parceiros (corretor)
      `);
    }
  }
};
