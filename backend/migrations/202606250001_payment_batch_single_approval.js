module.exports = {
  async up({ sequelize }) {
    await sequelize.query(`
      UPDATE payment_batches b
      INNER JOIN (
        SELECT
          batch_candidates.id AS payment_batch_id,
          MIN(a.aprovado_em) AS aprovado_em,
          MIN(a.aprovado_por) AS aprovado_por
        FROM payment_batches batch_candidates
        INNER JOIN payment_approvals a
          ON a.entity_type = 'BATCH'
         AND a.entity_id = batch_candidates.id
         AND a.acao = 'APPROVE'
         AND a.status = 'APROVADO'
         AND a.snapshot_hash IS NOT NULL
        WHERE batch_candidates.status = 'PENDENTE_APROVACAO'
        GROUP BY batch_candidates.id
      ) tmp
        ON tmp.payment_batch_id = b.id
      SET b.status = 'APROVADO',
          b.aprovacao_status = 'APROVADO',
          b.updatedAt = NOW()
      WHERE b.status = 'PENDENTE_APROVACAO'
    `);

    await sequelize.query(`
      UPDATE payment_batch_items i
      INNER JOIN (
        SELECT batch_candidates.id AS payment_batch_id
        FROM payment_batches batch_candidates
        INNER JOIN payment_approvals a
          ON a.entity_type = 'BATCH'
         AND a.entity_id = batch_candidates.id
         AND a.acao = 'APPROVE'
         AND a.status = 'APROVADO'
         AND a.snapshot_hash IS NOT NULL
        WHERE batch_candidates.status = 'APROVADO'
        GROUP BY batch_candidates.id
      ) tmp
        ON tmp.payment_batch_id = i.payment_batch_id
      SET i.status = 'APROVADO',
          i.updatedAt = NOW()
      WHERE i.status = 'PENDENTE_APROVACAO'
    `);

    await sequelize.query(`
      UPDATE payment_intents pi
      INNER JOIN payment_batch_items i
        ON i.payment_intent_id = pi.id
      INNER JOIN (
        SELECT
          batch_candidates.id AS payment_batch_id,
          MIN(a.aprovado_em) AS aprovado_em,
          MIN(a.aprovado_por) AS aprovado_por
        FROM payment_batches batch_candidates
        INNER JOIN payment_approvals a
          ON a.entity_type = 'BATCH'
         AND a.entity_id = batch_candidates.id
         AND a.acao = 'APPROVE'
         AND a.status = 'APROVADO'
         AND a.snapshot_hash IS NOT NULL
        WHERE batch_candidates.status = 'APROVADO'
        GROUP BY batch_candidates.id
      ) tmp
        ON tmp.payment_batch_id = i.payment_batch_id
      SET pi.status = 'APROVADO',
          pi.aprovado_em = COALESCE(pi.aprovado_em, tmp.aprovado_em, NOW()),
          pi.aprovado_por = COALESCE(pi.aprovado_por, tmp.aprovado_por),
          pi.updatedAt = NOW()
      WHERE pi.status = 'PENDENTE_APROVACAO'
    `);
  }
};
