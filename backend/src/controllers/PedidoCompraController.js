const { PedidoCompra, User } = require('../models');
const {
  adicionarRespostaAoPedido,
  atualizarPedidoItem,
  atualizarStatusPedido,
  criarPedidoParaFornecedor,
  listarAuditoriaItensPedido,
  listarPedidos,
  obterPedidoDetalhe,
  removerPedidoItem
} = require('../services/pedidoCompraService');
const {
  canAuditComprasPedidos,
  canManageComprasPedidos,
  canViewComprasPedidos
} = require('../services/authorizationService');
const { renderPedidoCompraPdf } = require('../services/pedidoCompraPdf');
const { responderErroController } = require('../utils/controllerError');
const {
  generatePedidoCompraPdfBufferFromHtml,
  isPedidoCompraHtmlPdfAvailable
} = require('../services/pedidoCompraPdfPuppeteer');

async function carregarUsuarioCompras(userId) {
  if (!userId) {
    return null;
  }

  return User.findByPk(userId, {
    attributes: ['id', 'nome', 'email', 'perfil', 'setor_id', 'pode_criar_solicitacao_compra']
  });
}

async function podeVisualizarPedidos(usuario) {
  return canViewComprasPedidos(usuario);
}

async function podeGerenciarPedidos(usuario) {
  return canManageComprasPedidos(usuario);
}

async function validarAcessoPedidos(req, res, options = {}) {
  const usuario = await carregarUsuarioCompras(req.user?.id);
  if (!usuario) {
    res.status(401).json({ error: 'Usuario nao autenticado' });
    return null;
  }

  const exigeGestao = options.gerenciar === true;
  const exigeAuditoria = options.auditoria === true;
  let permitido = await podeVisualizarPedidos(usuario);
  if (exigeAuditoria) {
    permitido = await canAuditComprasPedidos(usuario);
  } else if (exigeGestao) {
    permitido = await podeGerenciarPedidos(usuario);
  }

  if (!permitido) {
    res.status(403).json({
      error: exigeAuditoria
        ? 'Acesso negado a auditoria dos pedidos de compra'
        : (exigeGestao
          ? 'Apenas compras pode gerenciar pedidos de compra'
          : 'Acesso negado aos pedidos de compra')
    });
    return null;
  }

  return usuario;
}

module.exports = {
  async index(req, res) {
    try {
      const usuario = await validarAcessoPedidos(req, res);
      if (!usuario) {
        return;
      }

      const pedidos = await listarPedidos({
        solicitacaoId: req.query?.solicitacao_id,
        obraId: req.query?.obra_id,
        status: req.query?.status,
        q: req.query?.q,
        obraIds: req.compraScopeObraIds
      });

      return res.json(pedidos);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar pedidos de compra' });
    }
  },

  async auditoria(req, res) {
    try {
      const usuario = await validarAcessoPedidos(req, res, { auditoria: true });
      if (!usuario) {
        return;
      }

      const auditoria = await listarAuditoriaItensPedido({
        obraId: req.query?.obra_id,
        pedidoId: req.query?.pedido_id,
        itemId: req.query?.item_id,
        acao: req.query?.acao,
        q: req.query?.q,
        obraIds: req.compraScopeObraIds
      });

      return res.json(auditoria);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar auditoria dos itens do pedido' });
    }
  },

  async show(req, res) {
    try {
      const usuario = await validarAcessoPedidos(req, res);
      if (!usuario) {
        return;
      }

      const pedido = await obterPedidoDetalhe(req.params.id);
      if (!pedido) {
        return res.status(404).json({ error: 'Pedido de compra nao encontrado' });
      }

      return res.json(pedido);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar pedido de compra' });
    }
  },

  async createFromSolicitacao(req, res) {
    const transaction = await PedidoCompra.sequelize.transaction();

    try {
      const usuario = await validarAcessoPedidos(req, res, { gerenciar: true });
      if (!usuario) {
        await transaction.rollback();
        return;
      }

      if (normalizeToken(req.solicitacaoCompraResource?.status) !== 'ENCERRADO') {
        await transaction.rollback();
        return res.status(400).json({
          error: 'A solicitacao precisa estar encerrada para gerar pedido adicional.'
        });
      }

      const pedido = await criarPedidoParaFornecedor({
        solicitacaoId: req.params.id,
        fornecedorCompraId: req.body?.fornecedor_compra_id,
        usuarioId: usuario.id,
        transaction
      });

      await transaction.commit();
      return res.status(201).json(pedido);
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return responderErroController(res, error, 'Erro ao criar pedido de compra', { status: 400 });
    }
  },

  async addItem(req, res) {
    const transaction = await PedidoCompra.sequelize.transaction();

    try {
      const usuario = await validarAcessoPedidos(req, res, { gerenciar: true });
      if (!usuario) {
        await transaction.rollback();
        return;
      }

      await adicionarRespostaAoPedido({
        pedidoId: req.params.id,
        respostaItemId: req.body?.resposta_item_id,
        usuarioId: usuario.id,
        transaction
      });

      await transaction.commit();
      const pedido = await obterPedidoDetalhe(req.params.id);
      return res.status(201).json(pedido);
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return responderErroController(res, error, 'Erro ao adicionar item ao pedido', { status: 400 });
    }
  },

  async updateStatus(req, res) {
    const transaction = await PedidoCompra.sequelize.transaction();

    try {
      const usuario = await validarAcessoPedidos(req, res, { gerenciar: true });
      if (!usuario) {
        await transaction.rollback();
        return;
      }

      await atualizarStatusPedido({
        pedidoId: req.params.id,
        status: req.body?.status,
        usuarioId: usuario.id,
        transaction
      });

      await transaction.commit();
      const pedido = await obterPedidoDetalhe(req.params.id);
      return res.json(pedido);
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return responderErroController(res, error, 'Erro ao atualizar status do pedido', { status: 400 });
    }
  },

  async updateItem(req, res) {
    const transaction = await PedidoCompra.sequelize.transaction();

    try {
      const usuario = await validarAcessoPedidos(req, res, { gerenciar: true });
      if (!usuario) {
        await transaction.rollback();
        return;
      }

      await atualizarPedidoItem({
        pedidoId: req.params.id,
        itemId: req.params.itemId,
        payload: req.body || {},
        usuarioId: usuario.id,
        transaction
      });

      await transaction.commit();
      const pedido = await obterPedidoDetalhe(req.params.id);
      return res.json(pedido);
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return responderErroController(res, error, 'Erro ao atualizar item do pedido', { status: 400 });
    }
  },

  async removeItem(req, res) {
    const transaction = await PedidoCompra.sequelize.transaction();

    try {
      const usuario = await validarAcessoPedidos(req, res, { gerenciar: true });
      if (!usuario) {
        await transaction.rollback();
        return;
      }

      await removerPedidoItem({
        pedidoId: req.params.id,
        itemId: req.params.itemId,
        usuarioId: usuario.id,
        transaction
      });

      await transaction.commit();
      const pedido = await obterPedidoDetalhe(req.params.id);
      return res.json(pedido);
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return responderErroController(res, error, 'Erro ao remover item do pedido', { status: 400 });
    }
  },

  async pdf(req, res) {
    try {
      const usuario = await validarAcessoPedidos(req, res);
      if (!usuario) {
        return;
      }

      const pedido = await obterPedidoDetalhe(req.params.id);
      if (!pedido) {
        return res.status(404).json({ error: 'Pedido de compra nao encontrado' });
      }

      const filename = `pedido-compra-PC-${String(pedido.id).padStart(5, '0')}.pdf`;

      if (isPedidoCompraHtmlPdfAvailable()) {
        try {
          const pdfBuffer = await generatePedidoCompraPdfBufferFromHtml(pedido, {
            generatedAt: new Date()
          });

          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          return res.end(pdfBuffer);
        } catch (error) {
          console.warn('[PedidoCompraController.pdf] Falha ao gerar PDF HTML. Aplicando fallback para pdfkit.');
          console.warn(error);
        }
      }

      let PDFDocument;
      try {
        PDFDocument = require('pdfkit');
      } catch (error) {
        return res.status(500).json({ error: 'Dependencias de PDF indisponiveis no backend' });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      doc.pipe(res);
      await renderPedidoCompraPdf(doc, pedido);
      doc.end();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao gerar PDF do pedido' });
    }
  }
};
