const { Op } = require('sequelize');
const { PedidoCompra, SolicitacaoCompra, User } = require('../models');
const liveUpdatesBroker = require('./liveUpdatesBroker');
const { listarUsuariosElegiveisDelegacaoCompras } = require('./comprasDelegacaoService');

const DESTINATARIOS_CACHE_TTL_MS = 30 * 1000;
let destinatariosOperacionaisCache = { expiraEm: 0, ids: [] };

function positiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function carregarSnapshot({ solicitacaoCompraId, pedidoId }) {
  let pedido = null;
  if (positiveInt(pedidoId)) {
    pedido = await PedidoCompra.findByPk(pedidoId, {
      attributes: ['id', 'solicitacao_compra_id', 'obra_id', 'status', 'updatedAt']
    });
  }
  const id = positiveInt(solicitacaoCompraId) || positiveInt(pedido?.solicitacao_compra_id);
  if (!id) return null;

  const solicitacao = await SolicitacaoCompra.findByPk(id, {
    attributes: [
      'id',
      'obra_id',
      'solicitante_id',
      'comprador_responsavel_id',
      'status',
      'updatedAt'
    ]
  });
  return solicitacao ? { solicitacao, pedido } : null;
}

async function resolverDestinatarios(snapshot, extraUserIds = []) {
  const ids = new Set(
    (Array.isArray(extraUserIds) ? extraUserIds : [extraUserIds])
      .map(positiveInt)
      .filter(Boolean)
  );
  [snapshot.solicitacao.solicitante_id, snapshot.solicitacao.comprador_responsavel_id]
    .map(positiveInt)
    .filter(Boolean)
    .forEach((id) => ids.add(id));

  if (destinatariosOperacionaisCache.expiraEm <= Date.now()) {
    const [usuariosCompras, superadmins] = await Promise.all([
      listarUsuariosElegiveisDelegacaoCompras(),
      User.findAll({
        where: { perfil: 'SUPERADMIN', ativo: true, id: { [Op.ne]: null } },
        attributes: ['id']
      })
    ]);
    destinatariosOperacionaisCache = {
      expiraEm: Date.now() + DESTINATARIOS_CACHE_TTL_MS,
      ids: [...usuariosCompras, ...superadmins]
        .map((usuario) => positiveInt(usuario.id))
        .filter(Boolean)
    };
  }
  destinatariosOperacionaisCache.ids.forEach((id) => ids.add(id));
  return Array.from(ids);
}

async function publishComprasRealtimeEvent({
  action,
  solicitacaoCompraId,
  pedidoId = null,
  actor = null,
  extraUserIds = []
}) {
  const snapshot = await carregarSnapshot({ solicitacaoCompraId, pedidoId });
  if (!snapshot) return null;
  const destinatarios = await resolverDestinatarios(snapshot, extraUserIds);
  if (!destinatarios.length) return null;

  const payload = {
    event_type: 'COMPRAS',
    entity: snapshot.pedido ? 'PEDIDO_COMPRA' : 'SOLICITACAO_COMPRA',
    action: String(action || 'UPDATED').trim().toUpperCase(),
    record_id: Number(snapshot.pedido?.id || snapshot.solicitacao.id),
    solicitacao_compra_id: Number(snapshot.solicitacao.id),
    pedido_compra_id: positiveInt(snapshot.pedido?.id),
    obra_id: positiveInt(snapshot.solicitacao.obra_id),
    status: snapshot.pedido?.status || snapshot.solicitacao.status || null,
    occurred_at: new Date().toISOString(),
    actor: actor?.id ? { id: Number(actor.id), nome: actor.nome || null } : null
  };

  liveUpdatesBroker.publishToUsers(destinatarios, payload, { topics: ['compras'] });
  return payload;
}

function publishComprasRealtimeEventSafe(options) {
  return publishComprasRealtimeEvent(options).catch((error) => {
    console.error('[COMPRAS_REALTIME] Falha ao publicar atualizacao.', error);
    return null;
  });
}

module.exports = {
  publishComprasRealtimeEvent,
  publishComprasRealtimeEventSafe
};
