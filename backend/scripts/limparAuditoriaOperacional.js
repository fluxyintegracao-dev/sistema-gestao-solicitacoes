'use strict';

require('dotenv').config();

const models = require('../src/models');
const {
  purgeExpiredEvents
} = require('../src/modules/governanca/services/auditoriaOperacionalService');

function readArgument(name) {
  const prefix = `--${name}=`;
  const item = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return item ? item.slice(prefix.length) : null;
}

async function run() {
  const confirm = process.argv.includes('--confirm');
  const retentionDays = readArgument('days') || process.env.AUDITORIA_OPERACIONAL_RETENCAO_DIAS;
  const result = await purgeExpiredEvents({ retentionDays, confirm });
  console.log(JSON.stringify(result, null, 2));
  if (!confirm && result.candidatos > 0) {
    console.log('Simulacao concluida. Revise o corte e execute novamente com --confirm para aplicar.');
  }
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await models.sequelize.close().catch(() => {});
  });
