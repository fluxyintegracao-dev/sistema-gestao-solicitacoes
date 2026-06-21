async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(`SHOW TABLES LIKE '${tableName}'`);
  return Array.isArray(rows) && rows.length > 0;
}

async function columnExists(queryInterface, tableName, columnName) {
  const [rows] = await queryInterface.sequelize.query(
    `SHOW COLUMNS FROM \`${tableName}\` LIKE '${columnName}'`
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  if (!(await columnExists(queryInterface, tableName, columnName))) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` ADD \`${columnName}\` ${definition}`
    );
  }
}

async function removeColumnIfExists(queryInterface, tableName, columnName) {
  if (await columnExists(queryInterface, tableName, columnName)) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\``
    );
  }
}

module.exports = {
  async up(queryInterface) {
    const tableName = 'titulos_financeiros';
    if (!(await tableExists(queryInterface, tableName))) return;

    await addColumnIfMissing(queryInterface, tableName, 'deleted_at', 'DATETIME NULL');
    await addColumnIfMissing(queryInterface, tableName, 'deleted_by', 'INT NULL');
    await addColumnIfMissing(queryInterface, tableName, 'deleted_reason', 'VARCHAR(255) NULL');
  },

  async down(queryInterface) {
    const tableName = 'titulos_financeiros';
    if (!(await tableExists(queryInterface, tableName))) return;

    await removeColumnIfExists(queryInterface, tableName, 'deleted_reason');
    await removeColumnIfExists(queryInterface, tableName, 'deleted_by');
    await removeColumnIfExists(queryInterface, tableName, 'deleted_at');
  }
};
