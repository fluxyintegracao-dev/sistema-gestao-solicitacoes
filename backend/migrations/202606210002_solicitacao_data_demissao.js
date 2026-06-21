async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(`SHOW TABLES LIKE '${tableName}'`);
  return Array.isArray(rows) && rows.length > 0;
}

async function columnExists(queryInterface, tableName, columnName) {
  const [rows] = await queryInterface.sequelize.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE '${columnName}'`);
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  async up(queryInterface) {
    if (!(await tableExists(queryInterface, 'solicitacoes'))) return;

    if (!(await columnExists(queryInterface, 'solicitacoes', 'data_demissao'))) {
      await queryInterface.sequelize.query(
        'ALTER TABLE `solicitacoes` ADD `data_demissao` DATE NULL'
      );
    }
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, 'solicitacoes'))) return;

    if (await columnExists(queryInterface, 'solicitacoes', 'data_demissao')) {
      await queryInterface.removeColumn('solicitacoes', 'data_demissao');
    }
  }
};
