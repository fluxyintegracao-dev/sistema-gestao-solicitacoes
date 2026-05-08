const { Op } = require('sequelize');
const {
  PaymentBatch,
  PaymentBatchItem,
  PaymentAccount,
  PaymentEvent,
  PaymentIntent,
  PaymentJob,
  PaymentProvider,
  PaymentTransaction,
  sequelize
} = require('../models');
const { env } = require('../config/env');
const { countValidApprovals, verifyMfaStepUp } = require('./paymentApprovalService');
const bancoDoBrasilProvider = require('./paymentProviderBancoDoBrasil');
const bancoDoBrasilSandboxProvider = require('./bancoDoBrasilPayments/BancoDoBrasilPaymentProvider');
const { sanitizePayload } = require('./bancoDoBrasilPayments/bancoDoBrasilErrors');
const { registrarEventoSeguranca } = require('./securityLogService');

const SEND_JOB_TYPES = ['SEND_PAYMENT_BATCH', 'BB_SUBMIT_PIX_BATCH', 'BB_RELEASE_BATCH'];
const STALE_PROCESSING_JOB_MS = 15 * 60 * 1000;

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function buildBbNumeroRequisicao(batchId) {
  const base = Number(batchId);
  if (!Number.isInteger(base) || base <= 0) {
    throw createHttpError(400, 'Nao foi possivel gerar numeroRequisicao unico para o Banco do Brasil.');
  }

  const transactions = await PaymentTransaction.findAll({
    where: { payment_batch_id: batchId },
    attributes: ['request_snapshot'],
    order: [['createdAt', 'DESC']],
    limit: 100
  });
  const usedNumbers = new Set(
    transactions
      .map((transaction) => Number(transaction.request_snapshot?.body?.numeroRequisicao || 0))
      .filter((number) => Number.isInteger(number) && number > 0)
  );

  for (let offset = 0; offset < 900000; offset += 1) {
    const numero = 100000 + ((Date.now() + offset) % 900000);
    if (!usedNumbers.has(numero)) return numero;
  }

  throw createHttpError(400, 'Nao foi possivel gerar numeroRequisicao unico para o Banco do Brasil.');
}

async function ensureNoPendingSendJob(batchId) {
  await PaymentJob.update(
    {
      status: 'ERRO',
      locked_at: null,
      locked_by: null,
      last_error: 'Job marcado como erro automaticamente por timeout operacional.'
    },
    {
      where: {
        job_type: { [Op.in]: SEND_JOB_TYPES },
        entity_type: 'PAYMENT_BATCH',
        entity_id: batchId,
        status: 'PROCESSANDO',
        locked_at: { [Op.lt]: new Date(Date.now() - STALE_PROCESSING_JOB_MS) }
      }
    }
  );

  const pendingJob = await PaymentJob.findOne({
    where: {
      job_type: { [Op.in]: SEND_JOB_TYPES },
      entity_type: 'PAYMENT_BATCH',
      entity_id: batchId,
      status: { [Op.in]: ['PENDENTE', 'PROCESSANDO'] }
    },
    order: [['createdAt', 'DESC']]
  });

  if (pendingJob) {
    throw createHttpError(409, 'Ja existe um job de envio pendente ou em processamento para este lote.');
  }
}

async function createSendBatchJob(batchId) {
  return PaymentJob.create({
    job_type: 'SEND_PAYMENT_BATCH',
    entity_type: 'PAYMENT_BATCH',
    entity_id: batchId,
    status: 'PENDENTE',
    attempts: 0,
    max_attempts: 3,
    next_run_at: new Date()
  });
}

async function createPaymentJob(batchId, jobType, nextRunAt = new Date()) {
  return PaymentJob.create({
    job_type: jobType,
    entity_type: 'PAYMENT_BATCH',
    entity_id: batchId,
    status: 'PENDENTE',
    attempts: 0,
    max_attempts: 3,
    next_run_at: nextRunAt
  });
}

async function getBatchWithPaymentGraph(batchId, transaction = null, lock = null) {
  return PaymentBatch.findByPk(batchId, {
    include: [
      {
        model: PaymentBatchItem,
        as: 'items',
        include: [{ model: PaymentIntent, as: 'intent' }]
      },
      { model: PaymentProvider, as: 'provider' },
      { model: PaymentAccount, as: 'paymentAccount' }
    ],
    transaction,
    lock
  });
}

async function enqueueSendBatch(req, id, payload = {}) {
  await verifyMfaStepUp(req, payload.codigo_mfa || payload.mfa_code);

  const batch = await PaymentBatch.findByPk(id, {
    include: [{ model: PaymentBatchItem, as: 'items' }]
  });
  if (!batch) throw createHttpError(404, 'Lote de pagamento nao encontrado.');
  if (String(batch.status || '').toUpperCase() !== 'APROVADO') {
    throw createHttpError(400, 'Lote precisa estar aprovado para envio.');
  }
  if ((await countValidApprovals(batch.id)) < 2) {
    throw createHttpError(400, 'Lote exige duas aprovacoes validas.');
  }

  await ensureNoPendingSendJob(batch.id);
  const job = await createSendBatchJob(batch.id);

  await processSendBatchJob(req, job.id);
  return PaymentBatch.findByPk(batch.id);
}

async function reprocessBatch(req, id, payload = {}) {
  await verifyMfaStepUp(req, payload.codigo_mfa || payload.mfa_code);

  const batch = await PaymentBatch.findByPk(id, {
    include: [{ model: PaymentBatchItem, as: 'items' }]
  });
  if (!batch) throw createHttpError(404, 'Lote de pagamento nao encontrado.');

  const batchStatus = String(batch.status || '').toUpperCase();
  const reprocessableBatchStatuses = ['FALHA_INTEGRACAO', 'REJEITADO', 'PARCIALMENTE_REJEITADO'];
  if (!reprocessableBatchStatuses.includes(batchStatus)) {
    throw createHttpError(400, 'Apenas lotes com falha ou rejeicao podem ser reprocessados.');
  }

  if ((await countValidApprovals(batch.id)) < 2) {
    throw createHttpError(400, 'Lote exige duas aprovacoes validas para reprocessamento.');
  }

  await ensureNoPendingSendJob(batch.id);

  const reprocessableItemStatuses = ['FALHA_INTEGRACAO', 'REJEITADO_BANCO', 'REJEITADO'];
  const intentIds = (batch.items || [])
    .filter((item) => reprocessableItemStatuses.includes(String(item.status || '').toUpperCase()))
    .map((item) => item.payment_intent_id)
    .filter(Boolean);

  if (!intentIds.length) {
    throw createHttpError(400, 'Nao ha itens elegiveis para reprocessamento neste lote.');
  }

  await sequelize.transaction(async (transaction) => {
    await batch.update({
      status: 'APROVADO',
      aprovacao_status: 'APROVADO',
      sent_at: null,
      sent_by: null,
      closed_at: null
    }, { transaction });

    await PaymentIntent.update(
      {
        status: 'APROVADO',
        enviado_em: null,
        confirmado_banco_em: null,
        updated_by: req.user?.id || null
      },
      { where: { id: { [Op.in]: intentIds } }, transaction }
    );

    await PaymentBatchItem.update(
      {
        status: 'APROVADO',
        erro_codigo: null,
        erro_mensagem: null
      },
      {
        where: {
          payment_batch_id: batch.id,
          payment_intent_id: { [Op.in]: intentIds }
        },
        transaction
      }
    );
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'PAYMENT_BATCH_REPROCESS_REQUESTED',
    recursoTipo: 'PAYMENT_BATCH',
    recursoId: batch.id,
    status: 'SUCCESS',
    descricao: 'Reprocessamento de lote de pagamento solicitado',
    metadata: {
      justificativa: payload.justificativa || null,
      itens_reprocessados: intentIds.length
    }
  });

  const job = env.bbSandboxRealEnabled
    ? await createPaymentJob(batch.id, 'BB_SUBMIT_PIX_BATCH')
    : await createSendBatchJob(batch.id);

  if (env.bbSandboxRealEnabled) {
    await processBbSubmitPixBatchJob(req, job.id);
  } else {
    await processSendBatchJob(req, job.id);
  }
  return PaymentBatch.findByPk(batch.id);
}

async function processSendBatchJob(req, jobId) {
  const job = await PaymentJob.findByPk(jobId);
  if (!job) throw createHttpError(404, 'Job de pagamento nao encontrado.');
  if (String(job.status || '').toUpperCase() !== 'PENDENTE') return job;

  return sequelize.transaction(async (transaction) => {
    await job.update({
      status: 'PROCESSANDO',
      attempts: Number(job.attempts || 0) + 1,
      locked_at: new Date(),
      locked_by: `api:${req.user?.id || 'system'}`
    }, { transaction });

    const batch = await PaymentBatch.findByPk(job.entity_id, {
      include: [
        {
          model: PaymentBatchItem,
          as: 'items',
          include: [{ model: PaymentIntent, as: 'intent' }]
        },
        { model: PaymentProvider, as: 'provider' },
        { model: PaymentAccount, as: 'paymentAccount' }
      ],
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!batch) throw createHttpError(404, 'Lote de pagamento nao encontrado.');

    const intentIds = batch.items.map((item) => item.payment_intent_id);
    const attemptNumber = await PaymentTransaction.count({
      where: { payment_batch_id: batch.id },
      transaction
    }) + 1;
    const providerContext = {
      provider: batch.provider,
      account: batch.paymentAccount
    };
    await bancoDoBrasilProvider.authenticate(providerContext);
    const requestSnapshot = bancoDoBrasilProvider.buildBatchRequestSnapshot(batch, providerContext);
    const providerResponse = await bancoDoBrasilProvider.submitBatch(batch, providerContext);
    const responseSnapshot = bancoDoBrasilProvider.sanitizeProviderResponse(providerResponse);
    const providerStatus = bancoDoBrasilProvider.normalizeStatus(providerResponse);

    await batch.update({
      status: 'ENVIADO_AO_BANCO',
      sent_by: req.user?.id || null,
      sent_at: new Date()
    }, { transaction });
    await PaymentIntent.update(
      { status: 'ENVIADO_AO_BANCO', enviado_em: new Date(), updated_by: req.user?.id || null },
      { where: { id: { [Op.in]: intentIds } }, transaction }
    );
    await PaymentBatchItem.update(
      { status: 'ENVIADO_AO_BANCO' },
      { where: { payment_batch_id: batch.id }, transaction }
    );

    await PaymentTransaction.create({
      payment_batch_id: batch.id,
      provider_id: batch.provider_id,
      attempt: attemptNumber,
      status: providerStatus,
      http_status: 202,
      provider_batch_id: providerResponse.provider_batch_id,
      correlation_id: batch.correlation_id,
      idempotency_key: batch.idempotency_key,
      request_snapshot: requestSnapshot,
      response_snapshot: responseSnapshot,
      started_at: new Date(),
      finished_at: new Date()
    }, { transaction });

    await job.update({
      status: 'SUCESSO',
      last_error: null
    }, { transaction });

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'PAYMENT_BATCH_SENT_MOCK',
      recursoTipo: 'PAYMENT_BATCH',
      recursoId: batch.id,
      status: 'SUCCESS',
      descricao: 'Lote enviado ao provider mockado'
    });

    return job;
  });
}

function mapProviderResultToBatchStatus(providerStatus) {
  const status = String(providerStatus || '').toUpperCase();
  if (status === 'AGUARDANDO_CONFIRMACAO_BAIXA' || status === 'CONFIRMADO_BANCO') {
    return 'AGUARDANDO_CONFIRMACAO_BAIXA';
  }
  if (status === 'REJEITADO_BANCO') return 'REJEITADO';
  if (status === 'CANCELADO') return 'CANCELADO';
  if (status === 'PARCIALMENTE_REJEITADO') return 'PARCIALMENTE_REJEITADO';
  if (status === 'FALHA_INTEGRACAO') return 'FALHA_INTEGRACAO';
  if (status === 'ENVIADO_AO_BANCO') return 'ENVIADO_AO_BANCO';
  return 'PROCESSANDO_BANCO';
}

function mapProviderResultToIntentStatus(providerStatus) {
  const status = String(providerStatus || '').toUpperCase();
  if (status === 'AGUARDANDO_CONFIRMACAO_BAIXA' || status === 'CONFIRMADO_BANCO') {
    return 'AGUARDANDO_CONFIRMACAO_BAIXA';
  }
  if (status === 'REJEITADO_BANCO') return 'REJEITADO_BANCO';
  if (status === 'CANCELADO') return 'CANCELADO';
  if (status === 'FALHA_INTEGRACAO') return 'FALHA_INTEGRACAO';
  if (status === 'ENVIADO_AO_BANCO') return 'ENVIADO_AO_BANCO';
  return 'PROCESSANDO_BANCO';
}

async function enqueueBbSandboxSendBatch(req, id, payload = {}) {
  await verifyMfaStepUp(req, payload.codigo_mfa || payload.mfa_code);

  if (!env.bbSandboxRealEnabled) {
    return enqueueSendBatch(req, id, payload);
  }

  const batch = await PaymentBatch.findByPk(id, {
    include: [{ model: PaymentBatchItem, as: 'items' }]
  });
  if (!batch) throw createHttpError(404, 'Lote de pagamento nao encontrado.');
  if (String(batch.status || '').toUpperCase() !== 'APROVADO') {
    throw createHttpError(400, 'Lote precisa estar aprovado para envio BB sandbox.');
  }
  if ((await countValidApprovals(batch.id)) < 2) {
    throw createHttpError(400, 'Lote exige duas aprovacoes validas.');
  }

  await ensureNoPendingSendJob(batch.id);
  const job = await createPaymentJob(batch.id, 'BB_SUBMIT_PIX_BATCH');
  await processBbSubmitPixBatchJob(req, job.id);
  return PaymentBatch.findByPk(batch.id);
}

async function processBbSubmitPixBatchJob(req, jobId) {
  const job = await PaymentJob.findByPk(jobId);
  if (!job) throw createHttpError(404, 'Job de pagamento BB nao encontrado.');
  if (String(job.status || '').toUpperCase() !== 'PENDENTE') return job;

  await job.update({
    status: 'PROCESSANDO',
    attempts: Number(job.attempts || 0) + 1,
    locked_at: new Date(),
    locked_by: `bb-api:${req.user?.id || 'system'}`
  });

  const batch = await getBatchWithPaymentGraph(job.entity_id);
  if (!batch) throw createHttpError(404, 'Lote de pagamento nao encontrado.');

  const startedAt = new Date();
  const attemptNumber = await PaymentTransaction.count({
    where: { payment_batch_id: batch.id }
  }) + 1;

  try {
    const numeroRequisicaoBb = await buildBbNumeroRequisicao(batch.id);
    const providerResult = await bancoDoBrasilSandboxProvider.submitPixBatch(batch, {
      numeroRequisicao: numeroRequisicaoBb
    });
    const now = new Date();
    const batchStatus = mapProviderResultToBatchStatus(providerResult.provider_status);
    const intentStatus = mapProviderResultToIntentStatus(providerResult.provider_status);
    const intentIds = (batch.items || []).map((item) => item.payment_intent_id).filter(Boolean);

    await sequelize.transaction(async (transaction) => {
      await batch.update({
        status: batchStatus,
        sent_by: req.user?.id || null,
        sent_at: now
      }, { transaction });
      await PaymentIntent.update(
        {
          status: intentStatus,
          enviado_em: now,
          confirmado_banco_em: intentStatus === 'AGUARDANDO_CONFIRMACAO_BAIXA' ? now : null,
          updated_by: req.user?.id || null
        },
        { where: { id: { [Op.in]: intentIds } }, transaction }
      );
      await PaymentBatchItem.update(
        { status: intentStatus },
        { where: { payment_batch_id: batch.id }, transaction }
      );
      await PaymentTransaction.create({
        payment_batch_id: batch.id,
        provider_id: batch.provider_id,
        attempt: attemptNumber,
        status: providerResult.provider_status || 'ENVIADO_AO_BANCO',
        http_status: providerResult.http_status,
        provider_batch_id: providerResult.provider_batch_id,
        provider_transaction_id: providerResult.provider_transaction_id,
        correlation_id: batch.correlation_id,
        idempotency_key: batch.idempotency_key,
        request_snapshot: providerResult.request_snapshot,
        response_snapshot: providerResult.response_snapshot,
        started_at: startedAt,
        finished_at: now
      }, { transaction });
      await PaymentEvent.create({
        payment_batch_id: batch.id,
        provider_id: batch.provider_id,
        event_type: 'BB_SUBMIT_PIX_BATCH_RESPONSE',
        provider_event_id: providerResult.provider_batch_id,
        payload: providerResult.data,
        received_at: now,
        processed_at: now,
        processing_status: 'PROCESSADO'
      }, { transaction });
      await job.update({ status: 'SUCESSO', last_error: null }, { transaction });

      const nextRunAt = new Date(Date.now() + 5 * 60 * 1000);
      await createPaymentJob(batch.id, 'BB_SYNC_BATCH_STATUS', nextRunAt);
    });

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'PAYMENT_BATCH_SENT_BB_SANDBOX',
      recursoTipo: 'PAYMENT_BATCH',
      recursoId: batch.id,
      status: 'SUCCESS',
      descricao: 'Lote PIX enviado ao Banco do Brasil sandbox'
    });

    if (env.bbAutoLiberarLote) {
      const releaseJob = await createPaymentJob(batch.id, 'BB_RELEASE_BATCH');
      await processBbReleaseBatchJob(req, releaseJob.id);
    }

    return job;
  } catch (error) {
    const normalized = bancoDoBrasilSandboxProvider.normalizeError(error);
    await sequelize.transaction(async (transaction) => {
      await PaymentTransaction.create({
        payment_batch_id: batch.id,
        provider_id: batch.provider_id,
        attempt: attemptNumber,
        status: 'FALHA_INTEGRACAO',
        http_status: normalized.statusCode || null,
        correlation_id: batch.correlation_id,
        idempotency_key: batch.idempotency_key,
        request_snapshot: sanitizePayload(error.details?.request_snapshot || null),
        response_snapshot: sanitizePayload(error.details?.response_snapshot || error.details || null),
        error_code: normalized.code,
        error_message: normalized.message,
        started_at: startedAt,
        finished_at: new Date()
      }, { transaction });
      await batch.update({ status: 'FALHA_INTEGRACAO' }, { transaction });
      await PaymentBatchItem.update(
        {
          status: 'FALHA_INTEGRACAO',
          erro_codigo: normalized.code,
          erro_mensagem: normalized.message
        },
        { where: { payment_batch_id: batch.id }, transaction }
      );
      await PaymentIntent.update(
        {
          status: 'FALHA_INTEGRACAO',
          updated_by: req.user?.id || null
        },
        {
          where: {
            id: { [Op.in]: (batch.items || []).map((item) => item.payment_intent_id).filter(Boolean) }
          },
          transaction
        }
      );
      await job.update({ status: 'ERRO', last_error: normalized.message }, { transaction });
    });
    throw createHttpError(normalized.statusCode || 500, normalized.message);
  }
}

async function processBbReleaseBatchJob(req, jobId) {
  const job = await PaymentJob.findByPk(jobId);
  if (!job) throw createHttpError(404, 'Job de liberacao BB nao encontrado.');
  if (String(job.status || '').toUpperCase() !== 'PENDENTE') return job;

  await job.update({
    status: 'PROCESSANDO',
    attempts: Number(job.attempts || 0) + 1,
    locked_at: new Date(),
    locked_by: `bb-api:${req.user?.id || 'system'}`
  });

  const batch = await getBatchWithPaymentGraph(job.entity_id);
  if (!batch) throw createHttpError(404, 'Lote de pagamento nao encontrado.');

  const startedAt = new Date();
  const attemptNumber = await PaymentTransaction.count({
    where: { payment_batch_id: batch.id }
  }) + 1;

  try {
    const lastSubmitTransaction = await PaymentTransaction.findOne({
      where: { payment_batch_id: batch.id, provider_batch_id: { [Op.ne]: null } },
      order: [['createdAt', 'DESC']]
    });
    const providerResult = await bancoDoBrasilSandboxProvider.releasePayments(batch, {
      numeroRequisicao: lastSubmitTransaction?.provider_batch_id
    });
    const now = new Date();

    await sequelize.transaction(async (transaction) => {
      await PaymentTransaction.create({
        payment_batch_id: batch.id,
        provider_id: batch.provider_id,
        attempt: attemptNumber,
        status: providerResult.provider_status || 'PROCESSANDO_BANCO',
        http_status: providerResult.http_status,
        provider_batch_id: providerResult.provider_batch_id,
        correlation_id: batch.correlation_id,
        idempotency_key: batch.idempotency_key,
        request_snapshot: providerResult.request_snapshot,
        response_snapshot: providerResult.response_snapshot,
        started_at: startedAt,
        finished_at: now
      }, { transaction });
      await PaymentEvent.create({
        payment_batch_id: batch.id,
        provider_id: batch.provider_id,
        event_type: 'BB_RELEASE_BATCH_RESPONSE',
        provider_event_id: providerResult.provider_batch_id,
        payload: providerResult.data,
        received_at: now,
        processed_at: now,
        processing_status: 'PROCESSADO'
      }, { transaction });
      await job.update({ status: 'SUCESSO', last_error: null }, { transaction });
    });

    return job;
  } catch (error) {
    const normalized = bancoDoBrasilSandboxProvider.normalizeError(error);
    await sequelize.transaction(async (transaction) => {
      await PaymentTransaction.create({
        payment_batch_id: batch.id,
        provider_id: batch.provider_id,
        attempt: attemptNumber,
        status: 'FALHA_INTEGRACAO',
        http_status: normalized.statusCode || null,
        correlation_id: batch.correlation_id,
        idempotency_key: batch.idempotency_key,
        request_snapshot: sanitizePayload(error.details?.request_snapshot || null),
        response_snapshot: sanitizePayload(error.details?.response_snapshot || error.details || null),
        error_code: normalized.code,
        error_message: normalized.message,
        started_at: startedAt,
        finished_at: new Date()
      }, { transaction });
      await job.update({ status: 'ERRO', last_error: normalized.message }, { transaction });
    });
    throw error;
  }
}

async function sincronizarStatusBb(req, id) {
  if (!env.bbSandboxRealEnabled) {
    throw createHttpError(400, 'Sandbox real BB desabilitado. Use o fluxo mockado ou ative BB_SANDBOX_REAL_ENABLED.');
  }

  const batch = await getBatchWithPaymentGraph(id);
  if (!batch) throw createHttpError(404, 'Lote de pagamento nao encontrado.');

  const lastTransaction = await PaymentTransaction.findOne({
    where: { payment_batch_id: batch.id, provider_batch_id: { [Op.ne]: null } },
    order: [['createdAt', 'DESC']]
  });
  const providerBatchId = lastTransaction?.provider_batch_id || batch.id;
  const startedAt = new Date();
  const attemptNumber = await PaymentTransaction.count({ where: { payment_batch_id: batch.id } }) + 1;
  const providerResult = await bancoDoBrasilSandboxProvider.getBatchStatus(providerBatchId);
  const now = new Date();
  const batchStatus = mapProviderResultToBatchStatus(providerResult.provider_status);
  const intentStatus = mapProviderResultToIntentStatus(providerResult.provider_status);
  const intentIds = (batch.items || []).map((item) => item.payment_intent_id).filter(Boolean);

  await sequelize.transaction(async (transaction) => {
    await batch.update({ status: batchStatus }, { transaction });
    await PaymentIntent.update(
      {
        status: intentStatus,
        confirmado_banco_em: intentStatus === 'AGUARDANDO_CONFIRMACAO_BAIXA' ? now : null,
        updated_by: req.user?.id || null
      },
      { where: { id: { [Op.in]: intentIds } }, transaction }
    );
    await PaymentBatchItem.update(
      {
        status: intentStatus,
        erro_codigo: intentStatus === 'REJEITADO_BANCO' ? 'BB_REJEITADO' : null,
        erro_mensagem: intentStatus === 'REJEITADO_BANCO' ? 'Pagamento rejeitado pelo Banco do Brasil.' : null
      },
      { where: { payment_batch_id: batch.id }, transaction }
    );
    await PaymentTransaction.create({
      payment_batch_id: batch.id,
      provider_id: batch.provider_id,
      attempt: attemptNumber,
      status: providerResult.provider_status,
      http_status: providerResult.http_status,
      provider_batch_id: providerResult.provider_batch_id,
      correlation_id: batch.correlation_id,
      idempotency_key: batch.idempotency_key,
      request_snapshot: providerResult.request_snapshot,
      response_snapshot: providerResult.response_snapshot,
      started_at: startedAt,
      finished_at: now
    }, { transaction });
    await PaymentEvent.create({
      payment_batch_id: batch.id,
      provider_id: batch.provider_id,
      event_type: 'BB_BATCH_STATUS_SYNCED',
      provider_event_id: providerResult.provider_batch_id,
      payload: providerResult.data,
      received_at: now,
      processed_at: now,
      processing_status: 'PROCESSADO'
    }, { transaction });
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'PAYMENT_BATCH_BB_STATUS_SYNCED',
    recursoTipo: 'PAYMENT_BATCH',
    recursoId: batch.id,
    status: 'SUCCESS',
    descricao: 'Status do lote sincronizado com o Banco do Brasil sandbox'
  });

  return getBatchWithPaymentGraph(batch.id);
}

async function listBbTransactions(req, id) {
  void req;
  const batch = await PaymentBatch.findByPk(id);
  if (!batch) throw createHttpError(404, 'Lote de pagamento nao encontrado.');

  return PaymentTransaction.findAll({
    where: { payment_batch_id: batch.id },
    order: [['createdAt', 'DESC']],
    limit: 50
  });
}

async function getBbHealth() {
  return bancoDoBrasilSandboxProvider.getHealth();
}

async function handleBbWebhook(req) {
  if (!env.bbWebhookEnabled) {
    throw createHttpError(404, 'Webhook BB desabilitado.');
  }

  const provider = await PaymentProvider.findOne({
    where: { codigo: env.bbPaymentsProvider || 'BB' }
  });
  if (!provider) throw createHttpError(404, 'Provider BB nao encontrado.');

  return PaymentEvent.create({
    provider_id: provider.id,
    event_type: 'BB_WEBHOOK_RECEIVED',
    provider_event_id: req.body?.id || req.body?.numeroRequisicao || null,
    payload: sanitizePayload(req.body || {}),
    received_at: new Date(),
    processing_status: 'PENDENTE'
  });
}

async function markBatchAsBankConfirmedMock(req, id, payload = {}) {
  const resultado = String(payload.resultado || 'CONFIRMADO').trim().toUpperCase();
  const batch = await PaymentBatch.findByPk(id, {
    include: [{ model: PaymentBatchItem, as: 'items' }]
  });
  if (!batch) throw createHttpError(404, 'Lote de pagamento nao encontrado.');
  if (!['ENVIADO_AO_BANCO', 'PROCESSANDO_BANCO'].includes(String(batch.status || '').toUpperCase())) {
    throw createHttpError(400, 'Lote precisa ter sido enviado ao banco.');
  }

  const rejected = resultado === 'REJEITADO';
  const failed = ['FALHA', 'FALHA_INTEGRACAO', 'ERRO'].includes(resultado);
  const intentStatus = failed
    ? 'FALHA_INTEGRACAO'
    : rejected
      ? 'REJEITADO_BANCO'
      : 'AGUARDANDO_CONFIRMACAO_BAIXA';
  const batchStatus = failed
    ? 'FALHA_INTEGRACAO'
    : rejected
      ? 'REJEITADO'
      : 'AGUARDANDO_CONFIRMACAO_BAIXA';
  const now = new Date();
  const intentIds = batch.items.map((item) => item.payment_intent_id);

  await sequelize.transaction(async (transaction) => {
    await batch.update({ status: batchStatus }, { transaction });
    await PaymentIntent.update(
      {
        status: intentStatus,
        confirmado_banco_em: rejected || failed ? null : now,
        updated_by: req.user?.id || null
      },
      { where: { id: { [Op.in]: intentIds } }, transaction }
    );
    await PaymentBatchItem.update(
      {
        status: intentStatus,
        erro_codigo: failed ? 'MOCK_FALHA_INTEGRACAO' : rejected ? 'MOCK_REJEITADO' : null,
        erro_mensagem: failed ? 'Falha mockada de integracao.' : rejected ? 'Retorno mockado rejeitado.' : null
      },
      { where: { payment_batch_id: batch.id }, transaction }
    );
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: failed
      ? 'PAYMENT_BATCH_INTEGRATION_FAILED_MOCK'
      : rejected
        ? 'PAYMENT_BATCH_REJECTED_BY_BANK_MOCK'
        : 'PAYMENT_BATCH_CONFIRMED_BY_BANK_MOCK',
    recursoTipo: 'PAYMENT_BATCH',
    recursoId: batch.id,
    status: 'SUCCESS',
    descricao: failed
      ? 'Retorno mockado marcou falha de integracao no lote'
      : rejected
        ? 'Retorno mockado rejeitou o lote'
        : 'Retorno mockado confirmou o lote'
  });

  return PaymentBatch.findByPk(batch.id);
}

module.exports = {
  enqueueBbSandboxSendBatch,
  enqueueSendBatch,
  getBbHealth,
  handleBbWebhook,
  listBbTransactions,
  markBatchAsBankConfirmedMock,
  processBbSubmitPixBatchJob,
  processBbReleaseBatchJob,
  processSendBatchJob,
  reprocessBatch,
  sincronizarStatusBb
};
