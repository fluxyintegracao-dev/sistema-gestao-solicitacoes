const { columnExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await columnExists(sequelize, 'movimentos_financeiros', 'multa'))) {
      await sequelize.query(`
        ALTER TABLE movimentos_financeiros
        ADD COLUMN multa DECIMAL(14,2) NOT NULL DEFAULT 0.00
        AFTER juros
      `);
    }
  }
};
