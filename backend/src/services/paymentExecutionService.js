const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  PaymentBatch,
  PaymentBatchItem,
  PaymentAccount,
  PaymentApproval,
  PaymentEvent,
  PaymentIntent,
  PaymentJob,
  PaymentProvider,
  PaymentTransaction,
  User,
  sequelize
} = require('../models');
const { env } = require('../config/env');
const {
  REQUIRED_PAYMENT_BATCH_APPROVALS,
  assertApprovalHashesMatchCurrentBatch,
  countValidApprovals,
  verifyMfaStepUp
} = require('./paymentApprovalService');
const { validatePaymentBatchIntegrity } = require('./paymentBatchIntegrityService');
const bancoDoBrasilProvider = require('./paymentProviderBancoDoBrasil');
const bancoDoBrasilSandboxProvider = require('./bancoDoBrasilPayments/BancoDoBrasilPaymentProvider');
const { sanitizePayload } = require('./bancoDoBrasilPayments/bancoDoBrasilErrors');
const { registrarEventoSeguranca } = require('./securityLogService');
const { canSendPagamentosBanco } = require('./authorizationService');

const SEND_JOB_TYPES = ['SEND_PAYMENT_BATCH', 'BB_SUBMIT_PIX_BATCH'];
const STALE_PROCESSING_JOB_MS = 15 * 60 * 1000;

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isMockProviderBatchId(value) {
  return String(value || '').toUpperCase().startsWith('MOCK-');
}

async function findLastRealProviderBatchTransaction(batchId) {
  const transactions = await PaymentTransaction.findAll({
    where: { payment_batch_id: batchId, provider_batch_id: { [Op.ne]: null } },
    order: [['createdAt', 'DESC']],
    limit: 20
  });

  return transactions.find((transaction) => !isMockProviderBatchId(transaction.provider_batch_id)) || null;
}

function timingSafeEqualText(left, right) {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getBbWebhookProviderEventId(body = {}) {
  return String(
    body.id
      || body.eventId
      || body.provider_event_id
      || body.numeroRequisicao
      || body.numero_requisicao
      || body.numeroLote
      || ''
  ).trim() || null;
}

function assertBatchOwnedByUser(batch, userId) {
  const creatorId = Number(batch?.created_by || 0);
  const actorId = Number(userId || 0);
  if (!creatorId || !actorId || creatorId !== actorId) {
    throw createHttpError(403, 'Somente o usuario que criou o lote pode envia-lo ou reprocessa-lo.');
  }
}

async function assertSenderDidNotApprove(batchId, userId, { transaction = null } = {}) {
  const approval = await PaymentApproval.findOne({
    where: {
      entity_type: 'BATCH',
      entity_id: batchId,
      acao: 'APPROVE',
      status: 'APROVADO',
      aprovado_por: userId
    },
    transaction
  });
  if (approval) {
    throw createHttpError(403, 'O aprovador do lote nao pode envia-lo ao banco.');
  }
}

async function assertSenderRoleAllowed(userOrId, { transaction = null } = {}) {
  const user = typeof userOrId === 'object'
    ? userOrId
    : await User.findByPk(userOrId, { transaction });
  if (!user || user.ativo === false || !(await canSendPagamentosBanco(user))) {
    throw createHttpError(403, 'Usuario criador nao possui papel operacional valido para enviar lotes.');
  }
  return user;
}

function buildSendJobDedupeKey(batchId, jobType) {
  return `${String(jobType)}:PAYMENT_BATCH:${Number(batchId)}`;
}

async function ensureStableBbRequestId(batch, { transaction = null } = {}) {
  if (batch.provider_request_id) {
    return Number(batch.provider_request_id);
  }

  const preferred = Number(batch.id);
  const candidates = [];
  if (Number.isInteger(preferred) && preferred > 0 && preferred <= 999999) {
    candidates.push(preferred);
  }
  for (let attempt = 0; attempt < 30; attempt += 1) {
    candidates.push(crypto.randomInt(100000, 1000000));
  }

  for (const candidate of candidates) {
    const existing = await PaymentBatch.findOne({
      where: { provider_request_id: String(candidate) },
      attributes: ['id'],
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : null
    });
    if (existing && Number(existing.id) !== Number(batch.id)) continue;
    await batch.update({ provider_request_id: String(candidate) }, { transaction });
    return candidate;
  }

  throw createHttpError(409, 'Nao foi possivel reservar identificador bancario unico para o lote.');
}

async function ensureNoPendingSendJob(batchId, { transaction = null } = {}) {
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
      },
      transaction
    }
  );

  const pendingJob = await PaymentJob.findOne({
    where: {
      job_type: { [Op.in]: SEND_JOB_TYPES },
      entity_type: 'PAYMENT_BATCH',
      entity_id: batchId,
      status: { [Op.in]: ['PENDENTE', 'PROCESSANDO'] }
    },
    order: [['createdAt', 'DESC']],
    transaction,
    lock: transaction ? transaction.LOCK.UPDATE : null
  });

  if (pendingJob) {
    throw createHttpError(409, 'Ja existe um job de envio pendente ou em processamento para este lote.');
  }
}

async function createSendBatchJob(batchId, requestedBy, { transaction = null } = {}) {
  return PaymentJob.create({
    job_type: 'SEND_PAYMENT_BATCH',
    entity_type: 'PAYMENT_BATCH',
    entity_id: batchId,
    dedupe_key: buildSendJobDedupeKey(batchId, 'SEND_PAYMENT_BATCH'),
    requested_by: requestedBy || null,
    status: 'PENDENTE',
    attempts: 0,
    max_attempts: 3,
    next_run_at: new Date()
  }, { transaction });
}

async function createPaymentJob(batchId, jobType, nextRunAt = new Date(), options = {}) {
  return PaymentJob.create({
    job_type: jobType,
    entity_type: 'PAYMENT_BATCH',
    entity_id: batchId,
    dedupe_key: options.dedupeKey || null,
    requested_by: options.requestedBy || null,
    status: 'PENDENTE',
    attempts: 0,
    max_attempts: 3,
    next_run_at: nextRunAt
  }, { transaction: options.transaction || null });
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

async function enqueueNewSendJob(req, id, jobType) {
  const actorId = Number(req.user?.id || 0);
  let jobId = null;
  let batchId = Number(id);

  await sequelize.transaction(async (transaction) => {
    const batch = await validatePaymentBatchIntegrity(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
      expectedBatchStatuses: ['APROVADO'],
      expectedIntentStatuses: ['APROVADO'],
      phaseLabel: 'enfileiramento do envio ao banco'
    });
    batchId = batch.id;
    assertBatchOwnedByUser(batch, actorId);
    await assertSenderRoleAllowed(req.user, { transaction });
    await assertSenderDidNotApprove(batch.id, actorId, { transaction });

    if ((await countValidApprovals(batch.id, { transaction })) < REQUIRED_PAYMENT_BATCH_APPROVALS) {
      throw createHttpError(400, `Lote exige ${REQUIRED_PAYMENT_BATCH_APPROVALS} aprovacao valida.`);
    }
    await assertApprovalHashesMatchCurrentBatch(batch, {
      transaction,
      requireMinimumApprovals: true
    });
    await ensureNoPendingSendJob(batch.id, { transaction });

    if (jobType === 'BB_SUBMIT_PIX_BATCH') {
      await ensureStableBbRequestId(batch, { transaction });
    }

    const intentIds = (batch.items || []).map((item) => item.payment_intent_id).filter(Boolean);
    await batch.update({ status: 'ENFILEIRADO' }, { transaction });
    await PaymentIntent.update(
      { status: 'ENFILEIRADO', updated_by: actorId },
      { where: { id: { [Op.in]: intentIds } }, transaction }
    );
    await PaymentBatchItem.update(
      { status: 'ENFILEIRADO' },
      { where: { payment_batch_id: batch.id }, transaction }
    );

    const job = jobType === 'SEND_PAYMENT_BATCH'
      ? await createSendBatchJob(batch.id, actorId, { transaction })
      : await createPaymentJob(batch.id, jobType, new Date(), {
          transaction,
          requestedBy: actorId,
          dedupeKey: buildSendJobDedupeKey(batch.id, jobType)
        });
    jobId = job.id;
  });

  return { batchId, jobId };
}

async function enqueueSendBatch(req, id, payload = {}) {
  await verifyMfaStepUp(req, payload.codigo_mfa || payload.mfa_code);
  const queued = await enqueueNewSendJob(req, id, 'SEND_PAYMENT_BATCH');
  await processSendBatchJob(req, queued.jobId);
  return PaymentBatch.findByPk(queued.batchId);
}

async function reprocessBatch(req, id, payload = {}) {
  await verifyMfaStepUp(req, payload.codigo_mfa || payload.mfa_code);

  const batch = await PaymentBatch.findByPk(id, {
    include: [{ model: PaymentBatchItem, as: 'items' }]
  });
  if (!batch) throw createHttpError(404, 'Lote de pagamento nao encontrado.');
  const actorId = Number(req.user?.id || 0);
  assertBatchOwnedByUser(batch, actorId);
  await assertSenderDidNotApprove(batch.id, actorId);

  const batchStatus = String(batch.status || '').toUpperCase();
  const reprocessableBatchStatuses = ['FALHA_INTEGRACAO', 'REJEITADO'];
  if (!reprocessableBatchStatuses.includes(batchStatus)) {
    throw createHttpError(400, 'Apenas lotes integralmente falhos ou rejeitados podem ser reprocessados. Lotes parciais exigem novo lote com os itens rejeitados.');
  }

  if ((await countValidApprovals(batch.id)) < REQUIRED_PAYMENT_BATCH_APPROVALS) {
    throw createHttpError(400, `Lote exige ${REQUIRED_PAYMENT_BATCH_APPROVALS} aprovacao valida para reprocessamento.`);
  }
  const integrityBatch = await validatePaymentBatchIntegrity(batch.id, {
    expectedBatchStatuses: reprocessableBatchStatuses,
    phaseLabel: 'reprocessamento'
  });
  await assertApprovalHashesMatchCurrentBatch(integrityBatch, { requireMinimumApprovals: true });

  const reprocessableItemStatuses = ['FALHA_INTEGRACAO', 'REJEITADO_BANCO', 'REJEITADO'];
  const intentIds = (batch.items || [])
    .filter((item) => reprocessableItemStatuses.includes(String(item.status || '').toUpperCase()))
    .map((item) => item.payment_intent_id)
    .filter(Boolean);

  if (!intentIds.length) {
    throw createHttpError(400, 'Nao ha itens elegiveis para reprocessamento neste lote.');
  }

  const jobType = env.bbSandboxRealEnabled ? 'BB_SUBMIT_PIX_BATCH' : 'SEND_PAYMENT_BATCH';
  let jobId = null;
  await sequelize.transaction(async (transaction) => {
    const lockedBatch = await PaymentBatch.findByPk(batch.id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!lockedBatch || String(lockedBatch.status || '').toUpperCase() !== batchStatus) {
      throw createHttpError(409, 'Lote foi alterado durante o reprocessamento. Atualize a tela e tente novamente.');
    }
    assertBatchOwnedByUser(lockedBatch, actorId);
    await assertSenderRoleAllowed(req.user, { transaction });
    await assertSenderDidNotApprove(lockedBatch.id, actorId, { transaction });
    await ensureNoPendingSendJob(lockedBatch.id, { transaction });
    if (jobType === 'BB_SUBMIT_PIX_BATCH') {
      await ensureStableBbRequestId(lockedBatch, { transaction });
    }

    await lockedBatch.update({
      status: 'ENFILEIRADO',
      aprovacao_status: 'APROVADO',
      sent_at: null,
      sent_by: null,
      closed_at: null
    }, { transaction });

    await PaymentIntent.update(
      {
        status: 'ENFILEIRADO',
        enviado_em: null,
        confirmado_banco_em: null,
        updated_by: req.user?.id || null
      },
      { where: { id: { [Op.in]: intentIds } }, transaction }
    );

    await PaymentBatchItem.update(
      {
        status: 'ENFILEIRADO',
        erro_codigo: null,
        erro_mensagem: null,
        protocolo_banco: null,
        end_to_end_id: null,
        confirmado_banco_em: null
      },
      {
        where: {
          payment_batch_id: batch.id,
          payment_intent_id: { [Op.in]: intentIds }
        },
        transaction
      }
    );

    const dedupeKey = buildSendJobDedupeKey(lockedBatch.id, jobType);
    const existingJob = await PaymentJob.findOne({
      where: { dedupe_key: dedupeKey },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (existingJob) {
      await existingJob.update({
        status: 'PENDENTE',
        requested_by: actorId,
        next_run_at: new Date(),
        locked_at: null,
        locked_by: null,
        last_error: null
      }, { transaction });
      jobId = existingJob.id;
    } else {
      const newJob = await createPaymentJob(lockedBatch.id, jobType, new Date(), {
        transaction,
        requestedBy: actorId,
        dedupeKey
      });
      jobId = newJob.id;
    }
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

  if (jobType === 'BB_SUBMIT_PIX_BATCH') {
    await processBbSubmitPixBatchJob(req, jobId);
  } else {
    await processSendBatchJob(req, jobId);
  }
  return PaymentBatch.findByPk(batch.id);
}

async function processSendBatchJob(req, jobId) {
  return sequelize.transaction(async (transaction) => {
    const job = await PaymentJob.findByPk(jobId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!job) throw createHttpError(404, 'Job de pagamento nao encontrado.');
    if (String(job.status || '').toUpperCase() !== 'PENDENTE') return job;

    await job.update({
      status: 'PROCESSANDO',
      attempts: Number(job.attempts || 0) + 1,
      locked_at: new Date(),
      locked_by: `api:${job.requested_by || req.user?.id || 'system'}`
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
    const actorId = Number(job.requested_by || req.user?.id || 0);
    assertBatchOwnedByUser(batch, actorId);
    await assertSenderRoleAllowed(actorId, { transaction });
    await assertSenderDidNotApprove(batch.id, actorId, { transaction });
    const integrityBatch = await validatePaymentBatchIntegrity(batch.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
      expectedBatchStatuses: ['ENFILEIRADO'],
      expectedIntentStatuses: ['ENFILEIRADO'],
      phaseLabel: 'processamento do envio ao banco'
    });
    await assertApprovalHashesMatchCurrentBatch(integrityBatch, { transaction, requireMinimumApprovals: true });

    const intentIds = batch.items.map((item) => item.payment_intent_id);
    await batch.update({ status: 'ENVIANDO' }, { transaction });
    await PaymentIntent.update(
      { status: 'ENVIANDO', updated_by: actorId },
      { where: { id: { [Op.in]: intentIds } }, transaction }
    );
    await PaymentBatchItem.update(
      { status: 'ENVIANDO' },
      { where: { payment_batch_id: batch.id }, transaction }
    );
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
      sent_by: actorId,
      sent_at: new Date()
    }, { transaction });
    await PaymentIntent.update(
      { status: 'ENVIADO_AO_BANCO', enviado_em: new Date(), updated_by: actorId },
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

function findDeepValue(source, candidates = []) {
  const keys = new Set(candidates.map((key) => String(key).toLowerCase()));
  let found = null;

  function walk(value) {
    if (found !== null || value === null || value === undefined) return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (typeof value !== 'object') return;

    for (const [key, itemValue] of Object.entries(value)) {
      if (found !== null) return;
      if (keys.has(String(key).toLowerCase()) && itemValue !== null && itemValue !== undefined && String(itemValue).trim() !== '') {
        found = String(itemValue);
        return;
      }
      walk(itemValue);
    }
  }

  walk(source);
  return found;
}

function asNumberOrNull(value) {
  const normalized = String(value ?? '').replace(/\D/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getProviderResultBody(providerResult = {}) {
  return providerResult.data || providerResult.response_snapshot?.body || {};
}

function getBankProtocolFromBody(body, providerResult) {
  return (
    findDeepValue(body, [
      'numeroRequisicao',
      'numeroRequisicaoPagamento',
      'codigoPagamento',
      'protocolo',
      'protocoloPagamento',
      'idRequisicao',
      'requestNumber'
    ]) ||
    providerResult?.provider_transaction_id ||
    providerResult?.provider_batch_id ||
    null
  );
}

function getBankEndToEndFromPayment(payment) {
  return findDeepValue(payment, [
    'endToEndId',
    'endToEnd',
    'e2eId',
    'idFimAFim',
    'codigoEndToEnd'
  ]);
}

function getBankPaymentReference(payment) {
  const candidates = [
    'documentoDebito',
    'numeroDocumentoDebito',
    'documentoPagamento',
    'idPagamento',
    'identificadorPagamento',
    'sequencialPagamento',
    'sequencia'
  ];
  for (const key of candidates) {
    const value = findDeepValue(payment, [key]);
    const parsed = asNumberOrNull(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function getBankPaymentsFromResult(providerResult = {}) {
  const body = getProviderResultBody(providerResult);
  const payments = body?.pagamentos || body?.listaPagamentos || body?.listaTransferencias || body?.transferencias;
  return Array.isArray(payments) ? payments : [];
}

async function persistBankReturnOnItems(batch, providerResult, now, intentStatus, transaction) {
  const confirmed = intentStatus === 'AGUARDANDO_CONFIRMACAO_BAIXA';
  const rejected = ['REJEITADO_BANCO', 'CANCELADO', 'FALHA_INTEGRACAO'].includes(intentStatus);
  if (!confirmed && !rejected) return;

  const body = getProviderResultBody(providerResult);
  const batchProtocol = getBankProtocolFromBody(body, providerResult);
  const payments = getBankPaymentsFromResult(providerResult);
  const paymentsByReference = new Map();

  for (const payment of payments) {
    const reference = getBankPaymentReference(payment);
    if (reference !== null && !paymentsByReference.has(reference)) {
      paymentsByReference.set(reference, payment);
    }
  }

  for (const item of batch.items || []) {
    const payment = paymentsByReference.get(Number(item.payment_intent_id))
      || paymentsByReference.get(Number(item.sequencia))
      || null;
    const itemProtocol = payment ? getBankProtocolFromBody(payment, providerResult) : null;
    const endToEndId = payment ? getBankEndToEndFromPayment(payment) : null;

    await item.update({
      protocolo_banco: confirmed ? (itemProtocol || batchProtocol || item.protocolo_banco || null) : null,
      end_to_end_id: confirmed ? (endToEndId || item.end_to_end_id || null) : null,
      confirmado_banco_em: confirmed ? (item.confirmado_banco_em || now) : null
    }, { transaction });
  }
}

async function enqueueBbSandboxSendBatch(req, id, payload = {}) {
  await verifyMfaStepUp(req, payload.codigo_mfa || payload.mfa_code);
  const jobType = env.bbSandboxRealEnabled ? 'BB_SUBMIT_PIX_BATCH' : 'SEND_PAYMENT_BATCH';
  const queued = await enqueueNewSendJob(req, id, jobType);
  if (jobType === 'BB_SUBMIT_PIX_BATCH') {
    await processBbSubmitPixBatchJob(req, queued.jobId);
  } else {
    await processSendBatchJob(req, queued.jobId);
  }
  return PaymentBatch.findByPk(queued.batchId);
}

async function processBbSubmitPixBatchJob(req, jobId) {
  const claim = await sequelize.transaction(async (transaction) => {
    const job = await PaymentJob.findByPk(jobId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!job) throw createHttpError(404, 'Job de pagamento BB nao encontrado.');
    if (String(job.status || '').toUpperCase() !== 'PENDENTE') {
      return { skipped: true, jobId: job.id };
    }

    const batch = await validatePaymentBatchIntegrity(job.entity_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
      expectedBatchStatuses: ['ENFILEIRADO'],
      expectedIntentStatuses: ['ENFILEIRADO'],
      phaseLabel: 'processamento do envio ao Banco do Brasil'
    });
    const actorId = Number(job.requested_by || 0);
    assertBatchOwnedByUser(batch, actorId);
    await assertSenderRoleAllowed(actorId, { transaction });
    await assertSenderDidNotApprove(batch.id, actorId, { transaction });
    await assertApprovalHashesMatchCurrentBatch(batch, {
      transaction,
      requireMinimumApprovals: true
    });
    const numeroRequisicao = await ensureStableBbRequestId(batch, { transaction });
    const intentIds = (batch.items || []).map((item) => item.payment_intent_id).filter(Boolean);

    await job.update({
      status: 'PROCESSANDO',
      attempts: Number(job.attempts || 0) + 1,
      locked_at: new Date(),
      locked_by: `bb-api:${actorId}`
    }, { transaction });
    await batch.update({ status: 'ENVIANDO' }, { transaction });
    await PaymentIntent.update(
      { status: 'ENVIANDO', updated_by: actorId },
      { where: { id: { [Op.in]: intentIds } }, transaction }
    );
    await PaymentBatchItem.update(
      { status: 'ENVIANDO' },
      { where: { payment_batch_id: batch.id }, transaction }
    );

    return {
      skipped: false,
      actorId,
      batchId: batch.id,
      jobId: job.id,
      numeroRequisicao
    };
  });

  if (claim.skipped) {
    return PaymentJob.findByPk(claim.jobId);
  }

  const job = await PaymentJob.findByPk(claim.jobId);
  const batch = await getBatchWithPaymentGraph(claim.batchId);
  if (!batch) throw createHttpError(404, 'Lote de pagamento nao encontrado.');

  const startedAt = new Date();
  const attemptNumber = await PaymentTransaction.count({
    where: { payment_batch_id: batch.id }
  }) + 1;

  try {
    const providerResult = await bancoDoBrasilSandboxProvider.submitPixBatch(batch, {
      numeroRequisicao: claim.numeroRequisicao
    });
    const now = new Date();
    const batchStatus = mapProviderResultToBatchStatus(providerResult.provider_status);
    const intentStatus = mapProviderResultToIntentStatus(providerResult.provider_status);
    const intentIds = (batch.items || []).map((item) => item.payment_intent_id).filter(Boolean);

    await sequelize.transaction(async (transaction) => {
      await batch.update({
        status: batchStatus,
        sent_by: claim.actorId,
        sent_at: now
      }, { transaction });
      await PaymentIntent.update(
        {
          status: intentStatus,
          enviado_em: now,
          confirmado_banco_em: intentStatus === 'AGUARDANDO_CONFIRMACAO_BAIXA' ? now : null,
          updated_by: claim.actorId
        },
        { where: { id: { [Op.in]: intentIds } }, transaction }
      );
      await PaymentBatchItem.update(
        { status: intentStatus },
        { where: { payment_batch_id: batch.id }, transaction }
      );
      await persistBankReturnOnItems(batch, providerResult, now, intentStatus, transaction);
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
        dedupe_key: `BB_SUBMIT_PIX_BATCH_RESPONSE:${batch.provider_id}:${batch.id}`,
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
      descricao: 'Lote PIX enviado ao Banco do Brasil'
    });

    return job;
  } catch (error) {
    const normalized = bancoDoBrasilSandboxProvider.normalizeError(error);
    const normalizedStatus = Number(normalized.statusCode || 0);
    const paymentRequestMayHaveStarted = Boolean(error.details?.request_snapshot)
      || normalized.code === 'BB_HTTP_TIMEOUT'
      || (!normalizedStatus && !String(normalized.code || '').startsWith('BB_OAUTH_'));
    const uncertain = paymentRequestMayHaveStarted && (
      normalized.code === 'BB_HTTP_TIMEOUT'
      || normalizedStatus >= 500
      || !normalizedStatus
    );
    const failureStatus = uncertain ? 'ENVIO_INDETERMINADO' : 'FALHA_INTEGRACAO';
    await sequelize.transaction(async (transaction) => {
      await PaymentTransaction.create({
        payment_batch_id: batch.id,
        provider_id: batch.provider_id,
        attempt: attemptNumber,
        status: failureStatus,
        http_status: normalized.statusCode || null,
        provider_batch_id: String(batch.provider_request_id || claim.numeroRequisicao),
        correlation_id: batch.correlation_id,
        idempotency_key: batch.idempotency_key,
        request_snapshot: sanitizePayload(error.details?.request_snapshot || null),
        response_snapshot: sanitizePayload(error.details?.response_snapshot || error.details || null),
        error_code: normalized.code,
        error_message: normalized.message,
        started_at: startedAt,
        finished_at: new Date()
      }, { transaction });
      await batch.update({ status: failureStatus }, { transaction });
      await PaymentBatchItem.update(
        {
          status: failureStatus,
          erro_codigo: normalized.code,
          erro_mensagem: normalized.message,
          protocolo_banco: null,
          end_to_end_id: null,
          confirmado_banco_em: null
        },
        { where: { payment_batch_id: batch.id }, transaction }
      );
      await PaymentIntent.update(
        {
          status: failureStatus,
          updated_by: claim.actorId
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
    const safeMessage = uncertain
      ? 'O resultado do envio ao Banco do Brasil ficou indeterminado. Nao reenvie o lote; sincronize o status bancario.'
      : normalized.message;
    throw createHttpError(normalized.statusCode || 500, safeMessage);
  }
}

async function sincronizarStatusBb(req, id) {
  if (!env.bbSandboxRealEnabled) {
    throw createHttpError(400, 'Integracao real BB desabilitada. Use o fluxo mockado ou ative a integracao Banco do Brasil.');
  }

  const batch = await getBatchWithPaymentGraph(id);
  if (!batch) throw createHttpError(404, 'Lote de pagamento nao encontrado.');

  const lastTransaction = await findLastRealProviderBatchTransaction(batch.id);
  if (!lastTransaction) {
    throw createHttpError(400, 'Este lote ainda nao possui identificador BB real. Envie ou reprocesse o lote no Banco do Brasil antes de sincronizar.');
  }
  const providerBatchId = lastTransaction.provider_batch_id;
  const startedAt = new Date();
  const attemptNumber = await PaymentTransaction.count({ where: { payment_batch_id: batch.id } }) + 1;
  let providerResult;
  try {
    providerResult = await bancoDoBrasilSandboxProvider.getBatchRequestStatus(providerBatchId);
  } catch (error) {
    const normalized = bancoDoBrasilSandboxProvider.normalizeError(error);
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
    });
    throw createHttpError(normalized.statusCode || 500, normalized.message);
  }
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
        erro_mensagem: intentStatus === 'REJEITADO_BANCO' ? 'Pagamento rejeitado pelo Banco do Brasil.' : null,
        ...(intentStatus === 'REJEITADO_BANCO'
          ? { protocolo_banco: null, end_to_end_id: null, confirmado_banco_em: null }
          : {})
      },
      { where: { payment_batch_id: batch.id }, transaction }
    );
    await persistBankReturnOnItems(batch, providerResult, now, intentStatus, transaction);
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
    descricao: 'Status do lote sincronizado com o Banco do Brasil'
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

function parsePositiveInteger(value, fallback, max = 100) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

async function listPaymentEvents(query = {}) {
  const where = {};
  const limit = parsePositiveInteger(query.limit, 50, 200);

  if (query.status) where.processing_status = String(query.status).trim().toUpperCase();
  if (query.event_type) where.event_type = String(query.event_type).trim().toUpperCase();
  if (query.provider_event_id) where.provider_event_id = String(query.provider_event_id).trim();
  const paymentBatchId = parsePositiveInteger(query.payment_batch_id, null, Number.MAX_SAFE_INTEGER);
  const paymentIntentId = parsePositiveInteger(query.payment_intent_id, null, Number.MAX_SAFE_INTEGER);
  if (paymentBatchId) where.payment_batch_id = paymentBatchId;
  if (paymentIntentId) where.payment_intent_id = paymentIntentId;

  const receivedAt = {};
  if (query.data_inicio) receivedAt[Op.gte] = new Date(`${String(query.data_inicio).slice(0, 10)}T00:00:00`);
  if (query.data_fim) receivedAt[Op.lte] = new Date(`${String(query.data_fim).slice(0, 10)}T23:59:59`);
  if (Object.keys(receivedAt).length) where.received_at = receivedAt;

  const eventos = await PaymentEvent.findAll({
    where,
    include: [
      { model: PaymentProvider, as: 'provider', attributes: ['id', 'codigo', 'nome', 'ambiente'] },
      { model: PaymentBatch, as: 'batch', attributes: ['id', 'codigo', 'status', 'valor_total', 'quantidade_itens'] },
      { model: PaymentIntent, as: 'intent', attributes: ['id', 'status', 'valor', 'titulo_financeiro_id'] }
    ],
    order: [['received_at', 'DESC'], ['id', 'DESC']],
    limit
  });

  return eventos.map((evento) => ({
    id: evento.id,
    payment_batch_id: evento.payment_batch_id,
    payment_intent_id: evento.payment_intent_id,
    provider_id: evento.provider_id,
    provider: evento.provider || null,
    batch: evento.batch || null,
    intent: evento.intent || null,
    event_type: evento.event_type,
    provider_event_id: evento.provider_event_id,
    payload: sanitizePayload(evento.payload || {}),
    received_at: evento.received_at,
    processed_at: evento.processed_at,
    processing_status: evento.processing_status,
    processing_error: evento.processing_error,
    createdAt: evento.createdAt,
    updatedAt: evento.updatedAt
  }));
}

async function getBbHealth() {
  return bancoDoBrasilSandboxProvider.getHealth();
}

async function handleBbWebhook(req) {
  if (!env.bbWebhookEnabled) {
    throw createHttpError(404, 'Webhook BB desabilitado.');
  }

  if (!env.bbWebhookSecret) {
    throw createHttpError(500, 'BB_WEBHOOK_SECRET nao configurado para validar webhook BB.');
  }
  if (env.bbWebhookRequireMtls) {
    const mtlsHeader = env.bbWebhookMtlsVerifiedHeader || 'x-fluxy-client-cert-verified';
    const mtlsValue = req.get(mtlsHeader);
    if (!timingSafeEqualText(mtlsValue, env.bbWebhookMtlsVerifiedValue || 'SUCCESS')) {
      await registrarEventoSeguranca({
        req,
        tipoEvento: 'BB_WEBHOOK_MTLS_REQUIRED',
        recursoTipo: 'PAYMENT_EVENT',
        status: 'FAILURE',
        descricao: 'Webhook BB rejeitado porque o proxy nao confirmou o certificado cliente',
        metadata: { header_name: mtlsHeader }
      });
      throw createHttpError(403, 'Certificado cliente do webhook BB nao confirmado.');
    }
  }

  const headerName = env.bbWebhookSecretHeader || 'x-fluxy-bb-webhook-secret';
  const receivedSecret = req.get(headerName);
  if (!timingSafeEqualText(receivedSecret, env.bbWebhookSecret)) {
    await registrarEventoSeguranca({
      req,
      tipoEvento: 'BB_WEBHOOK_INVALID_SECRET',
      recursoTipo: 'PAYMENT_EVENT',
      status: 'FAILURE',
      descricao: 'Webhook BB rejeitado por segredo invalido',
      metadata: { header_name: headerName }
    });
    throw createHttpError(403, 'Segredo do webhook BB invalido.');
  }

  const provider = await PaymentProvider.findOne({
    where: { codigo: env.bbPaymentsProvider || 'BB' }
  });
  if (!provider) throw createHttpError(404, 'Provider BB nao encontrado.');

  const providerEventId = getBbWebhookProviderEventId(req.body || {});
  if (!providerEventId) {
    await registrarEventoSeguranca({
      req,
      tipoEvento: 'BB_WEBHOOK_MISSING_EVENT_ID',
      recursoTipo: 'PAYMENT_EVENT',
      status: 'FAILURE',
      descricao: 'Webhook BB rejeitado por ausencia de identificador do evento',
      metadata: {
        payload_keys: Object.keys(req.body || {}).slice(0, 30)
      }
    });
    throw createHttpError(400, 'Webhook BB sem identificador do evento do provedor.');
  }

  const existingEvent = await PaymentEvent.findOne({
    where: {
      provider_id: provider.id,
      event_type: 'BB_WEBHOOK_RECEIVED',
      provider_event_id: providerEventId
    },
    order: [['createdAt', 'DESC']]
  });
  if (existingEvent) {
    await registrarEventoSeguranca({
      req,
      tipoEvento: 'BB_WEBHOOK_DUPLICATE_EVENT',
      recursoTipo: 'PAYMENT_EVENT',
      recursoId: existingEvent.id,
      status: 'INFO',
      descricao: 'Webhook BB duplicado reaproveitou evento existente',
      metadata: { provider_event_id: providerEventId }
    });
    return existingEvent;
  }

  const eventDedupeKey = `BB:${provider.id}:${providerEventId}`;
  let event;
  try {
    event = await PaymentEvent.create({
      provider_id: provider.id,
      event_type: 'BB_WEBHOOK_RECEIVED',
      provider_event_id: providerEventId,
      dedupe_key: eventDedupeKey,
      payload: sanitizePayload(req.body || {}),
      received_at: new Date(),
      processing_status: 'PENDENTE'
    });
  } catch (error) {
    if (error?.name !== 'SequelizeUniqueConstraintError') throw error;
    event = await PaymentEvent.findOne({ where: { dedupe_key: eventDedupeKey } });
    if (!event) throw error;
    return event;
  }

  await registrarEventoSeguranca({
    req,
    tipoEvento: 'BB_WEBHOOK_RECEIVED',
    recursoTipo: 'PAYMENT_EVENT',
    recursoId: event.id,
    status: 'SUCCESS',
    descricao: 'Webhook BB recebido e registrado para processamento',
    metadata: { provider_event_id: providerEventId }
  });

  return event;
}

module.exports = {
  enqueueBbSandboxSendBatch,
  enqueueSendBatch,
  getBbHealth,
  handleBbWebhook,
  listBbTransactions,
  listPaymentEvents,
  processBbSubmitPixBatchJob,
  processSendBatchJob,
  reprocessBatch,
  sincronizarStatusBb
};
