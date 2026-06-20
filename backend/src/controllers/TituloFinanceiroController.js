const {
  atualizarCobrancaTitulo,
  atualizarTitulo,
  baixarTitulo,
  baixarTitulosParceladosEmMassa,
  baixarTituloPorConciliacoes,
  carregarTituloPorId,
  criarTituloManual,
  criarTituloPorSolicitacao,
  estornarMovimentoTitulo,
  importarCodigosBarrasTitulos,
  listarAuditoriaTitulo,
  listarBaixasRealizadas,
  listarTitulos,
  listarTitulosPorSolicitacao
} = require('../services/tituloFinanceiroService');
const { responderErroController } = require('../utils/controllerError');

function responderErro(res, error, fallbackMessage) {
  return responderErroController(res, error, fallbackMessage);
}

module.exports = {
  async index(req, res) {
    try {
      const titulos = await listarTitulos(req, req.query || {});
      return res.json(titulos);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao listar titulos financeiros');
    }
  },

  async show(req, res) {
    try {
      const titulo = await carregarTituloPorId(req, req.params.id, { includeMovimentos: true });
      return res.json(titulo);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao buscar titulo financeiro');
    }
  },

  async auditoria(req, res) {
    try {
      const auditoria = await listarAuditoriaTitulo(req, req.params.id);
      return res.json(auditoria);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao buscar auditoria do titulo financeiro');
    }
  },

  async baixas(req, res) {
    try {
      const baixas = await listarBaixasRealizadas(req, req.query || {});
      return res.json(baixas);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao listar baixas financeiras');
    }
  },

  async listarPorSolicitacao(req, res) {
    try {
      const titulos = await listarTitulosPorSolicitacao(req, req.params.id);
      return res.json(titulos);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao listar titulos da solicitacao');
    }
  },

  async criarPorSolicitacao(req, res) {
    try {
      const titulo = await criarTituloPorSolicitacao(req, req.params.id, req.body || {});
      res.locals.tituloFinanceiroId = titulo.id;
      return res.status(201).json(titulo);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao gerar titulo financeiro');
    }
  },

  async create(req, res) {
    try {
      const titulo = await criarTituloManual(req, req.body || {});
      res.locals.tituloFinanceiroId = titulo.id;
      return res.status(201).json(titulo);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao criar titulo financeiro manual');
    }
  },

  async importarCodigosBarras(req, res) {
    try {
      const resultado = await importarCodigosBarrasTitulos(req, req.body || {});
      return res.json(resultado);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao importar codigos de barras dos titulos');
    }
  },

  async update(req, res) {
    try {
      const titulo = await atualizarTitulo(req, req.params.id, req.body || {});
      return res.json(titulo);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao editar titulo financeiro');
    }
  },

  async atualizarCobranca(req, res) {
    try {
      const titulo = await atualizarCobrancaTitulo(req, req.params.id, req.body || {});
      return res.json(titulo);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao atualizar dados de cobranca do titulo');
    }
  },

  async baixar(req, res) {
    try {
      const titulo = await baixarTitulo(req, req.params.id, req.body || {});
      return res.json(titulo);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao registrar baixa financeira');
    }
  },

  async baixarParcelado(req, res) {
    try {
      const resultado = await baixarTitulosParceladosEmMassa(req, req.body || {});
      return res.json(resultado);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao registrar baixa parcelada em massa');
    }
  },

  async baixarPorConciliacoes(req, res) {
    try {
      const titulo = await baixarTituloPorConciliacoes(req, req.params.id, req.body || {});
      return res.json(titulo);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao registrar baixa por conciliacao bancaria');
    }
  },

  async estornarMovimento(req, res) {
    try {
      const titulo = await estornarMovimentoTitulo(
        req,
        req.params.id,
        req.params.movimentoId,
        req.body || {}
      );
      return res.json(titulo);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao estornar baixa financeira');
    }
  }
};
