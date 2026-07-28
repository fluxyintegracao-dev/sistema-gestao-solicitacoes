const fs = require('fs');
const path = require('path');
const sequelize = require('../src/database');
const { env } = require('../src/config/env');

const uploadsRoot = path.resolve(__dirname, '..', 'uploads');
const shouldScanAllText = process.argv.includes('--scan-db-all-text');
const shouldScanDatabase = process.argv.includes('--scan-db') || shouldScanAllText;
const candidateNamePattern = /(upload|arquivo|anexo|comprovante|documento|imagem|foto|logo|url|path|caminho|chave|valor)/i;
const textTypes = new Set(['char', 'varchar', 'text', 'tinytext', 'mediumtext', 'longtext', 'json']);

function quoteIdentifier(value) {
  return `\`${String(value).replace(/`/g, '``')}\``;
}

function walkFiles(root) {
  if (!fs.existsSync(root)) return [];
  const pending = [root];
  const files = [];

  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(fullPath);
      } else if (entry.isFile()) {
        const stat = fs.statSync(fullPath);
        files.push({
          relative_path: path.relative(root, fullPath).replace(/\\/g, '/'),
          size_bytes: stat.size,
          modified_at: stat.mtime.toISOString()
        });
      }
    }
  }

  return files;
}

async function listTextColumns() {
  const [rows] = await sequelize.query(`
    SELECT TABLE_NAME AS table_name,
           COLUMN_NAME AS column_name,
           DATA_TYPE AS data_type
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     ORDER BY TABLE_NAME, ORDINAL_POSITION
  `);

  return rows.filter((row) => textTypes.has(String(row.data_type || '').toLowerCase()));
}

async function scanDatabase(columns) {
  const matches = [];
  for (const column of columns) {
    const tableName = quoteIdentifier(column.table_name);
    const columnName = quoteIdentifier(column.column_name);
    const [rows] = await sequelize.query(`
      SELECT COUNT(*) AS total
        FROM ${tableName}
       WHERE ${columnName} IS NOT NULL
         AND LOCATE('/uploads/', CAST(${columnName} AS CHAR)) > 0
    `);
    const total = Number(rows?.[0]?.total || 0);
    if (total > 0) {
      matches.push({
        table_name: column.table_name,
        column_name: column.column_name,
        total
      });
    }
  }
  return matches;
}

async function run() {
  const files = walkFiles(uploadsRoot);
  const report = {
    generated_at: new Date().toISOString(),
    environment: env.nodeEnv,
    database: env.dbName || null,
    local_upload_fallback_possible: env.nodeEnv !== 'production',
    s3_configured: Boolean(process.env.AWS_S3_BUCKET),
    uploads_directory: uploadsRoot,
    local_files: {
      total: files.length,
      total_bytes: files.reduce((sum, file) => sum + file.size_bytes, 0),
      items: files
    },
    database_scan: {
      requested: shouldScanDatabase,
      mode: shouldScanAllText ? 'ALL_TEXT_COLUMNS' : 'CANDIDATE_COLUMNS',
      candidate_columns: [],
      references: []
    },
    decision: 'NAO_REMOVER_OU_PROTEGER_A_ROTA_SEM_VALIDAR_REFERENCIAS_EM_DEV_E_PRODUCAO'
  };

  if (shouldScanDatabase) {
    await sequelize.authenticate();
    const textColumns = await listTextColumns();
    const columns = shouldScanAllText
      ? textColumns
      : textColumns.filter((row) => candidateNamePattern.test(String(row.column_name || '')));
    report.database_scan.candidate_columns = columns;
    report.database_scan.references = await scanDatabase(columns);
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

run()
  .catch((error) => {
    console.error(JSON.stringify({
      error: error.message,
      decision: 'AUDITORIA_INCONCLUSIVA_NAO_ALTERAR_ROTA'
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
