async function tableExists(sequelize, tableName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS total
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ${sequelize.escape(tableName)}`
  );

  return Number(rows?.[0]?.total || 0) > 0;
}

async function resolveTableName(sequelize, candidates = [], fallback = null) {
  const names = Array.from(
    new Set((Array.isArray(candidates) ? candidates : [candidates])
      .map((item) => String(item || '').trim())
      .filter(Boolean))
  );

  if (names.length === 0) {
    return fallback;
  }

  const escapedNames = names.map((name) => sequelize.escape(name)).join(', ');
  const [rows] = await sequelize.query(
    `SELECT TABLE_NAME
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN (${escapedNames})`
  );

  const existing = new Set((rows || []).map((row) => row.TABLE_NAME));
  return names.find((name) => existing.has(name)) || fallback || names[0];
}

async function columnExists(sequelize, tableName, columnName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ${sequelize.escape(tableName)}
        AND COLUMN_NAME = ${sequelize.escape(columnName)}`
  );

  return Number(rows?.[0]?.total || 0) > 0;
}

async function foreignKeyExists(sequelize, tableName, constraintName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS total
       FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ${sequelize.escape(tableName)}
        AND CONSTRAINT_NAME = ${sequelize.escape(constraintName)}
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'`
  );

  return Number(rows?.[0]?.total || 0) > 0;
}

async function indexExists(sequelize, tableName, indexName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS total
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ${sequelize.escape(tableName)}
        AND INDEX_NAME = ${sequelize.escape(indexName)}`
  );

  return Number(rows?.[0]?.total || 0) > 0;
}

module.exports = {
  columnExists,
  foreignKeyExists,
  indexExists,
  resolveTableName,
  tableExists
};
