const { indexExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    const tableName = 'unidades_comerciais';
    if (!(await tableExists(sequelize, tableName))) {
      return;
    }

    const queryInterface = sequelize.getQueryInterface();

    if (await indexExists(sequelize, tableName, 'uk_unidades_comerciais_codigo')) {
      await queryInterface.removeIndex(tableName, 'uk_unidades_comerciais_codigo');
    }

    if (!(await indexExists(sequelize, tableName, 'uk_unidades_comerciais_codigo_torre'))) {
      await queryInterface.addIndex(tableName, ['empreendimento_id', 'torre', 'codigo'], {
        name: 'uk_unidades_comerciais_codigo_torre',
        unique: true
      });
    }
  }
};
