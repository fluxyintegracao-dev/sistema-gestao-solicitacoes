const { NotificacaoDestinatario, Notificacao } = require('../models');
const { Op } = require('sequelize');
const DEFAULT_NOTIFICACOES_LIMIT = 20;
const MAX_NOTIFICACOES_LIMIT = 50;

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizarTiposFiltro(valor) {
  const lista = Array.isArray(valor) ? valor : [valor];
  return Array.from(new Set(
    lista
      .flatMap(item => String(item || '').split(','))
      .map(item => item.trim().toUpperCase())
      .filter(Boolean)
  ));
}

module.exports = {
  async index(req, res) {
    try {
      const { nao_lidas, limit, page, tipos } = req.query;
      const where = { usuario_id: req.user.id };
      const limite = Math.min(
        parsePositiveInt(limit, DEFAULT_NOTIFICACOES_LIMIT),
        MAX_NOTIFICACOES_LIMIT
      );
      const pagina = parsePositiveInt(page, 1);
      const offset = (pagina - 1) * limite;
      const tiposFiltro = normalizarTiposFiltro(tipos);
      const includeNotificacao = {
        model: Notificacao,
        as: 'notificacao',
        ...(tiposFiltro.length > 0 ? { where: { tipo: { [Op.in]: tiposFiltro } } } : {})
      };

      if (String(nao_lidas) === '1' || String(nao_lidas) === 'true') {
        where.lida_em = null;
      }

      const [totalNaoLidas, total, itens] = await Promise.all([
        NotificacaoDestinatario.count({
          where: { usuario_id: req.user.id, lida_em: null },
          include: [includeNotificacao]
        }),
        NotificacaoDestinatario.count({
          where,
          include: [includeNotificacao]
        }),
        NotificacaoDestinatario.findAll({
          where,
          include: [includeNotificacao],
          order: [
            [{ model: Notificacao, as: 'notificacao' }, 'createdAt', 'DESC'],
            ['id', 'DESC']
          ],
          limit: limite,
          offset
        })
      ]);

      const resultado = itens.map(item => ({
        destinatario_id: item.id,
        lida_em: item.lida_em,
        createdAt: item.notificacao?.createdAt,
        tipo: item.notificacao?.tipo,
        mensagem: item.notificacao?.mensagem,
        solicitacao_id: item.notificacao?.solicitacao_id,
        metadata: item.notificacao?.metadata
          ? JSON.parse(item.notificacao.metadata)
          : null
      }));

      return res.json({
        total_nao_lidas: totalNaoLidas,
        itens: resultado,
        meta: {
          page: pagina,
          limit: limite,
          total,
          total_pages: total > 0 ? Math.ceil(total / limite) : 0,
          has_more: offset + resultado.length < total
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar notificacoes' });
    }
  },

  async marcarLida(req, res) {
    try {
      const { id } = req.params;
      const destinatario = await NotificacaoDestinatario.findOne({
        where: {
          id,
          usuario_id: req.user.id
        }
      });

      if (!destinatario) {
        return res.status(404).json({ error: 'Notificacao nao encontrada' });
      }

      if (!destinatario.lida_em) {
        await destinatario.update({ lida_em: new Date() });
      }

      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao marcar como lida' });
    }
  },

  async marcarTodasLidas(req, res) {
    try {
      await NotificacaoDestinatario.update(
        { lida_em: new Date() },
        {
          where: {
            usuario_id: req.user.id,
            lida_em: null
          }
        }
      );

      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao marcar todas como lidas' });
    }
  }
};
