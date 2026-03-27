const { NotificacaoDestinatario, Notificacao } = require('../models');
const runtimeCache = require('../utils/runtimeCache');

const CACHE_TTL_MS = 15 * 1000;

function getNotificacaoCacheKey(usuarioId, naoLidas, limit) {
  return `notificacoes:${usuarioId}:${naoLidas}:${limit}`;
}

function limparCacheNotificacoes(usuarioId) {
  runtimeCache.clearPrefix(`notificacoes:${usuarioId}:`);
}

module.exports = {
  async index(req, res) {
    try {
      const { nao_lidas, limit } = req.query;
      const where = { usuario_id: req.user.id };
      const limitNormalizado = Number(limit) > 0 ? Number(limit) : 50;
      const naoLidasNormalizado =
        String(nao_lidas) === '1' || String(nao_lidas) === 'true';

      const cacheKey = getNotificacaoCacheKey(
        req.user.id,
        naoLidasNormalizado ? 'nao-lidas' : 'todas',
        limitNormalizado
      );
      const cached = runtimeCache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      if (String(nao_lidas) === '1' || String(nao_lidas) === 'true') {
        where.lida_em = null;
      }

      const totalNaoLidas = await NotificacaoDestinatario.count({
        where: { usuario_id: req.user.id, lida_em: null }
      });

      const itens = await NotificacaoDestinatario.findAll({
        where,
        include: [
          {
            model: Notificacao,
            as: 'notificacao'
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: limitNormalizado
      });

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

      const response = {
        total_nao_lidas: totalNaoLidas,
        itens: resultado
      };

      runtimeCache.set(cacheKey, response, CACHE_TTL_MS);

      return res.json(response);
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

      limparCacheNotificacoes(req.user.id);

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

      limparCacheNotificacoes(req.user.id);

      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao marcar todas como lidas' });
    }
  }
};
