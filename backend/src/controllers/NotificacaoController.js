const { NotificacaoDestinatario, Notificacao } = require('../models');

const NOTIFICACOES_CACHE_TTL_MS = 120000;
const notificacoesCache = new Map();

function erroBancoIndisponivel(error) {
  const nome = String(error?.name || '');
  const codigo = String(error?.original?.code || error?.parent?.code || error?.code || '');
  const mensagem = String(error?.message || '');

  return (
    nome.includes('SequelizeConnection') ||
    nome.includes('ConnectionAcquireTimeout') ||
    codigo === 'ETIMEDOUT' ||
    mensagem.includes('Operation timeout')
  );
}

function montarCacheKey({ usuarioId, naoLidas, limit }) {
  return `${usuarioId}:${naoLidas ? '1' : '0'}:${limit}`;
}

function lerCache(key) {
  const item = notificacoesCache.get(key);
  if (!item) return null;

  if (item.expiraEm <= Date.now()) {
    notificacoesCache.delete(key);
    return null;
  }

  return item.valor;
}

function salvarCache(key, valor) {
  notificacoesCache.set(key, {
    valor,
    expiraEm: Date.now() + NOTIFICACOES_CACHE_TTL_MS
  });
}

function invalidarCacheUsuario(usuarioId) {
  const prefixo = `${usuarioId}:`;
  for (const key of notificacoesCache.keys()) {
    if (key.startsWith(prefixo)) {
      notificacoesCache.delete(key);
    }
  }
}

function parseMetadata(metadata) {
  if (!metadata) return null;

  try {
    return JSON.parse(metadata);
  } catch (_error) {
    return null;
  }
}

module.exports = {
  async index(req, res) {
    try {
      const { nao_lidas, limit } = req.query;
      const usuarioId = Number(req.user.id);
      const somenteNaoLidas = String(nao_lidas) === '1' || String(nao_lidas) === 'true';
      const limite = Number(limit) > 0 ? Math.min(Number(limit), 100) : 50;
      const cacheKey = montarCacheKey({
        usuarioId,
        naoLidas: somenteNaoLidas,
        limit: limite
      });
      const resultadoEmCache = lerCache(cacheKey);

      if (resultadoEmCache) {
        return res.json(resultadoEmCache);
      }

      const where = { usuario_id: usuarioId };
      if (somenteNaoLidas) {
        where.lida_em = null;
      }

      const totalNaoLidas = await NotificacaoDestinatario.count({
        where: { usuario_id: usuarioId, lida_em: null }
      });

      const itens = await NotificacaoDestinatario.findAll({
        where,
        attributes: ['id', 'lida_em', 'createdAt'],
        include: [
          {
            model: Notificacao,
            as: 'notificacao',
            attributes: ['createdAt', 'tipo', 'mensagem', 'solicitacao_id', 'metadata']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: limite
      });

      const resultado = itens.map(item => ({
        destinatario_id: item.id,
        lida_em: item.lida_em,
        createdAt: item.notificacao?.createdAt,
        tipo: item.notificacao?.tipo,
        mensagem: item.notificacao?.mensagem,
        solicitacao_id: item.notificacao?.solicitacao_id,
        metadata: parseMetadata(item.notificacao?.metadata)
      }));

      const payload = {
        total_nao_lidas: totalNaoLidas,
        itens: resultado
      };

      salvarCache(cacheKey, payload);
      return res.json(payload);
    } catch (error) {
      console.error(error);
      if (erroBancoIndisponivel(error)) {
        return res.json({
          total_nao_lidas: 0,
          itens: []
        });
      }
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

      invalidarCacheUsuario(Number(req.user.id));
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

      invalidarCacheUsuario(Number(req.user.id));
      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao marcar todas como lidas' });
    }
  }
};
