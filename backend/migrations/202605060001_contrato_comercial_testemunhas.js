const {
  columnExists,
  tableExists
} = require('../src/database/schemaUtils');

async function addColumnIfMissing(queryInterface, sequelize, tableName, columnName, definition) {
  if (!(await tableExists(sequelize, tableName))) return;
  if (await columnExists(sequelize, tableName, columnName)) return;
  await queryInterface.addColumn(tableName, columnName, definition);
}

async function removeColumnIfExists(queryInterface, sequelize, tableName, columnName) {
  if (!(await tableExists(sequelize, tableName))) return;
  if (!(await columnExists(sequelize, tableName, columnName))) return;
  await queryInterface.removeColumn(tableName, columnName);
}

module.exports = {
  async up({ queryInterface, sequelize, DataTypes }) {
    await addColumnIfMissing(queryInterface, sequelize, 'contratos_comerciais', 'testemunha_1_nome', {
      type: DataTypes.STRING(160),
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'contratos_comerciais', 'testemunha_1_cpf', {
      type: DataTypes.STRING(20),
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'contratos_comerciais', 'testemunha_2_nome', {
      type: DataTypes.STRING(160),
      allowNull: true
    });

    await addColumnIfMissing(queryInterface, sequelize, 'contratos_comerciais', 'testemunha_2_cpf', {
      type: DataTypes.STRING(20),
      allowNull: true
    });
  },

  async down({ queryInterface, sequelize }) {
    await removeColumnIfExists(queryInterface, sequelize, 'contratos_comerciais', 'testemunha_2_cpf');
    await removeColumnIfExists(queryInterface, sequelize, 'contratos_comerciais', 'testemunha_2_nome');
    await removeColumnIfExists(queryInterface, sequelize, 'contratos_comerciais', 'testemunha_1_cpf');
    await removeColumnIfExists(queryInterface, sequelize, 'contratos_comerciais', 'testemunha_1_nome');
  }
};
