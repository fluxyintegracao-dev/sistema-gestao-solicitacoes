'use strict';

const { columnExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, 'cheques_terceiros'))) return;
    if (await columnExists(sequelize, 'cheques_terceiros', 'titular_parceiro_id')) return;

    await queryInterface.addColumn('cheques_terceiros', 'titular_parceiro_id', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'parceiros',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down() {
    // Sem rollback destrutivo: o vinculo preserva a rastreabilidade do titular.
  }
};
