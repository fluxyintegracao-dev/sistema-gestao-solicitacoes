const path = require('path');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const {
  Apropriacao,
  ConfiguracaoSistema,
  FornecedorCompra,
  Insumo,
  Obra,
  PedidoCompra,
  SolicitacaoCompra,
  SolicitacaoCompraFornecedor,
  SolicitacaoCompraFornecedorItem,
  SolicitacaoCompraItem,
  SolicitacaoCompraItemApropriacao,
  SolicitacaoCompraItemManual,
  SolicitacaoCompraItemManualApropriacao,
  SolicitacaoCompraRespostaItem,
  Unidade,
  User,
  sequelize
} = require('../models');
const { env } = require('../config/env');
const {
  assertCotacaoFornecedorAtiva,
  assertSolicitacaoCompraAceitaCotacao,
  gerarModeloCotacaoCsv,
  gerarModeloCotacaoXlsx,
  isCotacaoFornecedorCancelada,
  isSolicitacaoCompraTerminal,
  normalizeText,
  obterItensCotaveisDaCotacao,
  registrarLogSolicitacaoCompra
} = require('../services/comprasCotacao');
const { getPresignedUrl, uploadToS3 } = require('../services/s3');
const {
  canReabrirComprasCotacoes,
  canViewAllComprasScope
} = require('../services/authorizationService');
const { responderErroController } = require('../utils/controllerError');

const CONDICOES_PAGAMENTO_EXIGEM_PRAZO_PADRAO = ['BOLETO', 'CARTAO', 'CHEQUE', 'FATURADO', 'OUTROS'];

function parseJsonArrayOrDefault(value, fallback) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function normalizarCondicoesPagamentoExigemPrazo(value) {
  const permitidas = new Set(['PIX', 'BOLETO', 'TRANSFERENCIA', 'CARTAO', 'CHEQUE', 'DINHEIRO', 'FATURADO', 'OUTROS']);
  return [...new Set(
    parseJsonArrayOrDefault(value, CONDICOES_PAGAMENTO_EXIGEM_PRAZO_PADRAO)
      .map((item) => String(item || '').trim().toUpperCase())
      .filter((item) => permitidas.has(item))
  )];
}

async function obterConfiguracaoPublicaCotacao() {
  const registro = await ConfiguracaoSistema.findOne({
    where: { chave: 'COTACOES_CONDICOES_PAGAMENTO_EXIGEM_PRAZO' },
    order: [['id', 'DESC']]
  });

  return {
    condicoes_pagamento_exigem_prazo: normalizarCondicoesPagamentoExigemPrazo(registro?.valor)
  };
}

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
    return null;
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

function normalizarDescontoTotal(value) {
  if (value === '' || value === null || value === undefined) {
    return 0;
  }

  const raw = String(value).trim();
  const normalized = raw.includes(',')
    ? Number(raw.replace(/\./g, '').replace(',', '.'))
    : Number(raw);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error('Desconto concedido invalido.');
  }

  return Number(normalized.toFixed(2));
}

function normalizarNumeroCotacao(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const raw = String(value).trim().replace(/[^\d,.-]/g, '');
  const normalized = raw.includes(',')
    ? Number(raw.replace(/\./g, '').replace(',', '.'))
    : Number(raw);

  return Number.isFinite(normalized) ? normalized : NaN;
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
        as: 'respostas',
        where: { deleted_at: null },
        required: false
      },
      {
        model: SolicitacaoCompraFornecedorItem,
        as: 'itensSelecionados',
        required: false
      }
    ]
  });
}

async function serializarCotacaoPublica(cotacaoFornecedor, req) {
  const itensCotaveis = obterItensCotaveisDaCotacao(cotacaoFornecedor);
  const configuracoes = await obterConfiguracaoPublicaCotacao();
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

  const somenteLeitura = isSolicitacaoCompraTerminal(cotacaoFornecedor?.solicitacao?.status)
    || isCotacaoFornecedorCancelada(cotacaoFornecedor?.status);

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
      desconto_total: cotacaoFornecedor?.desconto_total ?? 0,
      condicao_pagamento: cotacaoFornecedor?.condicao_pagamento || '',
      observacao_resposta: cotacaoFornecedor?.observacao_resposta || '',
      pdf_resposta_url: arquivoRespostaUrl || null,
      arquivo_resposta_url: arquivoRespostaUrl || null,
      arquivo_resposta_tipo: arquivoRespostaTipo,
      arquivo_resposta_is_image: Boolean(arquivoRespostaUrl && arquivoRespostaTipo === 'IMAGEM')
    },
    configuracoes,
    somente_leitura: somenteLeitura,
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
  const itensCotaveis = obterItensCotaveisDaCotacao(cotacaoFornecedor);
  const itensPorKey = new Map(
    itensCotaveis.map((item) => [buildItemKey(item.item_tipo, item.item_referencia_id), item])
  );

  const respostasPreparadas = [];
  const isRascunho = options.rascunho === true;
  const valorMinimoPedido = normalizarValorMinimoPedido(options.valor_minimo_pedido);
  const descontoTotal = normalizarDescontoTotal(options.desconto_total);
  const condicaoPagamento = isRascunho
    ? String(options.condicao_pagamento || '').trim() || null
    : normalizarCampoObrigatorio(options.condicao_pagamento, 'a condicao de pagamento');
  const prazoEntrega = isRascunho
    ? String(options.prazo_entrega || '').trim() || null
    : normalizarCampoObrigatorio(options.prazo_entrega, 'o prazo de entrega');
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
    const precoNormalizado = normalizarNumeroCotacao(itemResposta.preco);

    if (precoNormalizado !== null && !Number.isFinite(precoNormalizado)) {
      throw new Error(`Preco invalido informado para o item ${itemBase.nome}`);
    }

    if (precoNormalizado !== null && precoNormalizado < 0) {
      throw new Error(`Preco nao pode ser negativo no item ${itemBase.nome}`);
    }

    const quantidadeMinima = normalizarNumeroCotacao(itemResposta.quantidade_minima_item);

    if (quantidadeMinima !== null && (!Number.isFinite(quantidadeMinima) || quantidadeMinima < 0)) {
      throw new Error(`Quantidade minima invalida para o item ${itemBase.nome}`);
    }

    const statusEfetivo = isRascunho
      ? statusDisponibilidade
      : (
          statusDisponibilidade !== 'NAO_TEM'
            && (precoNormalizado === null || precoNormalizado <= 0)
            ? 'NAO_TEM'
            : statusDisponibilidade
        );
    const disponivel = statusEfetivo !== 'NAO_TEM';

    respostasPreparadas.push({
      solicitacao_compra_fornecedor_id: cotacaoFornecedor.id,
      item_tipo: itemTipo,
      solicitacao_compra_item_id:
        itemTipo === 'CADASTRADO' ? itemReferenciaId : null,
      solicitacao_compra_item_manual_id:
        itemTipo === 'MANUAL' ? itemReferenciaId : null,
      disponivel,
      status_disponibilidade: statusEfetivo,
      data_chegada: itemResposta.data_chegada || null,
      preco: disponivel ? precoNormalizado : null,
      prazo: itemResposta.prazo ? String(itemResposta.prazo).trim() : null,
      observacao: itemResposta.observacao ? String(itemResposta.observacao).trim() : null,
      quantidade_minima_item: disponivel ? quantidadeMinima : null,
      vencedor: false
    });
  }

  const usuarioInterno = options.usuario_interno || null;
  const transaction = await sequelize.transaction();
  try {
    const cotacaoTravada = await SolicitacaoCompraFornecedor.findByPk(cotacaoFornecedor.id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!cotacaoTravada) {
      throw new Error('Cotacao nao encontrada.');
    }

    const solicitacaoTravada = await SolicitacaoCompra.findByPk(cotacaoTravada.solicitacao_compra_id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!solicitacaoTravada) {
      throw new Error('Solicitacao de compra nao encontrada.');
    }

    assertSolicitacaoCompraAceitaCotacao(
      solicitacaoTravada,
      isRascunho ? 'salvar rascunho' : 'registrar resposta'
    );
    assertCotacaoFornecedorAtiva(
      cotacaoTravada,
      isRascunho ? 'salvar rascunho' : 'registrar resposta'
    );

    if (normalizeText(cotacaoTravada.status) === 'RESPONDIDO' && !usuarioInterno) {
      throw new Error('Esta cotacao ja foi respondida. Para alterar a resposta, fale com a equipe de compras.');
    }

    const respostasAnteriores = await SolicitacaoCompraRespostaItem.findAll({
      where: { solicitacao_compra_fornecedor_id: cotacaoFornecedor.id, deleted_at: null },
      attributes: [
        'id',
        'item_tipo',
        'solicitacao_compra_item_id',
        'solicitacao_compra_item_manual_id',
        'status_disponibilidade',
        'disponivel',
        'preco',
        'prazo',
        'quantidade_minima_item'
      ],
      transaction
    });
    const statusAnteriorCotacao = cotacaoTravada.status;

    await SolicitacaoCompraRespostaItem.update(
      { deleted_at: new Date() },
      {
        where: { solicitacao_compra_fornecedor_id: cotacaoFornecedor.id, deleted_at: null },
        transaction
      }
    );

    if (respostasPreparadas.length) {
      await SolicitacaoCompraRespostaItem.bulkCreate(respostasPreparadas, { transaction });
    }

    await cotacaoTravada.update({
      status: isRascunho ? 'RASCUNHO' : 'RESPONDIDO',
      respondido_em: isRascunho ? cotacaoTravada.respondido_em : new Date(),
      visualizado_em: cotacaoTravada.visualizado_em || new Date(),
      valor_minimo_pedido: valorMinimoPedido,
      desconto_total: descontoTotal,
      condicao_pagamento: condicaoPagamento,
      prazo_entrega: prazoEntrega,
      observacao_resposta: observacaoResposta
    }, { transaction });

    await registrarLogSolicitacaoCompra({
      solicitacaoCompraId: cotacaoFornecedor.solicitacao.id,
      usuarioId: usuarioInterno?.id || null,
      fornecedorCompraId: cotacaoFornecedor.fornecedor_compra_id,
      tipoAcao: isRascunho
        ? (usuarioInterno ? 'RASCUNHO_RESPOSTA_INTERNA' : 'RASCUNHO_RESPOSTA_FORNECEDOR')
        : (usuarioInterno ? 'RESPOSTA_INTERNA_COMPRAS' : 'RESPOSTA_FORNECEDOR'),
      descricao: isRascunho
        ? (usuarioInterno
            ? `Usuario interno ${usuarioInterno.nome || usuarioInterno.id} salvou rascunho da cotacao do fornecedor ${cotacaoFornecedor.fornecedor?.nome || cotacaoFornecedor.fornecedor_compra_id}`
            : `Fornecedor ${cotacaoFornecedor.fornecedor?.nome || cotacaoFornecedor.fornecedor_compra_id} salvou rascunho da cotacao`)
        : (usuarioInterno
            ? `Usuario interno ${usuarioInterno.nome || usuarioInterno.id} preencheu a cotacao do fornecedor ${cotacaoFornecedor.fornecedor?.nome || cotacaoFornecedor.fornecedor_compra_id}`
            : `Fornecedor ${cotacaoFornecedor.fornecedor?.nome || cotacaoFornecedor.fornecedor_compra_id} respondeu a cotacao`),
      metadados: {
        cotacao_fornecedor_id: cotacaoFornecedor.id,
        quantidade_itens: respostasPreparadas.length,
        rascunho: isRascunho,
        status_anterior: statusAnteriorCotacao,
        status_novo: isRascunho ? 'RASCUNHO' : 'RESPONDIDO',
        origem_resposta: usuarioInterno ? 'INTERNA' : 'FORNECEDOR',
        usuario_interno_id: usuarioInterno?.id || null,
        usuario_interno_nome: usuarioInterno?.nome || null,
        respostas_anteriores: respostasAnteriores.map((item) => item.toJSON()),
        respostas_novas: respostasPreparadas
      },
      transaction
    });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
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

function pdfText(value, fallback = '-') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function pdfMoneyPlaceholder() {
  return 'R$';
}

function drawPdfCell(doc, text, x, y, width, height, options = {}) {
  const {
    align = 'left',
    valign = 'middle',
    font = 'Helvetica',
    fontSize = 7,
    color = '#111827',
    paddingX = 4,
    paddingY = 3
  } = options;

  const availableWidth = Math.max(4, width - paddingX * 2);
  const value = pdfText(text);
  doc.font(font).fontSize(fontSize).fillColor(color);
  const textHeight = doc.heightOfString(value, { width: availableWidth, align });
  const top =
    valign === 'top'
      ? y + paddingY
      : y + Math.max(paddingY, (height - textHeight) / 2);

  doc.text(value, x + paddingX, top, {
    width: availableWidth,
    align,
    lineGap: 0.5
  });
}

function drawPdfInfoBox(doc, x, y, width, label, value) {
  const height = 30;
  doc.roundedRect(x, y, width, height, 4).stroke('#cbd5e1');
  doc
    .font('Helvetica-Bold')
    .fontSize(6.5)
    .fillColor('#64748b')
    .text(label, x + 6, y + 5, { width: width - 12 });
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#111827')
    .text(pdfText(value), x + 6, y + 16, { width: width - 12 });
}

function drawPdfCotacaoHeader(doc, cotacaoFornecedor, solicitacao, metrics) {
  const { left, top, width } = metrics;
  const titleHeight = 48;

  doc.rect(left, top, width, titleHeight).fillAndStroke('#eaf2ff', '#c7d7ee');
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#0f172a')
    .text('COTACAO DE COMPRA', left + 14, top + 10, { width: width - 28 });
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#475569')
    .text(
      'Use este PDF para conferir os itens solicitados. O formulario online e opcional: voce tambem pode enviar uma proposta em PDF ou imagem pelo portal.',
      left + 14,
      top + 30,
      { width: width - 28 }
    );

  const gap = 8;
  const yInfo = top + titleHeight + 8;
  const colWidth = (width - gap * 3) / 4;
  drawPdfInfoBox(doc, left, yInfo, colWidth, 'FORNECEDOR', cotacaoFornecedor?.fornecedor?.nome || '-');
  drawPdfInfoBox(doc, left + (colWidth + gap), yInfo, colWidth, 'OBRA', solicitacao?.obra?.nome || '-');
  drawPdfInfoBox(
    doc,
    left + (colWidth + gap) * 2,
    yInfo,
    colWidth,
    'SOLICITACAO',
    `SC-${String(solicitacao?.id || '').padStart(5, '0')}`
  );
  drawPdfInfoBox(
    doc,
    left + (colWidth + gap) * 3,
    yInfo,
    colWidth,
    'ENVIADO EM',
    formatarDataPublica(cotacaoFornecedor?.enviado_em)
  );

  const observacao = pdfText(solicitacao?.observacoes, '');
  if (!observacao) {
    return yInfo + 38;
  }

  const yObs = yInfo + 38;
  const obsHeight = Math.max(
    28,
    doc.font('Helvetica').fontSize(7.2).heightOfString(observacao, { width: width - 96 }) + 14
  );
  doc.roundedRect(left, yObs, width, obsHeight, 4).fillAndStroke('#fff7ed', '#fed7aa');
  doc
    .font('Helvetica-Bold')
    .fontSize(7)
    .fillColor('#9a3412')
    .text('OBSERVACAO', left + 8, yObs + 7, { width: 76 });
  doc
    .font('Helvetica')
    .fontSize(7.2)
    .fillColor('#431407')
    .text(observacao, left + 88, yObs + 7, { width: width - 96 });

  return yObs + obsHeight + 8;
}

function drawPdfCotacaoTableHeader(doc, y, columns, metrics) {
  const { left, width } = metrics;
  const headerHeight = 18;
  doc.rect(left, y, width, headerHeight).fillAndStroke('#dbe7f7', '#94a3b8');

  let x = left;
  columns.forEach((column) => {
    doc.rect(x, y, column.width, headerHeight).stroke('#94a3b8');
    drawPdfCell(doc, column.label, x, y, column.width, headerHeight, {
      align: column.align || 'center',
      font: 'Helvetica-Bold',
      fontSize: 6.4,
      color: '#0f172a'
    });
    x += column.width;
  });

  return y + headerHeight;
}

function measureCotacaoRowHeight(doc, item, columns) {
  const values = [
    item.nome || '-',
    formatarQuantidadePublica(item.quantidade, item.unidade),
    formatarDataPublica(item.necessario_para),
    item.especificacao || '-',
    item.link_produto || item.arquivo_nome_original || '-',
    pdfMoneyPlaceholder(),
    '',
    '',
    '',
    ''
  ];

  doc.font('Helvetica').fontSize(6.8);
  const maxTextHeight = values.reduce((max, value, index) => {
    const cellHeight = doc.heightOfString(pdfText(value), {
      width: Math.max(4, columns[index].width - 8),
      align: columns[index].align || 'left'
    });
    return Math.max(max, cellHeight);
  }, 0);

  return Math.max(24, Math.ceil(maxTextHeight + 10));
}

function drawPdfCotacaoFooter(doc, metrics, pageNumber) {
  const { left, bottom, width } = metrics;
  doc
    .font('Helvetica')
    .fontSize(6.5)
    .fillColor('#64748b')
    .text(`Cotacao gerada pelo Fluxy - Pagina ${pageNumber}`, left, bottom - 10, {
      width,
      align: 'right'
    });
}

async function renderPdfCotacaoPublica(doc, cotacaoFornecedor) {
  const solicitacao = cotacaoFornecedor?.solicitacao || {};
  const itensCotaveis = obterItensCotaveisDaCotacao(cotacaoFornecedor);
  const metrics = {
    left: 28,
    top: 28,
    width: doc.page.width - 56,
    bottom: doc.page.height - 34
  };
  const columns = [
    { label: 'ITEM', width: 124 },
    { label: 'QTD./UN.', width: 52, align: 'center' },
    { label: 'NECESSARIO', width: 58, align: 'center' },
    { label: 'ESPECIFICACAO', width: 150 },
    { label: 'REFERENCIA', width: 104 },
    { label: 'PRECO UNIT.', width: 56, align: 'center' },
    { label: 'PRAZO', width: 48, align: 'center' },
    { label: 'QTD. MIN.', width: 46, align: 'center' },
    { label: 'DISP.', width: 40, align: 'center' },
    { label: 'OBS.', width: 102 }
  ];

  let pageNumber = 1;
  let y = drawPdfCotacaoHeader(doc, cotacaoFornecedor, solicitacao, metrics);
  y = drawPdfCotacaoTableHeader(doc, y, columns, metrics);

  itensCotaveis.forEach((item) => {
    const rowHeight = measureCotacaoRowHeight(doc, item, columns);
    if (y + rowHeight + 28 > metrics.bottom) {
      drawPdfCotacaoFooter(doc, metrics, pageNumber);
      doc.addPage({ margin: 28, size: 'A4', layout: 'landscape' });
      pageNumber += 1;
      y = drawPdfCotacaoTableHeader(doc, metrics.top, columns, metrics);
    }

    let x = metrics.left;
    const values = [
      item.nome || '-',
      formatarQuantidadePublica(item.quantidade, item.unidade),
      formatarDataPublica(item.necessario_para),
      item.especificacao || '-',
      item.link_produto || item.arquivo_nome_original || '-',
      pdfMoneyPlaceholder(),
      '',
      '',
      '',
      ''
    ];

    columns.forEach((column, index) => {
      doc.rect(x, y, column.width, rowHeight).stroke('#cbd5e1');
      drawPdfCell(doc, values[index], x, y, column.width, rowHeight, {
        align: column.align || 'left',
        valign: index >= 5 ? 'top' : 'middle',
        font: index === 0 ? 'Helvetica-Bold' : 'Helvetica',
        fontSize: index === 0 ? 7 : 6.8,
        color: '#111827'
      });
      x += column.width;
    });

    y += rowHeight;
  });

  if (!itensCotaveis.length) {
    doc.rect(metrics.left, y, metrics.width, 34).stroke('#cbd5e1');
    drawPdfCell(doc, 'Nenhum item cotavel encontrado para esta solicitacao.', metrics.left, y, metrics.width, 34, {
      align: 'center',
      fontSize: 8,
      color: '#64748b'
    });
    y += 34;
  }

  const instructionsHeight = 44;
  if (y + instructionsHeight + 28 > metrics.bottom) {
    drawPdfCotacaoFooter(doc, metrics, pageNumber);
    doc.addPage({ margin: 28, size: 'A4', layout: 'landscape' });
    pageNumber += 1;
    y = metrics.top;
  } else {
    y += 10;
  }

  doc.roundedRect(metrics.left, y, metrics.width, instructionsHeight, 4).fillAndStroke('#f8fafc', '#cbd5e1');
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor('#0f172a')
    .text('Como responder', metrics.left + 10, y + 8, { width: metrics.width - 20 });
  doc
    .font('Helvetica')
    .fontSize(7.2)
    .fillColor('#475569')
    .text(
      'Preencha os valores no formulario online pelo link recebido ou envie sua proposta em PDF/imagem pelo portal. Os campos de preco, prazo, quantidade minima, disponibilidade e observacao podem ser usados como guia para montar a resposta.',
      metrics.left + 10,
      y + 21,
      { width: metrics.width - 20 }
    );

  drawPdfCotacaoFooter(doc, metrics, pageNumber);
}

module.exports = {
  async index(req, res) {
    try {
      const { q, status, obra_id } = req.query;
      const where = {};
      const solicitacaoWhere = {};

      if (status) {
        where.status = String(status).toUpperCase();
      }

      if (obra_id) {
        solicitacaoWhere.obra_id = obra_id;
      } else if (Array.isArray(req.compraScopeObraIds)) {
        solicitacaoWhere.obra_id = req.compraScopeObraIds.length
          ? { [Op.in]: req.compraScopeObraIds }
          : -1;
      }

      if (!(await canViewAllComprasScope(req.user))) {
        solicitacaoWhere[Op.or] = [
          { comprador_responsavel_id: req.user.id },
          { solicitante_id: req.user.id }
        ];
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
            attributes: ['id', 'titulo', 'status', 'comprador_responsavel_id', 'solicitante_id'],
            include: [
              { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo'] }
            ],
            where: solicitacaoWhere,
            required: true
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

      const cotacaoSomenteLeitura = isSolicitacaoCompraTerminal(cotacaoFornecedor.solicitacao?.status)
        || isCotacaoFornecedorCancelada(cotacaoFornecedor.status);

      if (!cotacaoSomenteLeitura && !cotacaoFornecedor.visualizado_em) {
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

      assertSolicitacaoCompraAceitaCotacao(cotacaoFornecedor.solicitacao, 'registrar resposta');
      assertCotacaoFornecedorAtiva(cotacaoFornecedor, 'registrar resposta');

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
        desconto_total: req.body?.desconto_total,
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

  async salvarRascunho(req, res) {
    try {
      const cotacaoFornecedor = await carregarCotacaoPorToken(req.params.token);
      if (!cotacaoFornecedor) {
        return res.status(404).json({ error: 'Cotacao nao encontrada' });
      }

      assertSolicitacaoCompraAceitaCotacao(cotacaoFornecedor.solicitacao, 'salvar rascunho');
      assertCotacaoFornecedorAtiva(cotacaoFornecedor, 'salvar rascunho');

      const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
      if (!itens.length && !cotacaoFornecedor.pdf_resposta_url) {
        return res.status(400).json({ error: 'Informe ao menos um item ou anexe um arquivo de cotacao.' });
      }

      const usuarioInterno = await identificarUsuarioInternoOpcional(req);
      await salvarRespostasCotacao(cotacaoFornecedor, itens, {
        valor_minimo_pedido: req.body?.valor_minimo_pedido,
        desconto_total: req.body?.desconto_total,
        condicao_pagamento: req.body?.condicao_pagamento,
        prazo_entrega: req.body?.prazo_entrega,
        observacao_resposta: req.body?.observacao_resposta,
        usuario_interno: usuarioInterno,
        rascunho: true
      });
      const atualizada = await carregarCotacaoPorToken(req.params.token);
      return res.status(200).json(await serializarCotacaoPublica(atualizada, req));
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao salvar rascunho da cotacao', {
        status: 400
      });
    }
  },

  async cancelarFluxo(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const solicitacao = await SolicitacaoCompra.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!solicitacao) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Solicitacao de compra nao encontrada.' });
      }

      if (normalizeText(solicitacao.origem) === 'COMPRA_DIRETA') {
        await transaction.rollback();
        return res.status(400).json({
          error: 'Compra direta nao utiliza o fluxo de cancelamento de cotacao.'
        });
      }

      assertSolicitacaoCompraAceitaCotacao(solicitacao, 'cancelar a cotacao');

      const pedidosAtivos = await PedidoCompra.count({
        where: {
          solicitacao_compra_id: solicitacao.id,
          status: { [Op.ne]: 'CANCELADO' }
        },
        transaction
      });
      if (pedidosAtivos > 0) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'A cotacao ja possui pedido ativo. Cancele o fluxo a partir do pedido para preservar o financeiro e a auditoria.'
        });
      }

      const cotacoesAtivas = await SolicitacaoCompraFornecedor.findAll({
        where: {
          solicitacao_compra_id: solicitacao.id,
          status: { [Op.notIn]: ['CANCELADA', 'CANCELADO'] }
        },
        attributes: ['id', 'fornecedor_compra_id', 'status', 'respondido_em', 'pdf_resposta_url'],
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!cotacoesAtivas.length) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Nao existe cotacao ativa para cancelar.' });
      }

      const motivo = String(req.body?.motivo || '').trim();
      const cotacaoIds = cotacoesAtivas.map((item) => item.id);
      const respostasCanceladas = await SolicitacaoCompraRespostaItem.update(
        { deleted_at: new Date() },
        {
          where: {
            solicitacao_compra_fornecedor_id: { [Op.in]: cotacaoIds },
            deleted_at: null
          },
          transaction
        }
      );

      await SolicitacaoCompraFornecedor.update(
        { status: 'CANCELADA' },
        { where: { id: { [Op.in]: cotacaoIds } }, transaction }
      );

      const statusAnteriorSolicitacao = solicitacao.status;
      await solicitacao.update(
        {
          status: 'LIBERADO_PARA_COMPRA',
          encerrado_em: null
        },
        { transaction }
      );

      await registrarLogSolicitacaoCompra({
        solicitacaoCompraId: solicitacao.id,
        usuarioId: req.user?.id || null,
        tipoAcao: 'COTACAO_CANCELADA',
        descricao: `Cotacao cancelada pelo usuario interno. Motivo: ${motivo}`,
        metadados: {
          motivo,
          status_solicitacao_anterior: statusAnteriorSolicitacao,
          status_solicitacao_novo: 'LIBERADO_PARA_COMPRA',
          cotacoes: cotacoesAtivas.map((item) => ({
            id: item.id,
            fornecedor_compra_id: item.fornecedor_compra_id,
            status_anterior: item.status,
            respondido_em: item.respondido_em,
            arquivo_resposta_url: item.pdf_resposta_url || null
          })),
          respostas_desativadas: Number(respostasCanceladas?.[0] || 0)
        },
        transaction
      });

      await transaction.commit();
      return res.json({
        ok: true,
        status: 'LIBERADO_PARA_COMPRA',
        cotacoes_canceladas: cotacaoIds.length,
        respostas_desativadas: Number(respostasCanceladas?.[0] || 0)
      });
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return responderErroController(res, error, 'Erro ao cancelar cotacao', { status: 400 });
    }
  },

  async responderInternamente(req, res) {
    try {
      const cotacaoBase = await SolicitacaoCompraFornecedor.findByPk(req.params.cotacaoId, {
        attributes: ['id', 'token', 'solicitacao_compra_id']
      });
      if (!cotacaoBase || Number(cotacaoBase.solicitacao_compra_id) !== Number(req.params.id)) {
        return res.status(404).json({ error: 'Cotacao nao encontrada para esta solicitacao de compra.' });
      }

      const cotacaoFornecedor = await carregarCotacaoPorToken(cotacaoBase.token);
      if (!cotacaoFornecedor) {
        return res.status(404).json({ error: 'Cotacao nao encontrada.' });
      }

      assertSolicitacaoCompraAceitaCotacao(cotacaoFornecedor.solicitacao, 'editar a resposta');
      assertCotacaoFornecedorAtiva(cotacaoFornecedor, 'editar a resposta');

      await salvarRespostasCotacao(cotacaoFornecedor, req.body.itens, {
        valor_minimo_pedido: req.body.valor_minimo_pedido,
        desconto_total: req.body.desconto_total,
        condicao_pagamento: req.body.condicao_pagamento,
        prazo_entrega: req.body.prazo_entrega,
        observacao_resposta: req.body.observacao_resposta,
        usuario_interno: req.user,
        rascunho: req.body.finalizar === false
      });

      const atualizada = await carregarCotacaoPorToken(cotacaoBase.token);
      return res.json(await serializarCotacaoPublica(atualizada, req));
    } catch (error) {
      console.error(error);
      return responderErroController(res, error, 'Erro ao editar resposta da cotacao', { status: 400 });
    }
  },

  async reabrir(req, res) {
    const transaction = await sequelize.transaction();
    try {
      if (!(await canReabrirComprasCotacoes(req.user))) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Acesso negado para reabrir cotacao' });
      }

      const cotacaoFornecedor = await SolicitacaoCompraFornecedor.findByPk(req.params.id, {
        include: [
          {
            model: FornecedorCompra,
            as: 'fornecedor',
            attributes: ['id', 'nome']
          },
          {
            model: SolicitacaoCompra,
            as: 'solicitacao',
            attributes: ['id', 'status']
          }
        ],
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!cotacaoFornecedor) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Cotacao nao encontrada.' });
      }

      assertSolicitacaoCompraAceitaCotacao(cotacaoFornecedor.solicitacao, 'reabrir a cotacao');
      assertCotacaoFornecedorAtiva(cotacaoFornecedor, 'reabrir a cotacao');

      const statusAtual = normalizeText(cotacaoFornecedor.status);
      if (!['RESPONDIDO', 'RASCUNHO'].includes(statusAtual)) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Apenas cotacoes respondidas ou em rascunho podem ser reabertas.' });
      }

      const motivo = String(req.body?.motivo || '').trim() || null;
      await cotacaoFornecedor.update({
        status: 'REABERTA',
        respondido_em: null
      }, { transaction });

      await registrarLogSolicitacaoCompra({
        solicitacaoCompraId: cotacaoFornecedor.solicitacao.id,
        usuarioId: req.user?.id || null,
        fornecedorCompraId: cotacaoFornecedor.fornecedor_compra_id,
        tipoAcao: 'COTACAO_REABERTA',
        descricao: `Cotacao do fornecedor ${cotacaoFornecedor.fornecedor?.nome || cotacaoFornecedor.fornecedor_compra_id} reaberta para nova resposta`,
        metadados: {
          cotacao_fornecedor_id: cotacaoFornecedor.id,
          status_anterior: statusAtual,
          motivo,
          usuario_id: req.user?.id || null,
          usuario_nome: req.user?.nome || null
        },
        transaction
      });

      await transaction.commit();
      return res.json({ ok: true, status: 'REABERTA' });
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return responderErroController(res, error, 'Erro ao reabrir cotacao', {
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

      assertSolicitacaoCompraAceitaCotacao(cotacaoFornecedor.solicitacao, 'anexar resposta');
      assertCotacaoFornecedorAtiva(cotacaoFornecedor, 'anexar resposta');

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

      const csv = gerarModeloCotacaoCsv(cotacaoFornecedor.solicitacao, cotacaoFornecedor.itensSelecionados || []);
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

      const buffer = await gerarModeloCotacaoXlsx(cotacaoFornecedor.solicitacao, cotacaoFornecedor.itensSelecionados || []);
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

      const doc = new PDFDocument({ margin: 28, size: 'A4', layout: 'landscape' });
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
