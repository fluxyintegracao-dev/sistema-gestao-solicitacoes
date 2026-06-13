const { env, validateRequiredEnv } = require('./src/config/env');
const sequelize = require('./src/database');
const { runMigrations } = require('./src/database/runMigrations');
const { iniciarOpsSync } = require('./src/services/opsService');
const { loadRuntimeConfig } = require('./src/services/runtimeConfig');
const { ensureRateLimitStoreReady } = require('./src/services/rateLimitStore');
const { iniciarRetencaoEventosSeguranca } = require('./src/services/securityLogService');
const { ensureClamavReady } = require('./src/services/clamavService');
const { iniciarCrmAutomationRuntime } = require('./src/services/crmAutomationRuntimeService');
const { startGovernancaSnapshotJob } = require('./src/modules/governanca/jobs/governancaSnapshotJob');

async function start() {
  validateRequiredEnv();
  await ensureRateLimitStoreReady();
  await ensureClamavReady();
  await runMigrations();
  await loadRuntimeConfig();

  const app = require('./src/app');
  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`Backend rodando na porta ${env.port}`);
    iniciarRetencaoEventosSeguranca();
    iniciarOpsSync(sequelize);
    iniciarCrmAutomationRuntime();
    startGovernancaSnapshotJob();
  });

  server.on('error', (error) => {
    if (error?.code === 'EADDRINUSE') {
      console.error(
        `Falha ao iniciar o backend: a porta ${env.port} ja esta em uso. ` +
        'Encerre o processo atual ou altere a variavel PORT antes de subir outra instancia.'
      );
      process.exit(1);
    }

    console.error('Falha ao iniciar o backend', error);
    process.exit(1);
  });
}

start().catch((error) => {
  console.error('Falha ao iniciar o backend', error);
  process.exit(1);
});
