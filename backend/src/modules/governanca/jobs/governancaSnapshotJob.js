'use strict';

const { createDailySnapshot } = require('../services/governancaMetricsService');

let timer = null;
let lastRunDate = null;

function shouldRunNow(date = new Date()) {
  return date.getHours() === 0 && date.getMinutes() === 30;
}

function startGovernancaSnapshotJob() {
  if (timer) return timer;
  if (process.env.GOVERNANCA_SNAPSHOT_JOB_ENABLED === 'false') {
    console.log('[governanca] job diario de snapshot desativado');
    return null;
  }

  timer = setInterval(async () => {
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);
    if (!shouldRunNow(now) || lastRunDate === dateKey) return;

    try {
      await createDailySnapshot({ dataReferencia: dateKey });
      lastRunDate = dateKey;
      console.log(`[governanca] snapshot diario gerado para ${dateKey}`);
    } catch (error) {
      console.error('[governanca] falha ao gerar snapshot diario', error);
    }
  }, 60 * 1000);

  if (typeof timer.unref === 'function') timer.unref();
  console.log('[governanca] job diario de snapshot configurado para 00:30');
  return timer;
}

module.exports = {
  startGovernancaSnapshotJob
};
