const {
  resolverPermissoesProvisionamentoFinanceiro
} = require('../services/provisaoFinanceira/permissoes');

function criarMiddlewareProvisionamentoFinanceiro(acao = 'acessar') {
  return async function validarAcessoProvisionamentoFinanceiro(req, res, next) {
    try {
      const permissoes = await resolverPermissoesProvisionamentoFinanceiro(req.user);
      req.provisaoFinanceiraPermissoes = permissoes;

      const mapaCampos = {
        acessar: 'pode_acessar',
        criar: 'pode_criar',
        aprovar: 'pode_aprovar',
        dashboard: 'pode_dashboard_global'
      };

      const campo = mapaCampos[acao] || 'pode_acessar';
      if (!permissoes?.[campo]) {
        return res.status(403).json({ error: 'Acesso negado ao modulo de provisionamento financeiro' });
      }

      return next();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao validar acesso ao modulo de provisionamento financeiro' });
    }
  };
}

module.exports = criarMiddlewareProvisionamentoFinanceiro;
