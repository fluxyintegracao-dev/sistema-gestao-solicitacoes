const path = require('path');
const { Op } = require('sequelize');
const {
  Apropriacao,
  FornecedorCompra,
  Insumo,
  Obra,
  SolicitacaoCompra,
  SolicitacaoCompraFornecedor,
  SolicitacaoCompraItem,
  SolicitacaoCompraItemApropriacao,
  SolicitacaoCompraItemManual,
  SolicitacaoCompraItemManualApropriacao,
  SolicitacaoCompraRespostaItem,
  Unidade
} = require('../models');
const { env } = require('../config/env');
const {
  gerarModeloCotacaoCsv,
  gerarModeloCotacaoXlsx,
  normalizeText,
  obterItensCotaveis,
  parseCsvRows,
  parseDisponivel,
  parseXlsxRows,
  registrarLogSolicitacaoCompra
} = require('../services/comprasCotacao');
const { getPresignedUrl, uploadToS3 } = require('../services/s3');
const { responderErroController } = require('../utils/controllerError');

function buildItemKey(itemTipo, itemReferenciaId) {
  return `${normalizeText(itemTipo)}:${Number(itemReferenciaId)}`;
}

function isImageAttachment(item) {
  const baseName = String(item?.arquivo_nome_original || item?.arquivo_url || '').split('?')[0].toLowerCase();
  const extension = path.extname(baseName);
  return extension === '.png' || extension === '.jpg' || extension === '.jpeg' || extension === '.webp';
}

function buildApiOrigin(req) {
  const forwardedProto = String(req.headers?.['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim();
  const protocol = forwardedProto || req.protocol || 'http';
  const host = String(req.get?.('host') || req.headers?.host || '').trim();
  return host ? `${protocol}://${host}` : '';
}

async function resolvePublicAttachmentUrl(req, arquivoUrl) {
  if (!arquivoUrl) {
    return null;
  }

  const resolved = await getPresignedUrl(arquivoUrl, 300);
  if (!resolved) {
    return null;
  }

  if (String(resolved).startsWith('/')) {
    const origin = buildApiOrigin(req);
    return origin ? `${origin}${resolved}` : resolved;
  }

  return resolved;
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
              { model: Unidade, as: 'unidade', attributes: ['id', 'sigla'] },
              {
                model: SolicitacaoCompraItemApropriacao,
                as: 'apropriacoes',
                include: [
                  {
                    model: Apropriacao,
                    as: 'apropriacao',
                    attributes: ['id', 'codigo', 'descricao']
                  }
                ]
              }
            ]
          },
          {
            model: SolicitacaoCompraItemManual,
            as: 'itensManuais',
            include: [
              {
                model: SolicitacaoCompraItemManualApropriacao,
                as: 'apropriacoes',
                include: [
                  {
                    model: Apropriacao,
                    as: 'apropriacao',
                    attributes: ['id', 'codigo', 'descricao']
                  }
                ]
              }
            ]
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

async function serializarCotacaoPublica(cotacaoFornecedor, req) {
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
      respondido_em: cotacaoFornecedor?.respondido_em,
      valor_minimo_pedido: cotacaoFornecedor?.valor_minimo_pedido ?? '',
      condicao_pagamento: cotacaoFornecedor?.condicao_pagamento || '',
      pdf_resposta_url: cotacaoFornecedor?.pdf_resposta_url || null
    },
    somente_leitura: normalizeText(cotacaoFornecedor?.solicitacao?.status) === 'ENCERRADO',
    itens: await Promise.all(itensCotaveis.map(async (item) => {
      const resposta = respostasPorItem.get(buildItemKey(item.item_tipo, item.item_referencia_id));
      // apropriacao_resumo e apropriacao_linhas sao dados internos — nao enviados ao fornecedor
      const { apropriacao_resumo, apropriacao_linhas, ...itemPublico } = item;
      const arquivoUrlPublica = await resolvePublicAttachmentUrl(req, itemPublico.arquivo_url);
      // Deriva status_disponibilidade para retrocompatibilidade com respostas antigas (apenas boolean)
      const statusDisponibilidade =
        resposta?.status_disponibilidade ||
        (resposta ? (resposta.disponivel ? 'DISPONIVEL' : 'NAO_TEM') : 'DISPONIVEL');
      return {
        ...itemPublico,
        arquivo_url: arquivoUrlPublica,
        arquivo_is_image: Boolean(arquivoUrlPublica && isImageAttachment(itemPublico)),
        disponivel: statusDisponibilidade !== 'NAO_TEM',
        status_disponibilidade: statusDisponibilidade,
        data_chegada: resposta?.data_chegada || '',
        preco: resposta?.preco ?? '',
        prazo: resposta?.prazo || '',
        observacao: resposta?.observacao || '',
        quantidade_minima_item: resposta?.quantidade_minima_item ?? '',
        resposta_item_id: resposta?.id || null,
        vencedor: Boolean(resposta?.vencedor)
      };
    }))
  };
}

async function salvarRespostasCotacao(cotacaoFornecedor, itensResposta, options = {}) {
  const solicitacao = cotacaoFornecedor.solicitacao;
  const itensCotaveis = obterItensCotaveis(solicitacao);
  const itensPorKey = new Map(
    itensCotaveis.map((item) => [buildItemKey(item.item_tipo, item.item_referencia_id), item])
  );

  const respostasPreparadas = [];
  const valorMinimoPedido =
    options.valor_minimo_pedido === '' ||
    options.valor_minimo_pedido === null ||
    options.valor_minimo_pedido === undefined
      ? null
      : Number(options.valor_minimo_pedido);

  if (valorMinimoPedido !== null && (!Number.isFinite(valorMinimoPedido) || valorMinimoPedido < 0)) {
    throw new Error('Valor minimo do pedido invalido.');
  }

  for (const itemResposta of itensResposta) {
    const itemTipo = normalizeText(itemResposta.item_tipo);
    const itemReferenciaId = Number(itemResposta.item_referencia_id);
    const key = buildItemKey(itemTipo, itemReferenciaId);
    const itemBase = itensPorKey.get(key);

    if (!itemBase) {
      throw new Error(`Item invalido informado na resposta: ${itemResposta.item_referencia_id}`);
    }

    // Suporta status_disponibilidade (novo) ou disponivel boolean (legado)
    const statusDisponibilidade = itemResposta.status_disponibilidade
      ? normalizeText(itemResposta.status_disponibilidade)
      : itemResposta.disponivel
        ? 'DISPONIVEL'
        : 'NAO_TEM';
    const disponivelValidos = ['DISPONIVEL', 'NAO_TEM', 'PARA_CHEGAR'];
    if (!disponivelValidos.includes(statusDisponibilidade)) {
      throw new Error(`Status de disponibilidade invalido: ${statusDisponibilidade}`);
    }
    const disponivel = statusDisponibilidade !== 'NAO_TEM';
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

    const quantidadeMinima =
      itemResposta.quantidade_minima_item === '' ||
      itemResposta.quantidade_minima_item === null ||
      itemResposta.quantidade_minima_item === undefined
        ? null
        : Number(itemResposta.quantidade_minima_item);

    if (quantidadeMinima !== null && (!Number.isFinite(quantidadeMinima) || quantidadeMinima < 0)) {
      throw new Error(`Quantidade minima invalida para o item ${itemBase.nome}`);
    }

    respostasPreparadas.push({
      solicitacao_compra_fornecedor_id: cotacaoFornecedor.id,
      item_tipo: itemTipo,
      solicitacao_compra_item_id:
        itemTipo === 'CADASTRADO' ? itemReferenciaId : null,
      solicitacao_compra_item_manual_id:
        itemTipo === 'MANUAL' ? itemReferenciaId : null,
      disponivel,
      status_disponibilidade: statusDisponibilidade,
      data_chegada: statusDisponibilidade === 'PARA_CHEGAR' && itemResposta.data_chegada
        ? itemResposta.data_chegada
        : null,
      preco: disponivel ? precoNormalizado : null,
      prazo: itemResposta.prazo ? String(itemResposta.prazo).trim() : null,
      observacao: itemResposta.observacao ? String(itemResposta.observacao).trim() : null,
      quantidade_minima_item: disponivel ? quantidadeMinima : null,
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
    visualizado_em: cotacaoFornecedor.visualizado_em || new Date(),
    valor_minimo_pedido: valorMinimoPedido,
    condicao_pagamento: options.condicao_pagamento
      ? String(options.condicao_pagamento).trim()
      : null
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
  async index(req, res) {
    try {
      const { q, status, obra_id } = req.query;
      const where = {};

      if (status) {
        where.status = String(status).toUpperCase();
      }

      const cotacoes = await SolicitacaoCompraFornecedor.findAll({
        where,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: FornecedorCompra,
            as: 'fornecedor',
            attributes: ['id', 'nome', 'email', 'whatsapp', 'contato'],
            ...(q ? { where: { nome: { [Op.like]: `%${q}%` } }, required: false } : {})
          },
          {
            model: SolicitacaoCompra,
            as: 'solicitacao',
            attributes: ['id', 'titulo', 'status'],
            include: [
              { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo'] }
            ],
            ...(obra_id ? { where: { obra_id }, required: true } : {})
          }
        ]
      });

      const filtrados = q
        ? cotacoes.filter((c) =>
            (c.fornecedor?.nome || '').toLowerCase().includes(q.toLowerCase()) ||
            (c.solicitacao?.titulo || '').toLowerCase().includes(q.toLowerCase())
          )
        : cotacoes;

      return res.json(filtrados);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar cotacoes' });
    }
  },

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
      return res.json(await serializarCotacaoPublica(atualizada, req));
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

      await salvarRespostasCotacao(cotacaoFornecedor, itens, {
        valor_minimo_pedido: req.body?.valor_minimo_pedido,
        condicao_pagamento: req.body?.condicao_pagamento
      });
      const atualizada = await carregarCotacaoPorToken(req.params.token);
      return res.status(201).json(await serializarCotacaoPublica(atualizada, req));
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao registrar resposta da cotacao', {
        status: 400
      });
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
      const extensoesPermitidas = ['.csv', '.xlsx', '.xls', '.pdf'];
      if (extension && !extensoesPermitidas.includes(extension)) {
        return res.status(400).json({
          error: 'Formato invalido. Envie um arquivo CSV, Excel (.xlsx/.xls) ou PDF.'
        });
      }

      const cotacaoFornecedor = await carregarCotacaoPorToken(token);
      if (!cotacaoFornecedor) {
        return res.status(404).json({ error: 'Cotacao nao encontrada' });
      }

      if (normalizeText(cotacaoFornecedor.solicitacao?.status) === 'ENCERRADO') {
        return res.status(400).json({ error: 'Cotacao encerrada. Nao e mais possivel responder.' });
      }

      // PDF: armazena o arquivo e marca a cotacao como respondida com PDF
      if (extension === '.pdf') {
        const url = await uploadToS3(req.file, 'cotacoes-pdf');
        await cotacaoFornecedor.update({
          status: 'RESPONDIDO',
          respondido_em: new Date(),
          visualizado_em: cotacaoFornecedor.visualizado_em || new Date(),
          pdf_resposta_url: url
        });
        await registrarLogSolicitacaoCompra({
          solicitacaoCompraId: cotacaoFornecedor.solicitacao.id,
          fornecedorCompraId: cotacaoFornecedor.fornecedor_compra_id,
          tipoAcao: 'RESPOSTA_FORNECEDOR',
          descricao: `Fornecedor ${cotacaoFornecedor.fornecedor?.nome || cotacaoFornecedor.fornecedor_compra_id} enviou resposta em PDF`,
          metadados: { cotacao_fornecedor_id: cotacaoFornecedor.id, tipo: 'PDF' }
        });
        const atualizada = await carregarCotacaoPorToken(token);
        return res.status(201).json({
          ...await serializarCotacaoPublica(atualizada, req),
          pdf_resposta_url: url
        });
      }

      // CSV ou Excel: parseia linhas estruturadas
      let rows;
      if (extension === '.csv') {
        rows = parseCsvRows(req.file.buffer);
      } else {
        rows = parseXlsxRows(req.file.buffer);
      }

      if (!rows.length) {
        return res.status(400).json({ error: 'Planilha vazia ou invalida' });
      }
      if (rows.length > env.csvImportMaxRows) {
        return res.status(400).json({
          error: `A planilha excede o limite de ${env.csvImportMaxRows} linhas para importacao.`
        });
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

      let valorMinimoPedido = null;

      const itensResposta = rows.map((row) => {
        const produtoId = String(row.PRODUTO_ID || '').trim();
        if (!produtoId) {
          throw new Error('produto_id obrigatorio na planilha');
        }

        const item = itensPorProdutoId.get(produtoId);
        if (!item) {
          throw new Error(`produto_id invalido na planilha: ${produtoId}`);
        }

        if (
          valorMinimoPedido === null &&
          row.VALOR_MINIMO_PEDIDO !== undefined &&
          String(row.VALOR_MINIMO_PEDIDO || '').trim() !== ''
        ) {
          valorMinimoPedido = String(row.VALOR_MINIMO_PEDIDO).replace(',', '.');
        }

        return {
          item_tipo: item.item_tipo,
          item_referencia_id: item.item_referencia_id,
          disponivel: parseDisponivel(row.DISPONIVEL),
          preco: row.PRECO ? String(row.PRECO).replace(',', '.') : '',
          prazo: row.PRAZO || '',
          observacao: `Importado via planilha por ${cotacaoFornecedor.fornecedor?.nome || 'fornecedor'}`,
          quantidade_minima_item:
            row.QUANTIDADE_MINIMA_ITEM && String(row.QUANTIDADE_MINIMA_ITEM).trim() !== ''
              ? String(row.QUANTIDADE_MINIMA_ITEM).replace(',', '.')
              : ''
        };
      });

      await salvarRespostasCotacao(cotacaoFornecedor, itensResposta, {
        valor_minimo_pedido: valorMinimoPedido
      });
      const atualizada = await carregarCotacaoPorToken(token);
      return res.status(201).json(await serializarCotacaoPublica(atualizada, req));
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao importar arquivo de cotacao', {
        status: 400
      });
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
  },

  async modeloXlsx(req, res) {
    try {
      const cotacaoFornecedor = await carregarCotacaoPorToken(req.params.token);
      if (!cotacaoFornecedor) {
        return res.status(404).json({ error: 'Cotacao nao encontrada' });
      }

      const buffer = gerarModeloCotacaoXlsx(cotacaoFornecedor.solicitacao);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="cotacao-${cotacaoFornecedor.id}.xlsx"`
      );
      return res.send(buffer);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao gerar modelo Excel da cotacao' });
    }
  }
};
