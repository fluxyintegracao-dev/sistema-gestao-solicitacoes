const fs = require('fs');
const path = require('path');

const { Sequelize } = require('sequelize');
const { validateRequiredEnv } = require('../config/env');
const sequelize = require('./index');

const MIGRATIONS_TABLE = 'schema_migrations';
const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'migrations');

async function ensureMigrationsTable() {
  await sequelize.query(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
}

function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((fileName) => fileName.endsWith('.js'))
    .sort((a, b) => a.localeCompare(b));
}

async function getExecutedMigrations() {
  const [rows] = await sequelize.query(
    `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY executed_at ASC`
  );

  return new Set(rows.map((row) => String(row.name)));
}

async function runMigrations() {
  await ensureMigrationsTable();
  const executed = await getExecutedMigrations();
  const files = getMigrationFiles();

  for (const fileName of files) {
    if (executed.has(fileName)) {
      continue;
    }

    const filePath = path.join(MIGRATIONS_DIR, fileName);
    delete require.cache[require.resolve(filePath)];
    const migration = require(filePath);

    if (!migration || typeof migration.up !== 'function') {
      throw new Error(`Migration invalida: ${fileName}`);
    }

    const qi = sequelize.getQueryInterface();
    const originalAddColumn = qi.addColumn.bind(qi);
    qi.addColumn = async (table, column, definition, options) => {
      const desc = await qi.describeTable(table).catch(() => ({}));
      if (desc[column]) return;
      return originalAddColumn(table, column, definition, options);
    };

    try {
      await migration.up({
        DataTypes: Sequelize.DataTypes,
        queryInterface: qi,
        sequelize
      });
    } finally {
      qi.addColumn = originalAddColumn;
    }

    await sequelize.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (${sequelize.escape(fileName)})`
    );

    console.log(`Migration aplicada: ${fileName}`);
  }
}

if (require.main === module) {
  validateRequiredEnv();
  runMigrations()
    .then(() => {
      console.log('Migrations concluidas');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro ao executar migrations', error);
      process.exit(1);
    });
}

module.exports = {
  runMigrations
};
