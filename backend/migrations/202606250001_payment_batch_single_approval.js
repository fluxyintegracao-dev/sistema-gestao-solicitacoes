module.exports = {
  async up({ sequelize }) {
    await sequelize.query('DROP TEMPORARY TABLE IF EXISTS tmp_payment_batches_single_approval');

    await sequelize.query(`
      CREATE TEMPORARY TABLE tmp_payment_batches_single_approval AS
      SELECT
        b.id AS payment_batch_id,
        MIN(a.aprovado_em) AS aprovado_em,
        MIN(a.aprovado_por) AS aprovado_por
      FROM payment_batches b
      INNER JOIN payment_approvals a
        ON a.entity_type = 'BATCH'
       AND a.entity_id = b.id
       AND a.acao = 'APPROVE'
       AND a.status = 'APROVADO'
       AND a.snapshot_hash IS NOT NULL
      WHERE b.status = 'PENDENTE_APROVACAO'
      GROUP BY b.id
    `);

    await sequelize.query(`
      UPDATE payment_batches b
      INNER JOIN tmp_payment_batches_single_approval tmp
        ON tmp.payment_batch_id = b.id
      SET b.status = 'APROVADO',
          b.aprovacao_status = 'APROVADO',
          b.updatedAt = NOW()
      WHERE b.status = 'PENDENTE_APROVACAO'
    `);

    await sequelize.query(`
      UPDATE payment_batch_items i
      INNER JOIN tmp_payment_batches_single_approval tmp
        ON tmp.payment_batch_id = i.payment_batch_id
      SET i.status = 'APROVADO',
          i.updatedAt = NOW()
      WHERE i.status = 'PENDENTE_APROVACAO'
    `);

    await sequelize.query(`
      UPDATE payment_intents pi
      INNER JOIN payment_batch_items i
        ON i.payment_intent_id = pi.id
      INNER JOIN tmp_payment_batches_single_approval tmp
        ON tmp.payment_batch_id = i.payment_batch_id
      SET pi.status = 'APROVADO',
          pi.aprovado_em = COALESCE(pi.aprovado_em, tmp.aprovado_em, NOW()),
          pi.aprovado_por = COALESCE(pi.aprovado_por, tmp.aprovado_por),
          pi.updatedAt = NOW()
      WHERE pi.status = 'PENDENTE_APROVACAO'
    `);

    await sequelize.query('DROP TEMPORARY TABLE IF EXISTS tmp_payment_batches_single_approval');
  }
};
