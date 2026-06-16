async function tableExists(sequelize, tableName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS total
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?`,
    { replacements: [tableName] }
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

  const placeholders = names.map(() => '?').join(', ');
  const [rows] = await sequelize.query(
    `SELECT TABLE_NAME
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN (${placeholders})`,
    { replacements: names }
  );

  const existing = new Set((rows || []).map((row) => row.TABLE_NAME));
  return names.find((name) => existing.has(name)) || fallback || names[0];
}

function quoteIdentifier(identifier) {
  return `\`${String(identifier || '').replace(/`/g, '``')}\``;
}

async function columnExists(sequelize, tableName, columnName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?`,
    { replacements: [tableName, columnName] }
  );

  return Number(rows?.[0]?.total || 0) > 0;
}

async function foreignKeyExists(sequelize, tableName, constraintName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS total
       FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_NAME = ?
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'`
    ,
    { replacements: [tableName, constraintName] }
  );

  return Number(rows?.[0]?.total || 0) > 0;
}

async function indexExists(sequelize, tableName, indexName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS total
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?`,
    { replacements: [tableName, indexName] }
  );

  return Number(rows?.[0]?.total || 0) > 0;
}

module.exports = {
  columnExists,
  foreignKeyExists,
  indexExists,
  quoteIdentifier,
  resolveTableName,
  tableExists
};
