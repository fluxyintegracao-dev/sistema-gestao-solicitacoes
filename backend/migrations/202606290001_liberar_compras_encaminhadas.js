const { columnExists, tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (
      !(await tableExists(sequelize, 'solicitacao_compras')) ||
      !(await tableExists(sequelize, 'solicitacoes')) ||
      !(await columnExists(sequelize, 'solicitacao_compras', 'liberado_para_compra_em'))
    ) {
      return;
    }

    await sequelize.query(`
      UPDATE solicitacao_compras sc
      INNER JOIN solicitacoes s
        ON s.id = sc.solicitacao_principal_id
      SET sc.status = 'LIBERADO_PARA_COMPRA',
          sc.liberado_para_compra_em = COALESCE(sc.liberado_para_compra_em, NOW()),
          sc.updatedAt = NOW()
      WHERE sc.origem = 'NORMAL'
        AND sc.status = 'ENVIADO'
        AND UPPER(TRIM(COALESCE(s.area_responsavel, ''))) = 'COMPRAS'
        AND COALESCE(s.cancelada, 0) = 0
    `);
  },

  async down() {}
};
