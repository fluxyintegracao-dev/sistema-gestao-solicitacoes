const { columnExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await columnExists(sequelize, 'solicitacao_compra_fornecedores', 'prazo_resposta'))) {
      await sequelize.query(`
        ALTER TABLE solicitacao_compra_fornecedores
        ADD COLUMN prazo_resposta DATE NULL
        AFTER respondido_em
      `);
    }
  }
};
