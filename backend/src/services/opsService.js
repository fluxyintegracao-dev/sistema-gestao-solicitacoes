const http = require('http');
const https = require('https');
const { URL } = require('url');

const { QueryTypes } = require('sequelize');
const { env } = require('../config/env');
const { getModuloConfig } = require('./moduleConfigService');
const { contarUsuariosSimultaneos } = require('./userActivityService');

// S3 storage — carregado lazily para nao falhar se SDK nao estiver disponivel
let _s3Client = null;
let _ListObjectsV2Command = null;
function getS3() {
  if (!_s3Client) {
    try {
      const { S3Client } = require('@aws-sdk/client-s3');
      const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
      _s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      _ListObjectsV2Command = ListObjectsV2Command;
    } catch {
      // SDK nao disponivel
    }
  }
  return { client: _s3Client, Cmd: _ListObjectsV2Command };
}

let opsSyncStarted = false;

function isOpsConfigured() {
  return Boolean(
    env.opsEnabled &&
    env.opsBaseUrl &&
    env.opsClientId &&
    env.opsApiKey
  );
}

function buildUrl(pathname) {
  try {
    return new URL(pathname, env.opsBaseUrl);
  } catch (error) {
    console.warn('[ops] URL invalida:', env.opsBaseUrl);
    return null;
  }
}

function enviarParaOps(pathname, payload) {
  if (!isOpsConfigured()) {
    return;
  }

  const url = buildUrl(pathname);
  if (!url) {
    return;
  }

  const body = JSON.stringify(payload || {});
  const transport = url.protocol === 'https:' ? https : http;
  const request = transport.request(
    {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search || ''}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'X-Ops-Client-Id': env.opsClientId,
        'X-Ops-Api-Key': env.opsApiKey
      },
      timeout: 8000
    },
    (response) => {
      if (Number(response.statusCode || 0) >= 400) {
        console.warn(`[ops] Resposta inesperada em ${pathname}: HTTP ${response.statusCode}`);
      }
      response.resume();
    }
  );

  request.on('timeout', () => {
    request.destroy(new Error('timeout'));
  });

  request.on('error', (error) => {
    console.warn(`[ops] Falha ao enviar para ${pathname}:`, error.message);
  });

  request.write(body);
  request.end();
}

function getVersaoBackend() {
  try {
    return require('../../package.json').version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

async function coletarModulosHabilitados() {
  try {
    const modules = await getModuloConfig();
    return modules
      .filter((item) => item?.enabled)
      .map((item) => String(item.key || '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function countTable(sequelize, tableName) {
  try {
    const [row] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM \`${tableName}\``,
      { type: QueryTypes.SELECT }
    );
    return Number(row?.total || 0);
  } catch {
    return 0;
  }
}

async function countUsuariosCadastrados(sequelize) {
  try {
    const [row] = await sequelize.query(
      `SELECT COUNT(*) AS total
         FROM users
        WHERE ativo = 1
          AND UPPER(TRIM(COALESCE(perfil, ''))) <> 'SUPERADMIN'`,
      { type: QueryTypes.SELECT }
    );
    return Number(row?.total || 0);
  } catch {
    return 0;
  }
}

async function countUsuariosAtivos30d(sequelize) {
  try {
    const [row] = await sequelize.query(
      `SELECT COUNT(DISTINCT logs.usuario_id) AS total
         FROM security_event_logs logs
         INNER JOIN users users ON users.id = logs.usuario_id
        WHERE logs.usuario_id IS NOT NULL
          AND logs.tipo_evento = 'AUTH_LOGIN_SUCCESS'
          AND logs.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND users.ativo = 1
          AND UPPER(TRIM(COALESCE(users.perfil, ''))) <> 'SUPERADMIN'`,
      { type: QueryTypes.SELECT }
    );
    return Number(row?.total || 0);
  } catch {
    return 0;
  }
}

async function coletarUso(sequelize) {
  const [
    solicitacoes_total,
    titulos_total,
    pedidos_total,
    parceiros_total,
    usuarios_cadastrados,
    usuarios_ativos_30d
  ] = await Promise.all([
    countTable(sequelize, 'solicitacoes'),
    countTable(sequelize, 'titulos_financeiros'),
    countTable(sequelize, 'pedidos_compra'),
    countTable(sequelize, 'parceiros'),
    countUsuariosCadastrados(sequelize),
    countUsuariosAtivos30d(sequelize)
  ]);

  return {
    solicitacoes_total,
    titulos_total,
    pedidos_total,
    parceiros_total,
    usuarios_cadastrados,
    usuarios_ativos_30d
  };
}

async function coletarStorageS3() {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    return 0;
  }

  const { client, Cmd } = getS3();
  if (!client || !Cmd) {
    return 0;
  }

  try {
    let totalBytes = 0;
    let continuationToken;

    do {
      const input = { Bucket: bucket, MaxKeys: 1000 };
      if (continuationToken) {
        input.ContinuationToken = continuationToken;
      }

      const response = await client.send(new Cmd(input));
      for (const obj of response.Contents || []) {
        totalBytes += obj.Size || 0;
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return totalBytes / 1024 / 1024 / 1024;
  } catch {
    return 0;
  }
}

async function coletarStorageBanco(sequelize) {
  try {
    const [row] = await sequelize.query(
      `SELECT SUM(data_length + index_length) / 1024 / 1024 / 1024 AS gb
         FROM information_schema.tables
        WHERE table_schema = DATABASE()`,
      { type: QueryTypes.SELECT }
    );

    return Number.parseFloat(row?.gb || 0) || 0;
  } catch {
    return 0;
  }
}

async function coletarConcorrencia(sequelize) {
  const { total } = await contarUsuariosSimultaneos(sequelize);

  return {
    simultaneos_atual: total,
    pico_dia: 0,
    pico_mes: 0,
    excedencias_mes: 0
  };
}

async function enviarHeartbeat(sequelize) {
  const modulos_habilitados = await coletarModulosHabilitados();

  enviarParaOps('/api/ops/heartbeat', {
    versao_backend: getVersaoBackend(),
    status_saude: 'ok',
    modulos_habilitados
  });
}

async function enviarConcorrencia(sequelize) {
  const concorrencia = await coletarConcorrencia(sequelize);

  enviarParaOps('/api/ops/metricas/concorrencia', concorrencia);
}

async function enviarMetricas(sequelize) {
  const [uso, banco_gb, anexos_gb, concorrencia] = await Promise.all([
    coletarUso(sequelize),
    coletarStorageBanco(sequelize),
    coletarStorageS3(),
    coletarConcorrencia(sequelize)
  ]);

  enviarParaOps('/api/ops/metricas/uso', uso);
  enviarParaOps('/api/ops/metricas/storage', {
    banco_gb,
    anexos_gb
  });
  enviarParaOps('/api/ops/metricas/concorrencia', concorrencia);
}

function scheduleSafeInterval(handler, intervalMs) {
  const timer = setInterval(() => {
    Promise.resolve(handler()).catch(() => {});
  }, intervalMs);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return timer;
}

function scheduleSafeTimeout(handler, timeoutMs) {
  const timer = setTimeout(() => {
    Promise.resolve(handler()).catch(() => {});
  }, timeoutMs);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return timer;
}

function iniciarOpsSync(sequelize) {
  if (opsSyncStarted) {
    return;
  }

  if (!env.opsEnabled) {
    console.log('[ops] Integracao desativada (OPS_ENABLED != true)');
    return;
  }

  if (!env.opsBaseUrl || !env.opsClientId || !env.opsApiKey) {
    console.warn('[ops] OPS_ENABLED=true mas OPS_BASE_URL, OPS_CLIENT_ID ou OPS_API_KEY nao configurados. Integracao ignorada.');
    return;
  }

  opsSyncStarted = true;

  const heartbeatIntervalMs = Math.max(1, env.opsHeartbeatIntervalMinutes || 5) * 60 * 1000;
  const metricsIntervalMs = Math.max(1, env.opsMetricsIntervalMinutes || 15) * 60 * 1000;
  const concurrencyIntervalMs = 60 * 1000;

  console.log(`[ops] Iniciando sync com ${env.opsBaseUrl}`);

  Promise.resolve(enviarHeartbeat(sequelize)).catch(() => {});
  scheduleSafeInterval(() => enviarHeartbeat(sequelize), heartbeatIntervalMs);
  Promise.resolve(enviarConcorrencia(sequelize)).catch(() => {});
  scheduleSafeInterval(() => enviarConcorrencia(sequelize), concurrencyIntervalMs);

  scheduleSafeTimeout(async () => {
    await enviarMetricas(sequelize);
    scheduleSafeInterval(() => enviarMetricas(sequelize), metricsIntervalMs);
  }, 30_000);
}

module.exports = {
  coletarModulosHabilitados,
  coletarConcorrencia,
  coletarStorageBanco,
  coletarUso,
  contarUsuariosSimultaneos,
  enviarHeartbeat,
  enviarConcorrencia,
  enviarMetricas,
  enviarParaOps,
  getVersaoBackend,
  iniciarOpsSync
};
