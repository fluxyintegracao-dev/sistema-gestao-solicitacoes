const {
  tableExists,
  columnExists
} = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (
      (await tableExists(sequelize, 'solicitacao_apropriacoes')) &&
      !(await columnExists(sequelize, 'solicitacao_apropriacoes', 'valor_rateio'))
    ) {
      await sequelize.query(`
        ALTER TABLE solicitacao_apropriacoes
        ADD COLUMN valor_rateio DECIMAL(15,2) NULL AFTER quantidade
      `);
    }
  }
};
