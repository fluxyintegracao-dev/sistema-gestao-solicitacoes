const path = require('path');
const jwt = require('jsonwebtoken');
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
  Unidade,
  User
} = require('../models');
const { env } = require('../config/env');
const {
  gerarModeloCotacaoCsv,
  gerarModeloCotacaoXlsx,
  normalizeText,
  obterItensCotaveis,
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

function isImagemCotacaoExtension(extension) {
  return ['.png', '.jpg', '.jpeg'].includes(String(extension || '').toLowerCase());
}

function isArquivoRespostaCotacaoExtension(extension) {
  return ['.pdf', '.png', '.jpg', '.jpeg'].includes(String(extension || '').toLowerCase());
}

function getTipoArquivoResposta(extension) {
  const normalized = String(extension || '').toLowerCase();
  if (normalized === '.pdf') return 'PDF';
  if (isImagemCotacaoExtension(normalized)) return 'IMAGEM';
  return 'ARQUIVO';
}

function getNomeTipoArquivoResposta(tipo = 'ARQUIVO') {
  if (tipo === 'PDF') return 'PDF';
  if (tipo === 'IMAGEM') return 'imagem';
  return 'arquivo';
}

async function identificarUsuarioInternoOpcional(req) {
  try {
    const authHeader = String(req.headers?.authorization || '').trim();
    const cookieToken = String(req.cookies?.[env.authCookieName] || '').trim();
    let token = null;

    if (authHeader) {
      const [scheme, headerToken] = authHeader.split(' ');
      if (String(scheme || '').toLowerCase() === 'bearer' && headerToken) {
        token = headerToken;
      }
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    const usuario = await User.findByPk(decoded.id, {
      attributes: ['id', 'nome', 'email', 'ativo']
    });

    if (!usuario || usuario.ativo === false) {
      return null;
    }

    return usuario;
  } catch {
    return null;
  }
}

function normalizarValorMinimoPedido(value) {
  if (value === '' || value === null || value === undefined) {
    throw new Error('Informe o VLR minimo pedido.');
  }

  const raw = String(value).trim();
  const normalized = raw.includes(',')
    ? Number(raw.replace(/\./g, '').replace(',', '.'))
    : Number(raw);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error('Valor minimo do pedido invalido.');
  }

  return normalized;
}

function normalizarCampoObrigatorio(value, label) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`Informe ${label}.`);
  }

  return normalized;
}

function formatarDataPublica(value) {
  if (!value) return '-';
  const raw = String(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
}

function formatarQuantidadePublica(value, unidade) {
  const numeric = Number(value);
  const formatted = Number.isFinite(numeric)
    ? numeric.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
    : '-';
  return unidade ? `${formatted} ${unidade}` : formatted;
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
  const arquivoRespostaUrl = await resolvePublicAttachmentUrl(req, cotacaoFornecedor?.pdf_resposta_url);
  const arquivoRespostaExtension = path.extname(String(cotacaoFornecedor?.pdf_resposta_url || '').split('?')[0]).toLowerCase();
  const arquivoRespostaTipo = arquivoRespostaUrl ? getTipoArquivoResposta(arquivoRespostaExtension) : null;
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
      prazo_entrega: cotacaoFornecedor?.prazo_entrega || '',
      valor_minimo_pedido: cotacaoFornecedor?.valor_minimo_pedido ?? '',
      condicao_pagamento: cotacaoFornecedor?.condicao_pagamento || '',
      observacao_resposta: cotacaoFornecedor?.observacao_resposta || '',
      pdf_resposta_url: arquivoRespostaUrl || null,
      arquivo_resposta_url: arquivoRespostaUrl || null,
      arquivo_resposta_tipo: arquivoRespostaTipo,
      arquivo_resposta_is_image: Boolean(arquivoRespostaUrl && arquivoRespostaTipo === 'IMAGEM')
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
  const valorMinimoPedido = normalizarValorMinimoPedido(options.valor_minimo_pedido);
  const condicaoPagamento = normalizarCampoObrigatorio(options.condicao_pagamento, 'a condicao de pagamento');
  const prazoEntrega = normalizarCampoObrigatorio(options.prazo_entrega, 'o prazo de entrega');
  const observacaoResposta = String(options.observacao_resposta || '').trim() || null;

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
    condicao_pagamento: condicaoPagamento,
    prazo_entrega: prazoEntrega,
    observacao_resposta: observacaoResposta
  });

  const usuarioInterno = options.usuario_interno || null;
  await registrarLogSolicitacaoCompra({
    solicitacaoCompraId: cotacaoFornecedor.solicitacao.id,
    usuarioId: usuarioInterno?.id || null,
    fornecedorCompraId: cotacaoFornecedor.fornecedor_compra_id,
    tipoAcao: usuarioInterno ? 'RESPOSTA_INTERNA_COMPRAS' : 'RESPOSTA_FORNECEDOR',
    descricao: usuarioInterno
      ? `Usuario interno ${usuarioInterno.nome || usuarioInterno.id} preencheu a cotacao do fornecedor ${cotacaoFornecedor.fornecedor?.nome || cotacaoFornecedor.fornecedor_compra_id}`
      : `Fornecedor ${cotacaoFornecedor.fornecedor?.nome || cotacaoFornecedor.fornecedor_compra_id} respondeu a cotacao`,
    metadados: {
      cotacao_fornecedor_id: cotacaoFornecedor.id,
      quantidade_itens: respostasPreparadas.length,
      origem_resposta: usuarioInterno ? 'INTERNA' : 'FORNECEDOR',
      usuario_interno_id: usuarioInterno?.id || null,
      usuario_interno_nome: usuarioInterno?.nome || null
    }
  });
}

async function registrarRespostaArquivoCotacao(cotacaoFornecedor, req, tipoArquivo = 'ARQUIVO', options = {}) {
  const url = await uploadToS3(req.file, `cotacoes-respostas/${String(tipoArquivo || 'arquivo').toLowerCase()}`);
  await cotacaoFornecedor.update({
    visualizado_em: cotacaoFornecedor.visualizado_em || new Date(),
    pdf_resposta_url: url
  });
  const usuarioInterno = options.usuario_interno || null;
  await registrarLogSolicitacaoCompra({
    solicitacaoCompraId: cotacaoFornecedor.solicitacao.id,
    usuarioId: usuarioInterno?.id || null,
    fornecedorCompraId: cotacaoFornecedor.fornecedor_compra_id,
    tipoAcao: usuarioInterno ? 'ANEXO_RESPOSTA_INTERNA' : 'ANEXO_RESPOSTA_FORNECEDOR',
    descricao: usuarioInterno
      ? `Usuario interno ${usuarioInterno.nome || usuarioInterno.id} anexou ${getNomeTipoArquivoResposta(tipoArquivo)} para o fornecedor ${cotacaoFornecedor.fornecedor?.nome || cotacaoFornecedor.fornecedor_compra_id}`
      : `Fornecedor ${cotacaoFornecedor.fornecedor?.nome || cotacaoFornecedor.fornecedor_compra_id} anexou ${getNomeTipoArquivoResposta(tipoArquivo)} na cotacao`,
    metadados: {
      cotacao_fornecedor_id: cotacaoFornecedor.id,
      tipo: tipoArquivo,
      arquivo_nome: req.file?.originalname || null,
      origem_resposta: usuarioInterno ? 'INTERNA' : 'FORNECEDOR',
      usuario_interno_id: usuarioInterno?.id || null,
      usuario_interno_nome: usuarioInterno?.nome || null
    }
  });
  return url;
}

async function renderPdfCotacaoPublica(doc, cotacaoFornecedor) {
  const solicitacao = cotacaoFornecedor?.solicitacao || {};
  const itensCotaveis = obterItensCotaveis(solicitacao);

  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .text('Cotacao de compra', { align: 'left' });

  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(10);
  doc.text(`Fornecedor: ${cotacaoFornecedor?.fornecedor?.nome || '-'}`);
  doc.text(`Obra: ${solicitacao?.obra?.nome || '-'}`);
  doc.text(`Solicitacao: SC-${String(solicitacao?.id || '').padStart(5, '0')}`);
  doc.text(`Enviado em: ${formatarDataPublica(cotacaoFornecedor?.enviado_em)}`);
  doc.moveDown();

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('Itens solicitados');
  doc.moveDown(0.4);

  itensCotaveis.forEach((item, index) => {
    const titulo = `${index + 1}. ${item.nome || '-'}`;
    doc.font('Helvetica-Bold').fontSize(10).text(titulo);
    doc.font('Helvetica').fontSize(9);
    doc.text(`Quantidade: ${formatarQuantidadePublica(item.quantidade, item.unidade)}`);
    doc.text(`Necessario para: ${formatarDataPublica(item.necessario_para)}`);
    if (item.especificacao) doc.text(`Especificacao: ${item.especificacao}`);
    if (item.link_produto) doc.text(`Link: ${item.link_produto}`);
    doc.moveDown(0.5);
  });

  doc.moveDown();
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#64748b')
    .text('O fornecedor pode responder pelo formulario online ou anexar PDF/imagem da cotacao no portal.');
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

      const usuarioInterno = await identificarUsuarioInternoOpcional(req);
      if (normalizeText(cotacaoFornecedor.status) === 'RESPONDIDO' && !usuarioInterno) {
        return res.status(400).json({
          error: 'Esta cotacao ja foi respondida. Para alterar a resposta, fale com a equipe de compras.'
        });
      }

      const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
      if (!itens.length && !cotacaoFornecedor.pdf_resposta_url) {
        return res.status(400).json({ error: 'Informe ao menos um item ou anexe um arquivo de cotacao.' });
      }

      await salvarRespostasCotacao(cotacaoFornecedor, itens, {
        valor_minimo_pedido: req.body?.valor_minimo_pedido,
        condicao_pagamento: req.body?.condicao_pagamento,
        prazo_entrega: req.body?.prazo_entrega,
        observacao_resposta: req.body?.observacao_resposta,
        usuario_interno: usuarioInterno
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
      const extensoesPermitidas = ['.pdf', '.png', '.jpg', '.jpeg'];
      if (extension && !extensoesPermitidas.includes(extension)) {
        return res.status(400).json({
          error: 'Formato invalido. Envie um arquivo PDF ou imagem.'
        });
      }

      const cotacaoFornecedor = await carregarCotacaoPorToken(token);
      if (!cotacaoFornecedor) {
        return res.status(404).json({ error: 'Cotacao nao encontrada' });
      }

      if (normalizeText(cotacaoFornecedor.solicitacao?.status) === 'ENCERRADO') {
        return res.status(400).json({ error: 'Cotacao encerrada. Nao e mais possivel responder.' });
      }

      const tipoArquivo = getTipoArquivoResposta(extension);
      const usuarioInterno = await identificarUsuarioInternoOpcional(req);
      await registrarRespostaArquivoCotacao(cotacaoFornecedor, req, tipoArquivo, {
        usuario_interno: usuarioInterno
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
  },

  async pdf(req, res) {
    try {
      const cotacaoFornecedor = await carregarCotacaoPorToken(req.params.token);
      if (!cotacaoFornecedor) {
        return res.status(404).json({ error: 'Cotacao nao encontrada' });
      }

      let PDFDocument;
      try {
        PDFDocument = require('pdfkit');
      } catch (error) {
        return res.status(500).json({ error: 'Dependencia pdfkit nao instalada no backend' });
      }

      const doc = new PDFDocument({ margin: 42, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="cotacao-${cotacaoFornecedor.id}.pdf"`);
      doc.pipe(res);
      await renderPdfCotacaoPublica(doc, cotacaoFornecedor);
      doc.end();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao gerar PDF da cotacao' });
    }
  }
};
