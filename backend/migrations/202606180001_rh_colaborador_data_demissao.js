const { columnExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (
      (await tableExists(sequelize, 'rh_colaboradores')) &&
      !(await columnExists(sequelize, 'rh_colaboradores', 'data_demissao'))
    ) {
      await sequelize.query(`
        ALTER TABLE rh_colaboradores
        ADD COLUMN data_demissao DATE NULL AFTER data_admissao
      `);
    }
  }
};
