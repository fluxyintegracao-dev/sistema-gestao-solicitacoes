'use strict';

const { SST_JOB_HANDLERS } = require('../jobs/sstJobHandlers');
const { DEFAULT_QUEUE, processNextSstJob } = require('../queues/sstQueueService');

async function processarWorkerSst({ queue_name = DEFAULT_QUEUE, limit = 10 } = {}) {
  const results = [];
  const max = Math.min(Math.max(Number(limit || 10), 1), 100);

  for (let index = 0; index < max; index += 1) {
    const result = await processNextSstJob({ queue_name, handlers: SST_JOB_HANDLERS });
    results.push(result);
    if (!result.processed) break;
  }

  return {
    queue_name,
    processados: results.filter((item) => item.processed).length,
    sucesso: results.filter((item) => item.status === 'SUCESSO').length,
    erro: results.filter((item) => item.status === 'ERRO').length,
    results
  };
}

module.exports = {
  processarWorkerSst
};
