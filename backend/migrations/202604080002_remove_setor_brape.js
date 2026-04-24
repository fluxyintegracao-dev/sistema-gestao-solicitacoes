const { columnExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ queryInterface, sequelize }) {

    if (await columnExists(sequelize, 'setores', 'eh_setor_brape')) {
      await queryInterface.removeColumn('setores', 'eh_setor_brape');
    }
  },

  async down({ queryInterface, sequelize }) {
    const Sequelize = require('sequelize');

    if (!(await columnExists(sequelize, 'setores', 'eh_setor_brape'))) {
      await queryInterface.addColumn('setores', 'eh_setor_brape', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  }
};
