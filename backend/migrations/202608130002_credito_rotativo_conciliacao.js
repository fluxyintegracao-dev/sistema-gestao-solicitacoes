'use strict';

const { columnExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, 'movimentos_financeiros'))) return;
    if (!(await columnExists(sequelize, 'movimentos_financeiros', 'tipo_movimento'))) return;

    await queryInterface.changeColumn('movimentos_financeiros', 'tipo_movimento', {
      type: DataTypes.STRING(40),
      allowNull: false
    });
  },

  async down() {
    // Sem rollback destrutivo: tipos operacionais podem exceder o limite anterior.
  }
};
