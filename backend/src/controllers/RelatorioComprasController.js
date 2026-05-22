const { User } = require('../models');
const { canViewComprasCotacoes } = require('../services/authorizationService');
const {
  relatorioCategoriasInsumosCompras,
  relatorioCicloCompras,
  relatorioDemandaPedidosCompras,
  relatorioEconomiaCotacoes,
  relatorioFornecedoresCompras,
  relatorioPendenciasCotacoesCompras
} = require('../services/relatorioComprasService');

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
  async pendenciasCotacoes(req, res) {
    try {
      const usuario = await validarAcessoRelatorioCompras(req, res);
      if (!usuario) {
        return;
      }

      const relatorio = await relatorioPendenciasCotacoesCompras({
        obraId: req.query?.obra_id,
        dataInicio: req.query?.data_inicio,
        dataFim: req.query?.data_fim,
        obraIds: req.compraScopeObraIds
      });

      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar relatorio de pendencias de cotacoes' });
    }
  },

  async categoriasInsumos(req, res) {
    try {
      const usuario = await validarAcessoRelatorioCompras(req, res);
      if (!usuario) {
        return;
      }

      const relatorio = await relatorioCategoriasInsumosCompras({
        obraId: req.query?.obra_id,
        dataInicio: req.query?.data_inicio,
        dataFim: req.query?.data_fim,
        obraIds: req.compraScopeObraIds
      });

      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar relatorio de compras por categoria e insumo' });
    }
  },

  async demandaPedidos(req, res) {
    try {
      const usuario = await validarAcessoRelatorioCompras(req, res);
      if (!usuario) {
        return;
      }

      const relatorio = await relatorioDemandaPedidosCompras({
        obraId: req.query?.obra_id,
        dataInicio: req.query?.data_inicio,
        dataFim: req.query?.data_fim,
        obraIds: req.compraScopeObraIds
      });

      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar relatorio de demanda e pedidos de compras' });
    }
  },

  async ciclo(req, res) {
    try {
      const usuario = await validarAcessoRelatorioCompras(req, res);
      if (!usuario) {
        return;
      }

      const relatorio = await relatorioCicloCompras({
        obraId: req.query?.obra_id,
        dataInicio: req.query?.data_inicio,
        dataFim: req.query?.data_fim,
        obraIds: req.compraScopeObraIds
      });

      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar relatorio de ciclo de compras' });
    }
  },

  async economiaCotacoes(req, res) {
    try {
      const usuario = await validarAcessoRelatorioCompras(req, res);
      if (!usuario) {
        return;
      }

      const relatorio = await relatorioEconomiaCotacoes({
        obraId: req.query?.obra_id,
        dataInicio: req.query?.data_inicio,
        dataFim: req.query?.data_fim,
        obraIds: req.compraScopeObraIds
      });

      return res.json(relatorio);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar relatorio de economia em cotacoes' });
    }
  },

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
