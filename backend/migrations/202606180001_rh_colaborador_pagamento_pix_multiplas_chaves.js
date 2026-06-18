const { columnExists } = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (!(await columnExists(sequelize, tableName, columnName))) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    await addColumnIfMissing(queryInterface, sequelize, 'rh_colaborador_pagamentos', 'chave_pix_secundaria', {
      type: DataTypes.STRING(120),
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'rh_colaborador_pagamentos', 'chave_pix_variavel', {
      type: DataTypes.STRING(120),
      allowNull: true
    });
  }
};
