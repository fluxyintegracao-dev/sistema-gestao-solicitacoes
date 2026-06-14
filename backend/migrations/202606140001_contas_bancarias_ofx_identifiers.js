async function columnExists(sequelize, tableName, columnName) {
  const [rows] = await sequelize.query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${sequelize.escape(tableName)}
      AND COLUMN_NAME = ${sequelize.escape(columnName)}
    LIMIT 1
  `);

  return rows.length > 0;
}

async function addColumnIfMissing(sequelize, tableName, columnName, definition) {
  if (await columnExists(sequelize, tableName, columnName)) {
    return;
  }
  await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

module.exports = {
  async up({ sequelize }) {
    await addColumnIfMissing(sequelize, 'contas_bancarias', 'ofx_bank_id', 'VARCHAR(20) NULL AFTER conta');
    await addColumnIfMissing(sequelize, 'contas_bancarias', 'ofx_branch_id', 'VARCHAR(40) NULL AFTER ofx_bank_id');
    await addColumnIfMissing(sequelize, 'contas_bancarias', 'ofx_account_id', 'VARCHAR(80) NULL AFTER ofx_branch_id');
  }
};
