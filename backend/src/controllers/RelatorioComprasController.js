const { User } = require('../models');
const { canViewComprasCotacoes } = require('../services/authorizationService');
const { relatorioFornecedoresCompras } = require('../services/relatorioComprasService');

async function carregarUsuario(userId) {
  if (!userId) {
    return null;
  }

  return User.findByPk(userId, {
    attributes: ['id', 'nome', 'email', 'perfil', 'setor_id', 'pode_criar_solicitacao_compra']
  });
}

async function validarAcessoRelatorioCompras(req, res) {
  const usuario = await carregarUsuario(req.user?.id);
  if (!usuario) {
    res.status(401).json({ error: 'Usuario nao autenticado' });
    return null;
  }

  if (!(await canViewComprasCotacoes(usuario))) {
    res.status(403).json({ error: 'Acesso negado aos relatorios de compras' });
    return null;
  }

  return usuario;
}

module.exports = {
  async fornecedores(req, res) {
    try {
      const usuario = await validarAcessoRelatorioCompras(req, res);
      if (!usuario) {
        return;
      }

      const relatorio = await relatorioFornecedoresCompras({
        obraId: req.query?.obra_id,
        dataInicio: req.query?.data_inicio,
        dataFim: req.query?.data_fim,
        obraIds: req.compraScopeObraIds
      });

      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar relatorio de fornecedores de compras' });
    }
  }
};
