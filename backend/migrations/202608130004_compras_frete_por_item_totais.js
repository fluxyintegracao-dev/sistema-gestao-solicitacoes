'use strict';

async function addColumnIfMissing(queryInterface, tableName, columnName, definition) {
  const description = await queryInterface.describeTable(tableName).catch(() => ({}));
  if (!description[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
}

async function removeColumnIfExists(queryInterface, tableName, columnName) {
  const description = await queryInterface.describeTable(tableName).catch(() => ({}));
  if (description[columnName]) {
    await queryInterface.removeColumn(tableName, columnName);
  }
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

module.exports = {
  async up({ DataTypes, queryInterface, sequelize }) {
    const money = { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 };

    await addColumnIfMissing(queryInterface, 'solicitacao_compra_fornecedores', 'frete_modo', {
      type: DataTypes.STRING(20), allowNull: false, defaultValue: 'GLOBAL'
    });
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_resposta_itens', 'frete_valor', money);
    await addColumnIfMissing(queryInterface, 'solicitacao_compra_alocacoes', 'frete_rateado', money);
    await addColumnIfMissing(queryInterface, 'pedido_compra_itens', 'frete_rateado', money);
    await addColumnIfMissing(queryInterface, 'pedido_compras', 'frete_modo_cotacao', {
      type: DataTypes.STRING(20), allowNull: false, defaultValue: 'GLOBAL'
    });
    await addColumnIfMissing(queryInterface, 'pedido_compras', 'frete_total', money);
    await addColumnIfMissing(queryInterface, 'pedido_compras', 'valor_total_fornecedor', money);

    const indexes = await queryInterface.showIndex('pedido_compra_fretes').catch(() => []);
    const legacyIndex = indexes.find((index) => index.name === 'uniq_pedido_compra_frete_origem_cotacao');
    if (legacyIndex) {
      await queryInterface.removeIndex('pedido_compra_fretes', legacyIndex.name);
    }
    const refreshedIndexes = await queryInterface.showIndex('pedido_compra_fretes').catch(() => []);
    if (!refreshedIndexes.some((index) => index.name === 'uniq_pedido_frete_origem_cotacao_por_pedido')) {
      await queryInterface.addIndex(
        'pedido_compra_fretes',
        ['pedido_compra_id', 'origem_cotacao_fornecedor_id'],
        { name: 'uniq_pedido_frete_origem_cotacao_por_pedido', unique: true }
      );
    }

    const [pedidosLegados] = await sequelize.query(`
      SELECT pc.id, pc.solicitacao_compra_id, sc.solicitacao_principal_id,
             pc.obra_id, pc.criado_por, pc.frete_valor_cotacao
        FROM pedido_compras pc
        INNER JOIN solicitacao_compras sc ON sc.id = pc.solicitacao_compra_id
        LEFT JOIN pedido_compra_fretes pcf
          ON pcf.pedido_compra_id = pc.id
         AND (pcf.status_financeiro IS NULL OR pcf.status_financeiro <> 'CANCELADO')
       WHERE pc.frete_tipo_cotacao = 'EMBUTIDO'
         AND pc.frete_valor_cotacao > 0
         AND pcf.id IS NULL
    `);

    for (const pedido of pedidosLegados) {
      const valorFrete = roundMoney(pedido.frete_valor_cotacao);
      const idempotencyKey = `MIGRACAO:FRETE:EMBUTIDO:${pedido.id}`;
      await queryInterface.bulkInsert('pedido_compra_fretes', [{
        pedido_compra_id: pedido.id,
        solicitacao_compra_id: pedido.solicitacao_compra_id,
        solicitacao_id: pedido.solicitacao_principal_id || null,
        obra_id: pedido.obra_id || null,
        tipo: 'EMBUTIDO',
        momento: 'FECHAMENTO',
        criterio_rateio: 'VALOR_ITENS',
        status_financeiro: 'NAO_GERA_TITULO',
        valor_total: valorFrete,
        observacoes: 'Frete embutido legado convertido para composicao do custo total',
        idempotency_key: idempotencyKey,
        registrado_por: pedido.criado_por || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
      const [fretesCriados] = await sequelize.query(`
        SELECT id
          FROM pedido_compra_fretes
         WHERE pedido_compra_id = :pedidoId
           AND idempotency_key = :idempotencyKey
         ORDER BY id DESC
         LIMIT 1
      `, { replacements: { pedidoId: pedido.id, idempotencyKey } });
      const freteId = fretesCriados[0]?.id;
      if (!freteId) {
        throw new Error(`Nao foi possivel localizar o frete legado criado para o pedido ${pedido.id}.`);
      }

      const [itens] = await sequelize.query(`
        SELECT id, solicitacao_compra_item_id, solicitacao_compra_item_manual_id,
               valor_total
          FROM pedido_compra_itens
         WHERE pedido_compra_id = :pedidoId AND removido = 0
         ORDER BY id
      `, { replacements: { pedidoId: pedido.id } });
      const totalBase = roundMoney(itens.reduce((sum, item) => sum + Number(item.valor_total || 0), 0));
      let acumulado = 0;
      const rateios = itens.map((item, index) => {
        const percentual = totalBase > 0 ? Number(item.valor_total || 0) / totalBase : 1 / itens.length;
        const valorRateado = index === itens.length - 1
          ? roundMoney(valorFrete - acumulado)
          : roundMoney(valorFrete * percentual);
        acumulado = roundMoney(acumulado + valorRateado);
        return {
          frete_id: freteId,
          pedido_compra_id: pedido.id,
          pedido_compra_item_id: item.id,
          solicitacao_compra_item_id: item.solicitacao_compra_item_id || null,
          solicitacao_compra_item_manual_id: item.solicitacao_compra_item_manual_id || null,
          obra_id: pedido.obra_id || null,
          valor_item_base: roundMoney(item.valor_total),
          percentual_rateio: Number((percentual * 100).toFixed(6)),
          valor_rateado: valorRateado,
          manual: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });
      if (rateios.length) {
        await queryInterface.bulkInsert('pedido_compra_frete_rateios', rateios);
      }
    }

    await sequelize.query(`
      UPDATE pedido_compra_itens pci
      LEFT JOIN (
        SELECT pedido_compra_item_id, SUM(valor_rateado) AS frete_rateado
          FROM pedido_compra_frete_rateios pfr
          INNER JOIN pedido_compra_fretes pf ON pf.id = pfr.frete_id
         WHERE pf.status_financeiro IS NULL OR pf.status_financeiro <> 'CANCELADO'
         GROUP BY pedido_compra_item_id
      ) rateios ON rateios.pedido_compra_item_id = pci.id
         SET pci.frete_rateado = COALESCE(rateios.frete_rateado, 0)
    `);
    await sequelize.query(`
      UPDATE pedido_compras pc
      LEFT JOIN (
        SELECT pedido_compra_id,
               SUM(valor_total) AS frete_total,
               SUM(CASE WHEN tipo = 'EMBUTIDO' THEN valor_total ELSE 0 END) AS frete_fornecedor
          FROM pedido_compra_fretes
         WHERE status_financeiro IS NULL OR status_financeiro <> 'CANCELADO'
         GROUP BY pedido_compra_id
      ) fretes ON fretes.pedido_compra_id = pc.id
         SET pc.frete_total = COALESCE(fretes.frete_total, 0),
             pc.valor_total_fornecedor = GREATEST(0, pc.valor_total + COALESCE(fretes.frete_fornecedor, 0)),
             pc.valor_total = GREATEST(0, pc.valor_total + COALESCE(fretes.frete_total, 0))
    `);
    await sequelize.query(`
      UPDATE solicitacao_compras sc
      LEFT JOIN (
        SELECT solicitacao_compra_id,
               SUM(valor_total) AS valor_aquisicao
          FROM pedido_compras
         WHERE status IS NULL OR status <> 'CANCELADO'
         GROUP BY solicitacao_compra_id
      ) pedidos ON pedidos.solicitacao_compra_id = sc.id
         SET sc.valor_fechado = COALESCE(pedidos.valor_aquisicao, 0)
    `);
    await sequelize.query(`
      UPDATE solicitacoes s
      INNER JOIN solicitacao_compras sc ON sc.solicitacao_principal_id = s.id
      LEFT JOIN (
        SELECT solicitacao_compra_id,
               SUM(valor_total_fornecedor) AS valor_fornecedor
          FROM pedido_compras
         WHERE status IS NULL OR status <> 'CANCELADO'
         GROUP BY solicitacao_compra_id
      ) pedidos ON pedidos.solicitacao_compra_id = sc.id
         SET s.valor = COALESCE(pedidos.valor_fornecedor, 0)
    `);
  },

  async down({ queryInterface }) {
    const indexes = await queryInterface.showIndex('pedido_compra_fretes').catch(() => []);
    if (indexes.some((index) => index.name === 'uniq_pedido_frete_origem_cotacao_por_pedido')) {
      await queryInterface.removeIndex('pedido_compra_fretes', 'uniq_pedido_frete_origem_cotacao_por_pedido');
    }
    for (const [tableName, columnName] of [
      ['pedido_compras', 'valor_total_fornecedor'],
      ['pedido_compras', 'frete_total'],
      ['pedido_compras', 'frete_modo_cotacao'],
      ['pedido_compra_itens', 'frete_rateado'],
      ['solicitacao_compra_alocacoes', 'frete_rateado'],
      ['solicitacao_compra_resposta_itens', 'frete_valor'],
      ['solicitacao_compra_fornecedores', 'frete_modo']
    ]) {
      await removeColumnIfExists(queryInterface, tableName, columnName);
    }
  }
};
