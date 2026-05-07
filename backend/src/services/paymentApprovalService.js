const crypto = require('crypto');
const { Op } = require('sequelize');
const { PaymentApproval, PaymentBatch, PaymentBatchItem, PaymentIntent, User, sequelize } = require('../models');
const { verifyTotpCode } = require('./mfaService');
const { registrarEventoSeguranca } = require('./securityLogService');

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function verifyMfaStepUp(req, codigo) {
  const user = await User.findByPk(req.user?.id, {
    attributes: ['id', 'mfa_totp_enabled', 'mfa_totp_secret']
  });

  if (!user?.mfa_totp_enabled || !user?.mfa_totp_secret) {
    throw createHttpError(403, 'MFA obrigatorio para esta operacao.');
  }

  if (!verifyTotpCode(user.mfa_totp_secret, codigo)) {
    throw createHttpError(403, 'Codigo MFA invalido.');
  }

  return new Date();
}

async function countValidApprovals(batchId, { transaction = null } = {}) {
  return PaymentApproval.count({
    where: {
      entity_type: 'BATCH',
      entity_id: batchId,
      acao: 'APPROVE',
      status: 'APROVADO'
    },
    transaction
  });
}

async function approveBatchWithMfa(req, id, payload = {}) {
  const mfaVerifiedAt = await verifyMfaStepUp(req, payload.codigo_mfa || payload.mfa_code);

  return sequelize.transaction(async (transaction) => {
    const batch = await PaymentBatch.findByPk(id, {
      include: [{ model: PaymentBatchItem, as: 'items' }],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!batch) throw createHttpError(404, 'Lote de pagamento nao encontrado.');
    if (String(batch.status || '').toUpperCase() !== 'PENDENTE_APROVACAO') {
      throw createHttpError(400, 'Lote nao esta pendente de aprovacao.');
    }
    if (Number(batch.created_by) === Number(req.user?.id)) {
      throw createHttpError(403, 'Criador do lote nao pode aprovar o proprio lote nesta versao.');
    }

    await PaymentApproval.create({
      entity_type: 'BATCH',
      entity_id: batch.id,
      nivel: 1,
      acao: 'APPROVE',
      status: 'APROVADO',
      aprovado_por: req.user.id,
      aprovado_em: new Date(),
      justificativa: payload.justificativa || null,
      mfa_verified_at: mfaVerifiedAt,
      snapshot_hash: crypto
        .createHash('sha256')
        .update(JSON.stringify({ batch_id: batch.id, valor_total: batch.valor_total, quantidade_itens: batch.quantidade_itens }))
        .digest('hex')
    }, { transaction });

    const approvals = await countValidApprovals(batch.id, { transaction });
    if (approvals >= 2) {
      const intentIds = batch.items.map((item) => item.payment_intent_id);
      await batch.update({
        status: 'APROVADO',
        aprovacao_status: 'APROVADO'
      }, { transaction });
      await PaymentIntent.update(
        { status: 'APROVADO', aprovado_em: new Date(), aprovado_por: req.user.id, updated_by: req.user.id },
        { where: { id: { [Op.in]: intentIds } }, transaction }
      );
      await PaymentBatchItem.update(
        { status: 'APROVADO' },
        { where: { payment_batch_id: batch.id }, transaction }
      );
    }

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'PAYMENT_BATCH_APPROVED',
      recursoTipo: 'PAYMENT_BATCH',
      recursoId: batch.id,
      status: 'SUCCESS',
      descricao: 'Lote de pagamento aprovado',
      metadata: { approvals }
    });

    return batch;
  });
}

async function rejectBatch(req, id, payload = {}) {
  const batch = await PaymentBatch.findByPk(id, {
    include: [{ model: PaymentBatchItem, as: 'items' }]
  });
  if (!batch) throw createHttpError(404, 'Lote de pagamento nao encontrado.');
  if (!['PENDENTE_APROVACAO', 'APROVADO'].includes(String(batch.status || '').toUpperCase())) {
    throw createHttpError(400, 'Lote nao pode ser rejeitado neste status.');
  }

  await sequelize.transaction(async (transaction) => {
    await PaymentApproval.create({
      entity_type: 'BATCH',
      entity_id: batch.id,
      nivel: 1,
      acao: 'REJECT',
      status: 'REJEITADO',
      aprovado_por: req.user.id,
      aprovado_em: new Date(),
      justificativa: payload.justificativa || null
    }, { transaction });

    const intentIds = batch.items.map((item) => item.payment_intent_id);
    await batch.update({ status: 'REJEITADO', aprovacao_status: 'REJEITADO' }, { transaction });
    await PaymentIntent.update(
      { status: 'CANCELADO', cancelado_em: new Date(), motivo_cancelamento: payload.justificativa || 'Lote rejeitado', updated_by: req.user.id },
      { where: { id: { [Op.in]: intentIds } }, transaction }
    );
    await PaymentBatchItem.update(
      { status: 'REJEITADO' },
      { where: { payment_batch_id: batch.id }, transaction }
    );
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'PAYMENT_BATCH_REJECTED',
    recursoTipo: 'PAYMENT_BATCH',
    recursoId: batch.id,
    status: 'SUCCESS',
    descricao: 'Lote de pagamento rejeitado'
  });

  return batch;
}

module.exports = {
  approveBatchWithMfa,
  countValidApprovals,
  rejectBatch,
  verifyMfaStepUp
};
