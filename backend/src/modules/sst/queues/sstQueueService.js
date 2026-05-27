'use strict';

const { Op } = require('sequelize');
const {
  SstJob,
  SstQueueMetric,
  SstTelemetryMetric
} = require('../../../models');
const { SST_FEATURE_FLAGS } = require('../constants/sstConstants');
const { isSstFeatureEnabled } = require('../feature-flags/sstFeatureFlagsService');

const DEFAULT_QUEUE = 'sst-default';
const WORKER_ID = `sst-worker-${process.pid}`;

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function enqueueSstJob({
  queue_name = DEFAULT_QUEUE,
  job_type,
  payload = {},
  prioridade = 5,
  max_attempts = 3,
  next_run_at = new Date(),
  empresa_id = null,
  obra_id = null,
  colaborador_id = null,
  referencia_tipo = null,
  referencia_id = null,
  usuario_id = null
} = {}) {
  if (!job_type) {
    const error = new Error('Tipo de job SST obrigatorio.');
    error.statusCode = 400;
    throw error;
  }

  const enabled = await isSstFeatureEnabled(SST_FEATURE_FLAGS.ASYNC_JOBS);
  if (!enabled) {
    return {
      enfileirado: false,
      status: 'IGNORADO_FLAG_DESATIVADA',
      flag: SST_FEATURE_FLAGS.ASYNC_JOBS
    };
  }

  const job = await SstJob.create({
    queue_name,
    job_type,
    prioridade,
    max_attempts,
    next_run_at,
    empresa_id,
    obra_id,
    colaborador_id,
    referencia_tipo,
    referencia_id,
    payload_json: JSON.stringify(payload || {}),
    criado_por: usuario_id,
    atualizado_por: usuario_id
  });

  return { enfileirado: true, job };
}

async function claimNextJob(queueName = DEFAULT_QUEUE) {
  const job = await SstJob.findOne({
    where: {
      queue_name: queueName,
      status: { [Op.in]: ['PENDENTE', 'ERRO'] },
      next_run_at: { [Op.lte]: new Date() },
      [Op.and]: SstJob.sequelize.where(
        SstJob.sequelize.col('attempts'),
        Op.lt,
        SstJob.sequelize.col('max_attempts')
      )
    },
    order: [['prioridade', 'ASC'], ['next_run_at', 'ASC'], ['id', 'ASC']]
  });

  if (!job) return null;

  await job.update({
    status: 'PROCESSANDO',
    attempts: Number(job.attempts || 0) + 1,
    locked_at: new Date(),
    locked_by: WORKER_ID,
    started_at: new Date()
  });

  return job;
}

async function finishJob(job, result, startedAt) {
  const duracaoMs = Date.now() - startedAt;
  await job.update({
    status: 'SUCESSO',
    finished_at: new Date(),
    duracao_ms: duracaoMs,
    result_json: JSON.stringify(result || {}),
    last_error: null,
    locked_at: null,
    locked_by: null
  });

  await SstTelemetryMetric.create({
    tipo_metrica: 'JOB_EXECUTADO',
    escopo_tipo: 'SISTEMA',
    empresa_id: job.empresa_id,
    obra_id: job.obra_id,
    colaborador_id: job.colaborador_id,
    referencia_tipo: 'sst_jobs',
    referencia_id: job.id,
    valor: 1,
    unidade: 'job',
    status: 'REGISTRADO',
    duracao_ms: duracaoMs,
    payload_json: JSON.stringify({ job_type: job.job_type })
  }).catch(() => null);

  return job;
}

async function failJob(job, error, startedAt) {
  const duracaoMs = Date.now() - startedAt;
  const attempts = Number(job.attempts || 0);
  const maxAttempts = Number(job.max_attempts || 1);
  const finalStatus = attempts >= maxAttempts ? 'DEAD_LETTER' : 'ERRO';
  const nextRunAt = new Date(Date.now() + Math.min(60, attempts * 10) * 1000);

  await job.update({
    status: finalStatus,
    finished_at: new Date(),
    duracao_ms: duracaoMs,
    last_error: error.message || String(error),
    next_run_at: finalStatus === 'ERRO' ? nextRunAt : job.next_run_at,
    locked_at: null,
    locked_by: null
  });

  await SstTelemetryMetric.create({
    tipo_metrica: 'JOB_FALHA',
    escopo_tipo: 'SISTEMA',
    empresa_id: job.empresa_id,
    obra_id: job.obra_id,
    colaborador_id: job.colaborador_id,
    referencia_tipo: 'sst_jobs',
    referencia_id: job.id,
    valor: 1,
    unidade: 'job',
    status: 'ERRO',
    duracao_ms: duracaoMs,
    payload_json: JSON.stringify({ job_type: job.job_type, erro: error.message || String(error) })
  }).catch(() => null);

  return job;
}

async function processNextSstJob({ queue_name = DEFAULT_QUEUE, handlers = {} } = {}) {
  const job = await claimNextJob(queue_name);
  if (!job) return { processed: false, message: 'Nenhum job SST pendente.' };

  const startedAt = Date.now();
  const payload = parseJson(job.payload_json);
  const handler = handlers[job.job_type];

  if (!handler) {
    await failJob(job, new Error(`Handler SST nao registrado para ${job.job_type}.`), startedAt);
    return { processed: true, status: 'ERRO', job };
  }

  try {
    const result = await handler(payload, job);
    await finishJob(job, result, startedAt);
    return { processed: true, status: 'SUCESSO', job, result };
  } catch (error) {
    await failJob(job, error, startedAt);
    return { processed: true, status: 'ERRO', job, error: error.message };
  }
}

async function gerarStatusFilasSst(query = {}) {
  const queueName = query.queue_name || DEFAULT_QUEUE;
  const where = { queue_name: queueName };
  const [jobsPorStatus, avgDuration] = await Promise.all([
    SstJob.findAll({
      attributes: [
        'status',
        [SstJob.sequelize.fn('COUNT', SstJob.sequelize.col('status')), 'total']
      ],
      where,
      group: ['status'],
      raw: true
    }),
    SstJob.findOne({
      attributes: [[SstJob.sequelize.fn('AVG', SstJob.sequelize.col('duracao_ms')), 'media']],
      where: { ...where, duracao_ms: { [Op.ne]: null } },
      raw: true
    })
  ]);

  const status = jobsPorStatus.reduce((acc, row) => {
    acc[row.status || 'SEM_STATUS'] = Number(row.total || 0);
    return acc;
  }, {});

  const snapshot = {
    queue_name: queueName,
    pending_count: status.PENDENTE || 0,
    processing_count: status.PROCESSANDO || 0,
    success_count: status.SUCESSO || 0,
    error_count: status.ERRO || 0,
    dead_letter_count: status.DEAD_LETTER || 0,
    avg_duration_ms: Math.round(Number(avgDuration?.media || 0)),
    sampled_at: new Date()
  };

  await SstQueueMetric.create(snapshot).catch(() => null);

  return {
    queue_name: queueName,
    status,
    snapshot,
    workers: {
      mode: 'database-backed',
      worker_id: WORKER_ID,
      bullmq_ready: true,
      redis_required_now: false
    }
  };
}

module.exports = {
  DEFAULT_QUEUE,
  enqueueSstJob,
  gerarStatusFilasSst,
  processNextSstJob
};
