const {
  gerarDiagnosticoDre,
  gerarDreComparativoEmpresas,
  gerarDreComparativoMensal,
  gerarDreGerencial,
  gerarPainelExecutivoGrupo,
  gerarRelatorioEndividamento,
  gerarRelatorioFluxoConsolidado,
  gerarRelatorioIntercompany,
  gerarRelatorioAnalitico,
  gerarRelatorioFinanceiroObras,
  gerarRelatorioFluxoCaixa
} = require('../services/relatorioFinanceiroService');
const { responderErroController } = require('../utils/controllerError');

function responderErro(res, error, fallbackMessage) {
  return responderErroController(res, error, fallbackMessage);
}

module.exports = {
  async grupoConsolidado(req, res) {
    try {
      const relatorio = await gerarPainelExecutivoGrupo(req, req.query || {});
      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao gerar painel executivo do grupo');
    }
  },

  async fluxoCaixa(req, res) {
    try {
      const relatorio = await gerarRelatorioFluxoCaixa(req, req.query || {});
      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao gerar relatorio de fluxo de caixa');
    }
  },

  async fluxoConsolidado(req, res) {
    try {
      const relatorio = await gerarRelatorioFluxoConsolidado(req, req.query || {});
      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao gerar fluxo de caixa consolidado');
    }
  },

  async analitico(req, res) {
    try {
      const relatorio = await gerarRelatorioAnalitico(req, req.query || {});
      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao gerar relatorio analitico financeiro');
    }
  },

  async financeiroObras(req, res) {
    try {
      const relatorio = await gerarRelatorioFinanceiroObras(req, req.query || {});
      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao gerar relatorio financeiro de obras');
    }
  },

  async dre(req, res) {
    try {
      const relatorio = await gerarDreGerencial(req, req.query || {});
      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao gerar DRE financeira');
    }
  },

  async dreComparativo(req, res) {
    try {
      const relatorio = await gerarDreComparativoMensal(req, req.query || {});
      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao gerar comparativo mensal da DRE');
    }
  },

  async dreComparativoEmpresas(req, res) {
    try {
      const relatorio = await gerarDreComparativoEmpresas(req, req.query || {});
      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao gerar comparativo da DRE por empresa');
    }
  },

  async diagnosticoDre(req, res) {
    try {
      const diagnostico = await gerarDiagnosticoDre(req);
      return res.json(diagnostico);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao gerar diagnostico da DRE');
    }
  },

  async endividamento(req, res) {
    try {
      const relatorio = await gerarRelatorioEndividamento(req, req.query || {});
      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao gerar relatorio de endividamento');
    }
  },

  async intercompany(req, res) {
    try {
      const relatorio = await gerarRelatorioIntercompany(req, req.query || {});
      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return responderErro(res, error, 'Erro ao gerar relatorio Entre Empresas');
    }
  }
};
