module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    await queryInterface.changeColumn('prioridade_lote_itens', 'solicitacao_id', {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await sequelize.query(`
      DROP INDEX prioridade_lote_itens_lote_solicitacao_unique
        ON prioridade_lote_itens
    `).catch((error) => {
      const message = String(error?.message || '');
      if (!/check that column\/key exists|Can't DROP|doesn't exist/i.test(message)) throw error;
    });

    await queryInterface.addColumn('prioridade_lote_itens', 'titulo_financeiro_id', {
      type: DataTypes.INTEGER,
      allowNull: true
    });

    await sequelize.query(`
      UPDATE prioridade_lote_itens pli
      JOIN (
        SELECT
          solicitacao_id,
          MIN(id) AS titulo_id,
          COUNT(*) AS total_titulos
        FROM titulos_financeiros
        WHERE solicitacao_id IS NOT NULL
          AND status IN ('ABERTO', 'PARCIAL')
          AND tipo = 'PAGAR'
        GROUP BY solicitacao_id
      ) mapa ON mapa.solicitacao_id = pli.solicitacao_id AND mapa.total_titulos = 1
      JOIN titulos_financeiros tf ON tf.id = mapa.titulo_id
      SET pli.titulo_financeiro_id = tf.id,
          pli.valor_considerado = COALESCE(tf.valor_saldo, tf.valor_original, pli.valor_considerado)
      WHERE pli.titulo_financeiro_id IS NULL
    `);

    await sequelize.query(`
      CREATE INDEX idx_prioridade_lote_itens_titulo
        ON prioridade_lote_itens (titulo_financeiro_id)
    `).catch((error) => {
      if (!/Duplicate key name/i.test(String(error?.message || ''))) throw error;
    });

    await sequelize.query(`
      CREATE UNIQUE INDEX prioridade_lote_itens_lote_titulo_unique
        ON prioridade_lote_itens (lote_id, titulo_financeiro_id)
    `).catch((error) => {
      if (!/Duplicate key name/i.test(String(error?.message || ''))) throw error;
    });
  }
};
