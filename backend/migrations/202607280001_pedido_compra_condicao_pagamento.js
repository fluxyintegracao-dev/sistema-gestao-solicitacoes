'use strict';

const { columnExists, tableExists } = require('../src/database/schemaUtils');

function extractCondicaoPagamento(metadados) {
  if (!metadados) return null;

  try {
    const parsed = typeof metadados === 'string' ? JSON.parse(metadados) : metadados;
    const value = String(parsed?.condicao_pagamento ?? '').trim();
    return value || null;
  } catch {
    return null;
  }
}

async function backfillCondicaoPagamento(sequelize) {
  const hasLogs = await tableExists(sequelize, 'solicitacao_compra_logs');
  const hasCotacoes = await tableExists(sequelize, 'solicitacao_compra_fornecedores');
  if (!hasLogs && !hasCotacoes) return;

  let ultimoId = 0;
  while (true) {
    const [pedidos] = await sequelize.query(
      `SELECT id, solicitacao_compra_id, fornecedor_compra_id, createdAt
         FROM pedido_compras
        WHERE id > ?
          AND (condicao_pagamento IS NULL OR TRIM(condicao_pagamento) = '')
        ORDER BY id ASC
        LIMIT 250`,
      { replacements: [ultimoId] }
    );
    if (!pedidos?.length) break;

    for (const pedido of pedidos) {
      ultimoId = Number(pedido.id);
      let condicaoPagamento = null;

      if (hasLogs) {
        const [logs] = await sequelize.query(
          `SELECT metadados
             FROM solicitacao_compra_logs
            WHERE solicitacao_compra_id = ?
              AND fornecedor_compra_id = ?
              AND tipo_acao IN ('RESPOSTA_FORNECEDOR', 'RESPOSTA_INTERNA_COMPRAS')
              AND createdAt <= ?
            ORDER BY createdAt DESC, id DESC
            LIMIT 1`,
          {
            replacements: [
              pedido.solicitacao_compra_id,
              pedido.fornecedor_compra_id,
              pedido.createdAt
            ]
          }
        );
        condicaoPagamento = extractCondicaoPagamento(logs?.[0]?.metadados);
      }

      if (!condicaoPagamento && hasCotacoes) {
        const [cotacoes] = await sequelize.query(
          `SELECT condicao_pagamento
             FROM solicitacao_compra_fornecedores
            WHERE solicitacao_compra_id = ?
              AND fornecedor_compra_id = ?
              AND condicao_pagamento IS NOT NULL
              AND TRIM(condicao_pagamento) <> ''
            ORDER BY id DESC
            LIMIT 1`,
          {
            replacements: [
              pedido.solicitacao_compra_id,
              pedido.fornecedor_compra_id
            ]
          }
        );
        const fallback = String(cotacoes?.[0]?.condicao_pagamento ?? '').trim();
        condicaoPagamento = fallback || null;
      }

      if (condicaoPagamento) {
        await sequelize.query(
          `UPDATE pedido_compras
              SET condicao_pagamento = ?
            WHERE id = ?
              AND (condicao_pagamento IS NULL OR TRIM(condicao_pagamento) = '')`,
          { replacements: [condicaoPagamento, pedido.id] }
        );
      }
    }
  }
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    if (!(await columnExists(sequelize, 'pedido_compras', 'condicao_pagamento'))) {
      await queryInterface.addColumn('pedido_compras', 'condicao_pagamento', {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Snapshot da condicao de pagamento vigente quando o pedido foi gerado'
      });
    }

    await backfillCondicaoPagamento(sequelize);
  },

  async down() {
    // Migration aditiva: rollback destrutivo somente de forma assistida.
  }
};
