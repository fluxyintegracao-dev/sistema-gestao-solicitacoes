const { Op } = require('sequelize');
const { ConciliacaoBancaria } = require('../models');

function normalizeIds(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [values])
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
  )];
}

/**
 * Reabre somente conciliacoes de titulos vinculadas aos movimentos estornados.
 * A operacao deve participar da mesma transacao do estorno para impedir que a
 * baixa fique estornada enquanto o extrato permanece conciliado.
 */
async function reabrirConciliacoesPorMovimentos({ movimentoIds, usuarioId = null, transaction }) {
  if (!transaction) {
    throw new Error('A transacao e obrigatoria para reabrir conciliacoes estornadas.');
  }

  const ids = normalizeIds(movimentoIds);
  if (!ids.length) return [];

  const conciliacoes = await ConciliacaoBancaria.findAll({
    where: {
      movimento_financeiro_id: { [Op.in]: ids },
      titulo_financeiro_id: { [Op.ne]: null },
      status: 'CONCILIADO',
      deleted_at: null
    },
    order: [['id', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE
  });

  const reabertas = [];
  for (const conciliacao of conciliacoes) {
    reabertas.push({
      conciliacao_id: conciliacao.id,
      conta_bancaria_id: conciliacao.conta_bancaria_id,
      empresa_id: conciliacao.empresa_id,
      titulo_financeiro_id: conciliacao.titulo_financeiro_id,
      movimento_financeiro_id: conciliacao.movimento_financeiro_id
    });

    await conciliacao.update({
      status: 'PENDENTE',
      titulo_financeiro_id: null,
      movimento_financeiro_id: null,
      confirmado_por: null,
      confirmado_em: null,
      deleted_by: null,
      deleted_reason: null
    }, { transaction });
  }

  return reabertas.map((item) => ({ ...item, reaberto_por: usuarioId || null }));
}

module.exports = {
  reabrirConciliacoesPorMovimentos
};
