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
    await addColumnIfMissing(queryInterface, sequelize, 'contratos_comerciais_parcelas', 'periodicidade', {
      type: DataTypes.STRING(30),
      allowNull: true
    });
  },

  async down({ queryInterface, sequelize }) {
    await removeColumnIfExists(queryInterface, sequelize, 'contratos_comerciais_parcelas', 'periodicidade');
  }
};
