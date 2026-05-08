const { Op } = require('sequelize');
const {
  PaymentBatch,
  PaymentBatchItem,
  PaymentAccount,
  PaymentIntent,
  PaymentJob,
  PaymentProvider,
  PaymentTransaction,
  sequelize
} = require('../models');
const { countValidApprovals, verifyMfaStepUp } = require('./paymentApprovalService');
const bancoDoBrasilProvider = require('./paymentProviderBancoDoBrasil');
const { registrarEventoSeguranca } = require('./securityLogService');

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function ensureNoPendingSendJob(batchId) {
  const pendingJob = await PaymentJob.findOne({
    where: {
      job_type: 'SEND_PAYMENT_BATCH',
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

  const job = await createSendBatchJob(batch.id);
  await processSendBatchJob(req, job.id);
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
  enqueueSendBatch,
  markBatchAsBankConfirmedMock,
  processSendBatchJob,
  reprocessBatch
};
