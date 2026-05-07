const { Op } = require('sequelize');
const {
  PaymentBatch,
  PaymentBatchItem,
  PaymentIntent,
  PaymentJob,
  PaymentTransaction,
  sequelize
} = require('../models');
const { countValidApprovals, verifyMfaStepUp } = require('./paymentApprovalService');
const { registrarEventoSeguranca } = require('./securityLogService');

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
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

  const job = await PaymentJob.create({
    job_type: 'SEND_PAYMENT_BATCH',
    entity_type: 'PAYMENT_BATCH',
    entity_id: batch.id,
    status: 'PENDENTE',
    attempts: 0,
    max_attempts: 3,
    next_run_at: new Date()
  });

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
      include: [{ model: PaymentBatchItem, as: 'items' }],
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!batch) throw createHttpError(404, 'Lote de pagamento nao encontrado.');

    const intentIds = batch.items.map((item) => item.payment_intent_id);
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
      attempt: Number(job.attempts || 0) + 1,
      status: 'ENVIADO_AO_BANCO',
      http_status: 202,
      provider_batch_id: `MOCK-BB-${batch.codigo}`,
      correlation_id: batch.correlation_id,
      idempotency_key: batch.idempotency_key,
      request_snapshot: { mode: 'MOCK_HOMOLOGACAO', batch_id: batch.id },
      response_snapshot: { accepted: true, provider_batch_id: `MOCK-BB-${batch.codigo}` },
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
  const intentStatus = rejected ? 'REJEITADO_BANCO' : 'AGUARDANDO_CONFIRMACAO_BAIXA';
  const batchStatus = rejected ? 'REJEITADO' : 'AGUARDANDO_CONFIRMACAO_BAIXA';
  const now = new Date();
  const intentIds = batch.items.map((item) => item.payment_intent_id);

  await sequelize.transaction(async (transaction) => {
    await batch.update({ status: batchStatus }, { transaction });
    await PaymentIntent.update(
      {
        status: intentStatus,
        confirmado_banco_em: rejected ? null : now,
        updated_by: req.user?.id || null
      },
      { where: { id: { [Op.in]: intentIds } }, transaction }
    );
    await PaymentBatchItem.update(
      {
        status: intentStatus,
        erro_codigo: rejected ? 'MOCK_REJEITADO' : null,
        erro_mensagem: rejected ? 'Retorno mockado rejeitado.' : null
      },
      { where: { payment_batch_id: batch.id }, transaction }
    );
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: rejected ? 'PAYMENT_BATCH_REJECTED_BY_BANK_MOCK' : 'PAYMENT_BATCH_CONFIRMED_BY_BANK_MOCK',
    recursoTipo: 'PAYMENT_BATCH',
    recursoId: batch.id,
    status: 'SUCCESS',
    descricao: rejected ? 'Retorno mockado rejeitou o lote' : 'Retorno mockado confirmou o lote'
  });

  return PaymentBatch.findByPk(batch.id);
}

module.exports = {
  enqueueSendBatch,
  markBatchAsBankConfirmedMock,
  processSendBatchJob
};
