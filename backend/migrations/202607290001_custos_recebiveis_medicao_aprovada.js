'use strict';

const { columnExists, tableExists } = require('../src/database/schemaUtils');

const TABLE = 'cr_medicoes_consolidadas';

async function addColumnIfMissing(queryInterface, sequelize, name, definition) {
  if (!(await columnExists(sequelize, TABLE, name))) {
    await queryInterface.addColumn(TABLE, name, definition);
  }
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, TABLE))) return;

    await addColumnIfMissing(queryInterface, sequelize, 'valor_glosa', {
      type: DataTypes.DECIMAL(16, 2),
      allowNull: false,
      defaultValue: 0
    });
    await addColumnIfMissing(queryInterface, sequelize, 'justificativa_glosa', {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  async down({ queryInterface, sequelize }) {
    if (!(await tableExists(sequelize, TABLE))) return;

    if (await columnExists(sequelize, TABLE, 'justificativa_glosa')) {
      await queryInterface.removeColumn(TABLE, 'justificativa_glosa');
    }
    if (await columnExists(sequelize, TABLE, 'valor_glosa')) {
      await queryInterface.removeColumn(TABLE, 'valor_glosa');
    }
  }
};
