const {
  decidirPrestacao,
  listarAdmin,
  listarMeusCartoes,
  obterContextoCartao,
  obterContextoSolicitacao,
  salvarCartao,
  salvarPrestacao
} = require('../services/recargaCartaoService');
const { assertPodeInteragirSolicitacao } = require('../services/solicitacaoRetornoService');

function responderErro(res, error, fallback) {
  console.error(error);
  return res.status(Number(error?.statusCode) || 500).json({
    error: error?.message || fallback,
    code: error?.code || undefined
  });
}

module.exports = {
  async meusCartoes(req, res) {
    try {
      return res.json({ cartoes: await listarMeusCartoes(req.user) });
    } catch (error) {
      return responderErro(res, error, 'Erro ao buscar os cartoes vinculados ao usuario.');
    }
  },

  async contextoCartao(req, res) {
    try {
      return res.json(await obterContextoCartao(req.params.id, req.user));
    } catch (error) {
      return responderErro(res, error, 'Erro ao conferir a ultima recarga do cartao.');
    }
  },

  async contextoSolicitacao(req, res) {
    try {
      return res.json(await obterContextoSolicitacao(req.params.id, req.user));
    } catch (error) {
      return responderErro(res, error, 'Erro ao carregar o fluxo da recarga.');
    }
  },

  async enviarPrestacao(req, res) {
    try {
      await assertPodeInteragirSolicitacao(req, req.params.id);
      const recarga = await salvarPrestacao(req.params.id, req.body || {}, req.user);
      return res.json({ recarga });
    } catch (error) {
      return responderErro(res, error, 'Erro ao salvar a prestacao de contas.');
    }
  },

  async decidirPrestacao(req, res) {
    try {
      await assertPodeInteragirSolicitacao(req, req.params.id);
      const recarga = await decidirPrestacao(req.params.id, req.body || {}, req.user);
      return res.json({ recarga });
    } catch (error) {
      return responderErro(res, error, 'Erro ao decidir a prestacao de contas.');
    }
  },

  async adminIndex(req, res) {
    try {
      return res.json(await listarAdmin(req.user));
    } catch (error) {
      return responderErro(res, error, 'Erro ao carregar o cadastro de cartoes de recarga.');
    }
  },

  async adminCreate(req, res) {
    try {
      const cartao = await salvarCartao(null, req.body || {}, req.user);
      return res.status(201).json(cartao);
    } catch (error) {
      return responderErro(res, error, 'Erro ao cadastrar o cartao de recarga.');
    }
  },

  async adminUpdate(req, res) {
    try {
      return res.json(await salvarCartao(req.params.id, req.body || {}, req.user));
    } catch (error) {
      return responderErro(res, error, 'Erro ao atualizar o cartao de recarga.');
    }
  }
};
