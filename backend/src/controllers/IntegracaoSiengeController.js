const {
  detalharFilaIntegracaoSienge,
  buscarCredorParceiroNoSienge,
  cadastrarCredorParceiroNoSienge,
  enqueueTituloNaFilaSienge,
  obterConfiguracaoSienge,
  obterContextoCredorParceiro,
  obterSaudeIntegracaoSienge,
  listarFilaIntegracaoSienge,
  listarLogsIntegracaoSienge,
  reprocessarFilaSienge,
  salvarConfiguracaoSienge,
  salvarMapeamentoCredorParceiro
} = require('../services/integracaoSiengeService');
const {
  gerarModeloCargaInicialSiengeCsv,
  importarCargaInicialSienge
} = require('../services/siengeCargaInicialService');
const { responderErroController } = require('../utils/controllerError');

module.exports = {
  async config(req, res) {
    try {
      const data = await obterConfiguracaoSienge();
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao buscar configuracao da Integracao SIENGE');
    }
  },

  async atualizarConfig(req, res) {
    try {
      const data = await salvarConfiguracaoSienge(req.body || {}, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao salvar configuracao da Integracao SIENGE');
    }
  },

  async saude(req, res) {
    try {
      const data = await obterSaudeIntegracaoSienge();
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao avaliar prontidao da Integracao SIENGE');
    }
  },

  async fila(req, res) {
    try {
      const data = await listarFilaIntegracaoSienge(req.query || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar fila da Integracao SIENGE');
    }
  },

  async filaShow(req, res) {
    try {
      const data = await detalharFilaIntegracaoSienge(req.params.id);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao buscar item da fila SIENGE');
    }
  },

  async filaCreate(req, res) {
    try {
      const data = await enqueueTituloNaFilaSienge(req.body || {}, req.user);
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao preparar envio do titulo para a fila SIENGE');
    }
  },

  async filaRetry(req, res) {
    try {
      const data = await reprocessarFilaSienge(req.params.id, req.body || {}, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao reprocessar item da fila SIENGE');
    }
  },

  async logs(req, res) {
    try {
      const data = await listarLogsIntegracaoSienge(req.query || {});
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao listar logs da Integracao SIENGE');
    }
  },

  async modeloCargaInicial(req, res) {
    try {
      const csv = gerarModeloCargaInicialSiengeCsv();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="modelo-carga-inicial-sienge.csv"');
      return res.send(csv);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao gerar modelo de carga inicial SIENGE');
    }
  },

  async importarCargaInicial(req, res) {
    try {
      const data = await importarCargaInicialSienge({
        file: req.file,
        user: req.user
      });
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao importar carga inicial SIENGE');
    }
  },

  async credorParceiroContexto(req, res) {
    try {
      const data = await obterContextoCredorParceiro(req.params.parceiroId);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao montar o contexto do credor SIENGE para o parceiro');
    }
  },

  async credorParceiroBuscar(req, res) {
    try {
      const data = await buscarCredorParceiroNoSienge(req.params.parceiroId, req.body || {}, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao buscar credor no SIENGE para o parceiro');
    }
  },

  async credorParceiroCadastrar(req, res) {
    try {
      const data = await cadastrarCredorParceiroNoSienge(req.params.parceiroId, req.body || {}, req.user);
      return res.status(201).json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao cadastrar credor no SIENGE para o parceiro');
    }
  },

  async credorParceiroMapeamento(req, res) {
    try {
      const data = await salvarMapeamentoCredorParceiro(req.params.parceiroId, req.body || {}, req.user);
      return res.json(data);
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao salvar o mapeamento do credor SIENGE para o parceiro');
    }
  }
};
