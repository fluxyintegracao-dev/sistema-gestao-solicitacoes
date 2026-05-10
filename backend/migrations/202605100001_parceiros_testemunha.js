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
    await addColumnIfMissing(queryInterface, sequelize, 'parceiros', 'testemunha', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  async down({ queryInterface, sequelize }) {
    await removeColumnIfExists(queryInterface, sequelize, 'parceiros', 'testemunha');
  }
};
