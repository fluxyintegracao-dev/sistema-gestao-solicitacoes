const { columnExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    const tableName = 'financeiro_cartoes';

    if (!(await tableExists(sequelize, tableName))) {
      return;
    }

    if (!(await columnExists(sequelize, tableName, 'tipo'))) {
      await queryInterface.addColumn(tableName, 'tipo', {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'CREDITO',
        after: 'titular'
      });
    }

    await sequelize.query(`
      UPDATE financeiro_cartoes
         SET tipo = 'CREDITO'
       WHERE tipo IS NULL OR tipo = ''
    `);
  },

  async down({ queryInterface, sequelize }) {
    const tableName = 'financeiro_cartoes';

    if (await tableExists(sequelize, tableName) && await columnExists(sequelize, tableName, 'tipo')) {
      await queryInterface.removeColumn(tableName, 'tipo');
    }
  }
};
