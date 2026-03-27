const path = require('path');
const {
  FornecedorCompra,
  Insumo,
  Obra,
  SolicitacaoCompra,
  SolicitacaoCompraFornecedor,
  SolicitacaoCompraItem,
  SolicitacaoCompraItemManual,
  SolicitacaoCompraRespostaItem,
  Unidade
} = require('../models');
const {
  gerarModeloCotacaoCsv,
  normalizeText,
  obterItensCotaveis,
  parseCsvRows,
  parseDisponivel,
  registrarLogSolicitacaoCompra
} = require('../services/comprasCotacao');

function buildItemKey(itemTipo, itemReferenciaId) {
  return `${normalizeText(itemTipo)}:${Number(itemReferenciaId)}`;
}

async function carregarCotacaoPorToken(token) {
  return SolicitacaoCompraFornecedor.findOne({
    where: { token },
    include: [
      {
        model: FornecedorCompra,
        as: 'fornecedor',
        attributes: ['id', 'nome', 'email', 'whatsapp', 'contato']
      },
      {
        model: SolicitacaoCompra,
        as: 'solicitacao',
        include: [
          {
            model: Obra,
            as: 'obra',
            attributes: ['id', 'nome', 'codigo']
          },
          {
            model: SolicitacaoCompraItem,
            as: 'itens',
            include: [
              { model: Insumo, as: 'insumo', attributes: ['id', 'nome', 'codigo'] },
              { model: Unidade, as: 'unidade', attributes: ['id', 'sigla'] }
            ]
          },
          {
            model: SolicitacaoCompraItemManual,
            as: 'itensManuais'
          }
        ]
      },
      {
        model: SolicitacaoCompraRespostaItem,
        as: 'respostas'
      }
    ]
  });
}

function serializarCotacaoPublica(cotacaoFornecedor) {
  const itensCotaveis = obterItensCotaveis(cotacaoFornecedor?.solicitacao || {});
  const respostasPorItem = new Map(
    (cotacaoFornecedor?.respostas || []).map((resposta) => {
      const itemReferenciaId =
        resposta.solicitacao_compra_item_id || resposta.solicitacao_compra_item_manual_id;
      return [buildItemKey(resposta.item_tipo, itemReferenciaId), resposta];
    })
  );

  return {
    fornecedor: cotacaoFornecedor?.fornecedor || null,
    solicitacao: {
      id: cotacaoFornecedor?.solicitacao?.id,
      status: cotacaoFornecedor?.solicitacao?.status,
      obra: cotacaoFornecedor?.solicitacao?.obra || null
    },
    cotacao: {
      id: cotacaoFornecedor?.id,
      status: cotacaoFornecedor?.status,
      enviado_em: cotacaoFornecedor?.enviado_em,
      visualizado_em: cotacaoFornecedor?.visualizado_em,
      respondido_em: cotacaoFornecedor?.respondido_em
    },
    somente_leitura: normalizeText(cotacaoFornecedor?.solicitacao?.status) === 'ENCERRADO',
    itens: itensCotaveis.map((item) => {
      const resposta = respostasPorItem.get(buildItemKey(item.item_tipo, item.item_referencia_id));
      return {
        ...item,
        disponivel: Boolean(resposta?.disponivel),
        preco: resposta?.preco ?? '',
        prazo: resposta?.prazo || '',
        observacao: resposta?.observacao || '',
        resposta_item_id: resposta?.id || null,
        vencedor: Boolean(resposta?.vencedor)
      };
    })
  };
}

async function salvarRespostasCotacao(cotacaoFornecedor, itensResposta) {
  const solicitacao = cotacaoFornecedor.solicitacao;
  const itensCotaveis = obterItensCotaveis(solicitacao);
  const itensPorKey = new Map(
    itensCotaveis.map((item) => [buildItemKey(item.item_tipo, item.item_referencia_id), item])
  );

  const respostasPreparadas = [];

  for (const itemResposta of itensResposta) {
    const itemTipo = normalizeText(itemResposta.item_tipo);
    const itemReferenciaId = Number(itemResposta.item_referencia_id);
    const key = buildItemKey(itemTipo, itemReferenciaId);
    const itemBase = itensPorKey.get(key);

    if (!itemBase) {
      throw new Error(`Item invalido informado na resposta: ${itemResposta.item_referencia_id}`);
    }

    const disponivel = Boolean(itemResposta.disponivel);
    const precoNormalizado =
      itemResposta.preco === '' || itemResposta.preco === null || itemResposta.preco === undefined
        ? null
        : Number(itemResposta.preco);

    if (precoNormalizado !== null && !Number.isFinite(precoNormalizado)) {
      throw new Error(`Preco invalido informado para o item ${itemBase.nome}`);
    }

    if (precoNormalizado !== null && precoNormalizado < 0) {
      throw new Error(`Preco nao pode ser negativo no item ${itemBase.nome}`);
    }

    if (disponivel && (precoNormalizado === null || precoNormalizado <= 0)) {
      throw new Error(`Informe um preco valido para o item disponivel ${itemBase.nome}`);
    }

    respostasPreparadas.push({
      solicitacao_compra_fornecedor_id: cotacaoFornecedor.id,
      item_tipo: itemTipo,
      solicitacao_compra_item_id:
        itemTipo === 'CADASTRADO' ? itemReferenciaId : null,
      solicitacao_compra_item_manual_id:
        itemTipo === 'MANUAL' ? itemReferenciaId : null,
      disponivel,
      preco: disponivel ? precoNormalizado : null,
      prazo: itemResposta.prazo ? String(itemResposta.prazo).trim() : null,
      observacao: itemResposta.observacao ? String(itemResposta.observacao).trim() : null,
      vencedor: false
    });
  }

  await SolicitacaoCompraRespostaItem.destroy({
    where: { solicitacao_compra_fornecedor_id: cotacaoFornecedor.id }
  });

  if (respostasPreparadas.length) {
    await SolicitacaoCompraRespostaItem.bulkCreate(respostasPreparadas);
  }

  await cotacaoFornecedor.update({
    status: 'RESPONDIDO',
    respondido_em: new Date(),
    visualizado_em: cotacaoFornecedor.visualizado_em || new Date()
  });

  await registrarLogSolicitacaoCompra({
    solicitacaoCompraId: cotacaoFornecedor.solicitacao.id,
    fornecedorCompraId: cotacaoFornecedor.fornecedor_compra_id,
    tipoAcao: 'RESPOSTA_FORNECEDOR',
    descricao: `Fornecedor ${cotacaoFornecedor.fornecedor?.nome || cotacaoFornecedor.fornecedor_compra_id} respondeu a cotacao`,
    metadados: {
      cotacao_fornecedor_id: cotacaoFornecedor.id,
      quantidade_itens: respostasPreparadas.length
    }
  });
}

module.exports = {
  async show(req, res) {
    try {
      const cotacaoFornecedor = await carregarCotacaoPorToken(req.params.token);
      if (!cotacaoFornecedor) {
        return res.status(404).json({ error: 'Cotacao nao encontrada' });
      }

      if (!cotacaoFornecedor.visualizado_em) {
        await cotacaoFornecedor.update({
          status: cotacaoFornecedor.status === 'ENVIADO' ? 'VISUALIZADO' : cotacaoFornecedor.status,
          visualizado_em: new Date()
        });

        await registrarLogSolicitacaoCompra({
          solicitacaoCompraId: cotacaoFornecedor.solicitacao.id,
          fornecedorCompraId: cotacaoFornecedor.fornecedor_compra_id,
          tipoAcao: 'VISUALIZACAO_FORNECEDOR',
          descricao: `Fornecedor ${cotacaoFornecedor.fornecedor?.nome || cotacaoFornecedor.fornecedor_compra_id} visualizou a cotacao`,
          metadados: { cotacao_fornecedor_id: cotacaoFornecedor.id }
        });
      }

      const atualizada = await carregarCotacaoPorToken(req.params.token);
      return res.json(serializarCotacaoPublica(atualizada));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar cotacao' });
    }
  },

  async responder(req, res) {
    try {
      const cotacaoFornecedor = await carregarCotacaoPorToken(req.params.token);
      if (!cotacaoFornecedor) {
        return res.status(404).json({ error: 'Cotacao nao encontrada' });
      }

      if (normalizeText(cotacaoFornecedor.solicitacao?.status) === 'ENCERRADO') {
        return res.status(400).json({ error: 'Cotacao encerrada. Nao e mais possivel responder.' });
      }

      const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
      if (!itens.length) {
        return res.status(400).json({ error: 'Informe os itens da resposta' });
      }

      await salvarRespostasCotacao(cotacaoFornecedor, itens);
      const atualizada = await carregarCotacaoPorToken(req.params.token);
      return res.status(201).json(serializarCotacaoPublica(atualizada));
    } catch (error) {
      console.error(error);
      return res.status(400).json({ error: error.message || 'Erro ao registrar resposta da cotacao' });
    }
  },

  async upload(req, res) {
    try {
      const token = String(req.body?.token || '').trim();
      if (!token) {
        return res.status(400).json({ error: 'Informe o token da cotacao' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const extension = path.extname(String(req.file.originalname || '')).toLowerCase();
      if (extension && extension !== '.csv') {
        return res.status(400).json({ error: 'A planilha deve estar no formato CSV do sistema' });
      }

      const cotacaoFornecedor = await carregarCotacaoPorToken(token);
      if (!cotacaoFornecedor) {
        return res.status(404).json({ error: 'Cotacao nao encontrada' });
      }

      if (normalizeText(cotacaoFornecedor.solicitacao?.status) === 'ENCERRADO') {
        return res.status(400).json({ error: 'Cotacao encerrada. Nao e mais possivel responder.' });
      }

      const rows = parseCsvRows(req.file.buffer);
      if (!rows.length) {
        return res.status(400).json({ error: 'Planilha vazia ou invalida' });
      }

      const requiredHeaders = ['PRODUTO_ID', 'NOME', 'QUANTIDADE', 'PRECO', 'PRAZO', 'DISPONIVEL'];
      const headers = Object.keys(rows[0] || {});
      const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
      if (missingHeaders.length) {
        return res.status(400).json({
          error: `Cabecalhos obrigatorios ausentes: ${missingHeaders.join(', ')}`
        });
      }

      const itensCotaveis = obterItensCotaveis(cotacaoFornecedor.solicitacao);
      const itensPorProdutoId = new Map(itensCotaveis.map((item) => [item.produto_id, item]));

      const itensResposta = rows.map((row) => {
        const produtoId = String(row.PRODUTO_ID || '').trim();
        if (!produtoId) {
          throw new Error('produto_id obrigatorio na planilha');
        }

        const item = itensPorProdutoId.get(produtoId);
        if (!item) {
          throw new Error(`produto_id invalido na planilha: ${produtoId}`);
        }

        return {
          item_tipo: item.item_tipo,
          item_referencia_id: item.item_referencia_id,
          disponivel: parseDisponivel(row.DISPONIVEL),
          preco: row.PRECO ? String(row.PRECO).replace(',', '.') : '',
          prazo: row.PRAZO || '',
          observacao: `Importado via planilha por ${cotacaoFornecedor.fornecedor?.nome || 'fornecedor'}`
        };
      });

      await salvarRespostasCotacao(cotacaoFornecedor, itensResposta);
      const atualizada = await carregarCotacaoPorToken(token);
      return res.status(201).json(serializarCotacaoPublica(atualizada));
    } catch (error) {
      console.error(error);
      return res.status(400).json({ error: error.message || 'Erro ao importar planilha da cotacao' });
    }
  },

  async modelo(req, res) {
    try {
      const cotacaoFornecedor = await carregarCotacaoPorToken(req.params.token);
      if (!cotacaoFornecedor) {
        return res.status(404).json({ error: 'Cotacao nao encontrada' });
      }

      const csv = gerarModeloCotacaoCsv(cotacaoFornecedor.solicitacao);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="cotacao-${cotacaoFornecedor.id}.csv"`
      );
      return res.send(csv);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao gerar modelo da cotacao' });
    }
  }
};
