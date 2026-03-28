const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const {
  Anexo,
  Apropriacao,
  Historico,
  Insumo,
  Obra,
  FornecedorCompra,
  Setor,
  Solicitacao,
  SolicitacaoCompra,
  SolicitacaoCompraFornecedor,
  SolicitacaoCompraItem,
  SolicitacaoCompraItemManual,
  SolicitacaoCompraRespostaItem,
  StatusArea,
  TipoSolicitacao,
  Unidade,
  User
} = require('../models');
const { getPresignedUrl, uploadToS3 } = require('../services/s3');
const gerarCodigoSolicitacao = require('../services/solicitacao/gerarCodigo');
const { normalizeOriginalName } = require('../utils/fileName');
const {
  gerarTokenCotacao,
  montarUrlCotacaoPublica,
  normalizeText: normalizeTextCompra,
  obterItensCotaveis,
  registrarLogSolicitacaoCompra
} = require('../services/comprasCotacao');

const PDF_LOGO_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'frontend',
  'public',
  'CSC_logo_colorida.png'
);
const PDF_PAGE = {
  left: 20,
  top: 12,
  width: 802,
  bottomLimit: 560
};
const PDF_OBSERVACOES_FIXAS =
  'Solicitacoes de insumos com informacoes incompletas, incorretas ou sem a devida clareza para viabilizar a compra nao serao processadas. Leia atentamente as orientacoes destacadas em vermelho nas celulas de preenchimento. Em caso de duvida, solicite apoio antes de enviar e nao encaminhe solicitacoes com erros ou omissoes, pois isso compromete o fluxo de trabalho dos demais setores da empresa. Lembre-se: os outros setores nao estao presentes na obra e dependem exclusivamente da precisao das informacoes fornecidas. Seja claro, objetivo e tecnicamente preciso no preenchimento.';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function formatDate(date) {
  if (!date) {
    return '';
  }

  const raw = String(date);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const value = new Date(date);
  if (Number.isNaN(value.getTime())) {
    return '';
  }

  return value.toLocaleDateString('pt-BR');
}

function isImageAttachment(item) {
  const baseName = String(item?.arquivo_nome_original || item?.arquivo_url || '').split('?')[0].toLowerCase();
  const extension = path.extname(baseName);
  return extension === '.png' || extension === '.jpg' || extension === '.jpeg';
}

async function carregarArquivoBuffer(arquivoUrl) {
  if (!arquivoUrl) {
    return null;
  }

  if (String(arquivoUrl).startsWith('/uploads/')) {
    const localPath = path.resolve(__dirname, '..', '..', arquivoUrl.replace(/^\//, ''));
    try {
      return await fs.promises.readFile(localPath);
    } catch (error) {
      return null;
    }
  }

  try {
    const url = await getPresignedUrl(arquivoUrl);
    if (!url || !String(url).startsWith('http')) {
      return null;
    }

    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    return null;
  }
}

async function obterAnexosVisuaisPdf(linhas) {
  const anexos = await Promise.all(
    linhas.map(async (item, index) => {
      if (!item.arquivo_url || !isImageAttachment(item)) {
        return null;
      }

      const buffer = await carregarArquivoBuffer(item.arquivo_url);
      if (!buffer) {
        return null;
      }

      return {
        index,
        item,
        buffer
      };
    })
  );

  return anexos.filter(Boolean);
}

function renderPaginaAnexosVisuais(doc, anexos) {
  if (!anexos.length) {
    return;
  }

  const marginX = 40;
  const usableWidth = 762;
  const gap = 20;
  const cardWidth = (usableWidth - gap) / 2;
  const cardHeight = 230;
  const imageHeight = 150;
  const pageBottom = 555;

  let y = 40;

  const iniciarPagina = () => {
    doc.addPage({ margin: 40, size: 'A4', layout: 'landscape' });
    doc.rect(40, 40, 762, 28).fillAndStroke('#1e40af', '#1e40af');
    doc
      .fontSize(14)
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .text('ANEXOS VISUAIS DOS ITENS', 40, 49, { width: 762, align: 'center' });
    doc
      .fillColor('#475569')
      .fontSize(8)
      .font('Helvetica')
      .text(
        'Imagens anexadas aos itens da solicitacao para apoio visual da compra.',
        40,
        76,
        { width: 762 }
      );
    y = 100;
  };

  iniciarPagina();

  anexos.forEach((anexo, index) => {
    const column = index % 2;
    const x = marginX + column * (cardWidth + gap);

    if (column === 0 && y + cardHeight > pageBottom) {
      iniciarPagina();
    }

    doc.roundedRect(x, y, cardWidth, cardHeight, 10).stroke('#cbd5e1');
    doc
      .fontSize(10)
      .fillColor('#0f172a')
      .font('Helvetica-Bold')
      .text(`ITEM ${anexo.index + 1} - ${anexo.item.nome}`, x + 12, y + 12, {
        width: cardWidth - 24
      });
    doc
      .fontSize(8)
      .fillColor('#64748b')
      .font('Helvetica')
      .text(anexo.item.arquivo_nome_original || 'Imagem anexada', x + 12, y + 30, {
        width: cardWidth - 24
      });

    doc.roundedRect(x + 12, y + 52, cardWidth - 24, imageHeight, 8).fillAndStroke('#f8fafc', '#e2e8f0');

    try {
      const image = doc.openImage(anexo.buffer);
      doc.image(image, x + 12, y + 52, {
        fit: [cardWidth - 24, imageHeight],
        align: 'center',
        valign: 'center'
      });
    } catch (error) {
      doc
        .fillColor('#94a3b8')
        .fontSize(9)
        .font('Helvetica')
        .text('Nao foi possivel renderizar a imagem anexada.', x + 24, y + 120, {
          width: cardWidth - 48,
          align: 'center'
        });
    }

    doc
      .fillColor('#0f172a')
      .fontSize(8)
      .font('Helvetica')
      .text(`Necessario para: ${formatDate(anexo.item.necessario_para) || '-'}`, x + 12, y + 212, {
        width: cardWidth - 24
      });

    if (column === 1) {
      y += cardHeight + 18;
    }
  });
}

async function carregarUsuarioComPermissao(userId) {
  return User.findByPk(userId, {
    attributes: ['id', 'nome', 'perfil', 'setor_id', 'pode_criar_solicitacao_compra']
  });
}

async function validarAcesso(req, res) {
  const usuario = await carregarUsuarioComPermissao(req.user?.id);

  if (!usuario) {
    res.status(401).json({ error: 'Usuario nao autenticado' });
    return null;
  }

  const perfil = normalizeText(usuario.perfil);
  const tokens = await obterTokensSetorUsuario(usuario);
  const possuiPermissao =
    perfil === 'SUPERADMIN' ||
    perfil === 'ADMIN' ||
    Boolean(usuario.pode_criar_solicitacao_compra) ||
    tokens.has('COMPRAS') ||
    tokens.has('GEO') ||
    tokens.has('GERENCIA DE PROCESSOS') ||
    tokens.has('GESTAO DE PROCESSOS') ||
    tokens.has('GERENCIA_PROCESSOS') ||
    tokens.has('GESTAO_PROCESSOS');

  if (!possuiPermissao) {
    res.status(403).json({ error: 'Acesso negado ao modulo de compras' });
    return null;
  }

  return usuario;
}

async function obterTokensSetorUsuario(usuario) {
  const tokens = new Set([
    normalizeText(usuario?.perfil),
    normalizeText(usuario?.area),
    normalizeText(usuario?.setor?.codigo),
    normalizeText(usuario?.setor?.nome)
  ].filter(Boolean));

  if (usuario?.setor_id) {
    const setor = await Setor.findByPk(usuario.setor_id, {
      attributes: ['codigo', 'nome']
    });

    if (setor?.codigo) tokens.add(normalizeText(setor.codigo));
    if (setor?.nome) tokens.add(normalizeText(setor.nome));
  }

  return tokens;
}

async function validarAcessoIntegracao(usuario) {
  const tokens = await obterTokensSetorUsuario(usuario);
  return (
    tokens.has('SUPERADMIN') ||
    tokens.has('ADMIN') ||
    tokens.has('GEO') ||
    tokens.has('GERENCIA DE PROCESSOS') ||
    tokens.has('GESTAO DE PROCESSOS') ||
    tokens.has('GERENCIA_PROCESSOS') ||
    tokens.has('GESTAO_PROCESSOS')
  );
}

async function validarAcessoCompras(usuario) {
  const tokens = await obterTokensSetorUsuario(usuario);
  return (
    tokens.has('SUPERADMIN') ||
    tokens.has('ADMIN') ||
    tokens.has('COMPRAS')
  );
}

async function buscarTipoSolicitacaoCompra(transaction) {
  const tipos = await TipoSolicitacao.findAll({
    attributes: ['id', 'nome', 'ativo'],
    transaction
  });

  const tipoExistente = tipos.find((tipo) => {
    const nome = normalizeText(tipo.nome);
    return nome === 'SOLICITACAO DE COMPRA' || nome === 'COMPRAS';
  });

  if (tipoExistente) {
    if (!tipoExistente.ativo) {
      await tipoExistente.update({ ativo: true }, { transaction });
    }
    return tipoExistente;
  }

  return TipoSolicitacao.create(
    {
      nome: 'Solicitação de Compra',
      ativo: true
    },
    { transaction }
  );
}

async function buscarSetorDestino(transaction) {
  const setores = await Setor.findAll({
    attributes: ['id', 'codigo', 'nome'],
    transaction
  });

  const setor = setores.find((item) => {
    const codigo = normalizeText(item.codigo);
    const nome = normalizeText(item.nome);

    return (
      codigo === 'GEO' ||
      codigo === 'GERENCIA_PROCESSOS' ||
      codigo === 'GESTAO_PROCESSOS' ||
      nome === 'GEO' ||
      nome === 'GERENCIA DE PROCESSOS' ||
      nome === 'GESTAO DE PROCESSOS'
    );
  });

  return setor ? (setor.codigo || setor.nome) : 'GEO';
}

async function carregarSolicitacaoCompra(id) {
  return SolicitacaoCompra.findByPk(id, {
    include: [
      { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo'] },
      { model: User, as: 'solicitante', attributes: ['id', 'nome', 'email'] },
      { model: Solicitacao, as: 'solicitacaoPrincipal', attributes: ['id', 'codigo', 'area_responsavel', 'status_global'] },
      {
        model: SolicitacaoCompraItem,
        as: 'itens',
        include: [
          { model: Insumo, as: 'insumo', attributes: ['id', 'nome', 'codigo'] },
          { model: Unidade, as: 'unidade', attributes: ['id', 'nome', 'sigla'] },
          { model: Apropriacao, as: 'apropriacao', attributes: ['id', 'codigo', 'descricao', 'obra_id'] }
        ]
      },
      {
        model: SolicitacaoCompraItemManual,
        as: 'itensManuais',
        include: [
          { model: Apropriacao, as: 'apropriacao', attributes: ['id', 'codigo', 'descricao', 'obra_id'] }
        ]
      },
      {
        model: SolicitacaoCompraFornecedor,
        as: 'fornecedores',
        include: [
          {
            model: FornecedorCompra,
            as: 'fornecedor',
            attributes: ['id', 'nome', 'email', 'whatsapp', 'contato', 'ativo']
          },
          {
            model: SolicitacaoCompraRespostaItem,
            as: 'respostas',
            attributes: [
              'id',
              'item_tipo',
              'solicitacao_compra_item_id',
              'solicitacao_compra_item_manual_id',
              'disponivel',
              'preco',
              'prazo',
              'observacao',
              'vencedor'
            ]
          }
        ]
      }
    ]
  });
}

function obterLinhasPdf(solicitacao) {
  const itensNormais = (solicitacao.itens || []).map((item) => ({
    manual: false,
    unidade_manual: Boolean(item.unidade_sigla_manual),
    nome: item.insumo?.nome || '-',
    unidade: item.unidade_sigla_manual || item.unidade?.sigla || '-',
    quantidade: item.quantidade,
    especificacao: item.especificacao || '-',
    apropriacao: item.apropriacao?.codigo || '-',
    necessario_para: item.necessario_para,
    link_produto: item.link_produto || null,
    arquivo_url: item.arquivo_url || null,
    arquivo_nome_original: item.arquivo_nome_original || null
  }));

  const itensManuais = (solicitacao.itensManuais || []).map((item) => ({
    manual: true,
    unidade_manual: true,
    nome: item.nome_manual || '-',
    unidade: item.unidade_sigla_manual || '-',
    quantidade: item.quantidade,
    especificacao: item.especificacao || '-',
    apropriacao: item.apropriacao?.codigo || '-',
    necessario_para: item.necessario_para,
    link_produto: item.link_produto || null,
    arquivo_url: item.arquivo_url || null,
    arquivo_nome_original: item.arquivo_nome_original || null
  }));

  return [...itensNormais, ...itensManuais];
}

function construirTextoMidiaPdf(item) {
  const linhas = [];

  if (item.link_produto) {
    linhas.push(String(item.link_produto));
  }

  if (item.arquivo_nome_original) {
    linhas.push(
      isImageAttachment(item)
        ? `Foto anexada: ${item.arquivo_nome_original}`
        : `Arquivo anexado: ${item.arquivo_nome_original}`
    );
  }

  return linhas.join('\n');
}

function buildRespostaItemKey(itemTipo, itemReferenciaId) {
  return `${normalizeTextCompra(itemTipo)}:${Number(itemReferenciaId)}`;
}

function montarComparativoSolicitacao(solicitacao) {
  const itens = obterItensCotaveis(solicitacao);
  const fornecedores = (solicitacao.fornecedores || []).map((cotacaoFornecedor) => ({
    id: cotacaoFornecedor.id,
    fornecedor_id: cotacaoFornecedor.fornecedor?.id || cotacaoFornecedor.fornecedor_compra_id,
    nome: cotacaoFornecedor.fornecedor?.nome || '-',
    email: cotacaoFornecedor.fornecedor?.email || '',
    whatsapp: cotacaoFornecedor.fornecedor?.whatsapp || '',
    status: cotacaoFornecedor.status,
    token: cotacaoFornecedor.token,
    enviado_em: cotacaoFornecedor.enviado_em,
    visualizado_em: cotacaoFornecedor.visualizado_em,
    respondido_em: cotacaoFornecedor.respondido_em
  }));

  const itensComparativo = itens.map((item) => {
    const respostas = (solicitacao.fornecedores || []).map((cotacaoFornecedor) => {
      const resposta = (cotacaoFornecedor.respostas || []).find((entry) => {
        const itemReferenciaId =
          entry.solicitacao_compra_item_id || entry.solicitacao_compra_item_manual_id;
        return buildRespostaItemKey(entry.item_tipo, itemReferenciaId) ===
          buildRespostaItemKey(item.item_tipo, item.item_referencia_id);
      });

      return {
        cotacao_fornecedor_id: cotacaoFornecedor.id,
        fornecedor_id: cotacaoFornecedor.fornecedor?.id || cotacaoFornecedor.fornecedor_compra_id,
        fornecedor_nome: cotacaoFornecedor.fornecedor?.nome || '-',
        status_fornecedor: cotacaoFornecedor.status,
        resposta_item_id: resposta?.id || null,
        disponivel: Boolean(resposta?.disponivel),
        preco: resposta?.preco ?? null,
        prazo: resposta?.prazo || '',
        observacao: resposta?.observacao || '',
        vencedor: Boolean(resposta?.vencedor)
      };
    });

    const disponiveis = respostas.filter((resposta) => resposta.disponivel && Number(resposta.preco) > 0);
    const melhor = disponiveis.reduce((acc, atual) => {
      if (!acc) return atual;
      return Number(atual.preco) < Number(acc.preco) ? atual : acc;
    }, null);

    return {
      ...item,
      melhor_preco: melhor
        ? {
            fornecedor_id: melhor.fornecedor_id,
            fornecedor_nome: melhor.fornecedor_nome,
            resposta_item_id: melhor.resposta_item_id,
            preco: melhor.preco,
            prazo: melhor.prazo
          }
        : null,
      respostas
    };
  });

  return {
    solicitacao_id: solicitacao.id,
    status: solicitacao.status,
    fornecedores,
    itens: itensComparativo
  };
}

function desenharCabecalhoFicha(doc, solicitacao) {
  const x = PDF_PAGE.left;
  const y = PDF_PAGE.top;
  const logoWidth = 58;
  const titleHeight = 20;
  const infoHeight = 18;
  const metaLabelWidth = 92;
  const metaValueWidth = 110;
  const leftInfoWidth = PDF_PAGE.width - logoWidth - metaLabelWidth - metaValueWidth;
  const totalHeaderHeight = titleHeight + infoHeight * 2;

  doc.lineWidth(0.8);
  doc.rect(x, y, logoWidth, totalHeaderHeight).stroke('#000000');

  if (fs.existsSync(PDF_LOGO_PATH)) {
    try {
      doc.image(PDF_LOGO_PATH, x + 4, y + 4, {
        fit: [logoWidth - 8, totalHeaderHeight - 8],
        align: 'center',
        valign: 'center'
      });
    } catch (error) {
      // ignora a falha e segue com o restante da ficha
    }
  }

  doc.rect(x + logoWidth, y, PDF_PAGE.width - logoWidth, titleHeight).stroke('#000000');
  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor('#000000')
    .text('FICHA PARA PEDIDO DE COMPRA', x + logoWidth, y + 5, {
      width: PDF_PAGE.width - logoWidth,
      align: 'center'
    });

  doc.rect(x + logoWidth, y + titleHeight, leftInfoWidth, infoHeight).stroke('#000000');
  doc.rect(x + logoWidth + leftInfoWidth, y + titleHeight, metaLabelWidth, infoHeight).stroke('#000000');
  doc
    .rect(x + logoWidth + leftInfoWidth + metaLabelWidth, y + titleHeight, metaValueWidth, infoHeight)
    .stroke('#000000');
  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .text('CONSTRUTORA SUL CAPIXABA LTDA', x + logoWidth + 4, y + titleHeight + 5, {
      width: leftInfoWidth - 8
    });
  doc
    .font('Helvetica-Bold')
    .fontSize(7)
    .text('SOLICITANTE', x + logoWidth + leftInfoWidth + 4, y + titleHeight + 5, {
      width: metaLabelWidth - 8
    });
  doc
    .font('Helvetica')
    .fontSize(7.5)
    .text(solicitacao.solicitante?.nome || '-', x + logoWidth + leftInfoWidth + metaLabelWidth + 4, y + titleHeight + 5, {
      width: metaValueWidth - 8
    });

  doc.rect(x + logoWidth, y + titleHeight + infoHeight, leftInfoWidth, infoHeight).stroke('#000000');
  doc
    .rect(x + logoWidth + leftInfoWidth, y + titleHeight + infoHeight, metaLabelWidth, infoHeight)
    .stroke('#000000');
  doc
    .rect(x + logoWidth + leftInfoWidth + metaLabelWidth, y + titleHeight + infoHeight, metaValueWidth, infoHeight)
    .stroke('#000000');
  doc
    .font('Helvetica-Bold')
    .fontSize(7)
    .text(`OBRA: ${String(solicitacao.obra?.nome || '-').toUpperCase()}`, x + logoWidth + 4, y + titleHeight + infoHeight + 5, {
      width: leftInfoWidth - 8
    });
  doc
    .font('Helvetica-Bold')
    .fontSize(7)
    .text('DATA DA SOLICITACAO', x + logoWidth + leftInfoWidth + 4, y + titleHeight + infoHeight + 5, {
      width: metaLabelWidth - 8
    });
  doc
    .font('Helvetica')
    .fontSize(7.5)
    .text(formatDate(solicitacao.createdAt) || '-', x + logoWidth + leftInfoWidth + metaLabelWidth + 4, y + titleHeight + infoHeight + 5, {
      width: metaValueWidth - 8
    });

  return y + totalHeaderHeight + 8;
}

function desenharCabecalhoTabela(doc, y, colWidths, colX) {
  const headerHeight = 18;
  doc.save();
  doc.rect(PDF_PAGE.left, y, PDF_PAGE.width, headerHeight).fillAndStroke('#d6deec', '#000000');
  doc.restore();

  for (let index = 1; index < colX.length; index += 1) {
    doc.moveTo(colX[index], y).lineTo(colX[index], y + headerHeight).stroke('#000000');
  }

  const labels = [
    'ITEM',
    'INSUMO',
    'UNIDADE',
    'QUANTIDADE',
    'ESPECIFICACAO',
    'APROPRIACAO',
    'NECESSARIO',
    'LINK DO PRODUTO'
  ];

  doc.font('Helvetica-Bold').fontSize(7).fillColor('#000000');
  labels.forEach((label, index) => {
    doc.text(label, colX[index] + 3, y + 5, {
      width: colWidths[index] - 6,
      align: index === 0 || index === 2 || index === 3 || index === 5 || index === 6 ? 'center' : 'center'
    });
  });

  return y + headerHeight;
}

function desenharTextoNaCelula(doc, texto, x, y, width, rowHeight, options = {}) {
  const {
    align = 'left',
    color = '#000000',
    font = 'Helvetica',
    fontSize = 8,
    paddingX = 4
  } = options;

  const valor = String(texto || '-');
  const larguraUtil = Math.max(4, width - paddingX * 2);
  doc.font(font).fontSize(fontSize).fillColor(color);
  const textoHeight = doc.heightOfString(valor, { width: larguraUtil, align });
  const yTexto = y + Math.max(4, (rowHeight - textoHeight) / 2);
  doc.text(valor, x + paddingX, yTexto, { width: larguraUtil, align });
}

function desenharBlocoObservacoes(doc, y, solicitacao) {
  const leftWidth = 52;
  const textoObservacoes = solicitacao.observacoes
    ? `${PDF_OBSERVACOES_FIXAS}\n\nObservacoes da compra: ${solicitacao.observacoes}`
    : PDF_OBSERVACOES_FIXAS;

  doc.font('Helvetica').fontSize(7);
  const textoHeight = doc.heightOfString(textoObservacoes, {
    width: PDF_PAGE.width - leftWidth - 12,
    align: 'left'
  });
  const blocoHeight = Math.max(48, Math.ceil(textoHeight + 10));

  doc.rect(PDF_PAGE.left, y, leftWidth, blocoHeight).stroke('#000000');
  doc.rect(PDF_PAGE.left + leftWidth, y, PDF_PAGE.width - leftWidth, blocoHeight).stroke('#000000');
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .text('Observacoes\nimportantes:', PDF_PAGE.left + 4, y + 10, {
      width: leftWidth - 8,
      align: 'center'
    });
  doc
    .font('Helvetica')
    .fontSize(7)
    .text(textoObservacoes, PDF_PAGE.left + leftWidth + 6, y + 6, {
      width: PDF_PAGE.width - leftWidth - 12,
      align: 'left'
    });

  return blocoHeight;
}

async function renderPdfSolicitacaoCompra(doc, solicitacao) {
  const colWidths = [38, 160, 56, 62, 132, 84, 90, 180];
  const colX = [PDF_PAGE.left];
  for (let index = 1; index < colWidths.length; index += 1) {
    colX.push(colX[index - 1] + colWidths[index - 1]);
  }
  const linhas = obterLinhasPdf(solicitacao);
  const anexosVisuais = await obterAnexosVisuaisPdf(linhas);
  const anexosVisuaisMap = new Map(anexosVisuais.map((anexo) => [anexo.index, anexo]));
  let y = desenharCabecalhoTabela(doc, desenharCabecalhoFicha(doc, solicitacao), colWidths, colX);

  linhas.forEach((item, index) => {
    const anexoVisualNaCelula = !item.link_produto ? anexosVisuaisMap.get(index) : null;
    const textoMidia = anexoVisualNaCelula ? '' : construirTextoMidiaPdf(item);
    const nomeItem = item.nome || '-';

    doc.fontSize(8).font('Helvetica');
    const alturaNome = doc.heightOfString(nomeItem, { width: colWidths[1] - 10 });
    const alturaEspecificacao = doc.heightOfString(item.especificacao || '-', {
      width: colWidths[4] - 10
    });
    doc.fontSize(6).font('Helvetica');
    const alturaMidia = textoMidia
      ? doc.heightOfString(textoMidia, { width: colWidths[7] - 10 })
      : 0;
    const alturaImagem = anexoVisualNaCelula ? 98 : 0;
    const rowHeight = Math.max(
      18,
      Math.ceil(Math.max(alturaNome + 8, alturaEspecificacao + 8, alturaMidia + 8, alturaImagem))
    );

    if (y + rowHeight + 72 > PDF_PAGE.bottomLimit) {
      doc.addPage({ margin: 40, size: 'A4', layout: 'landscape' });
      y = desenharCabecalhoTabela(doc, desenharCabecalhoFicha(doc, solicitacao), colWidths, colX);
    }

    doc.rect(PDF_PAGE.left, y, PDF_PAGE.width, rowHeight).stroke('#000000');
    for (let line = 1; line < colX.length; line += 1) {
      doc.moveTo(colX[line], y).lineTo(colX[line], y + rowHeight).stroke('#000000');
    }

    desenharTextoNaCelula(doc, String(index + 1), colX[0], y, colWidths[0], rowHeight, {
      align: 'center',
      paddingX: 3
    });
    desenharTextoNaCelula(doc, nomeItem, colX[1], y, colWidths[1], rowHeight, {
      color: item.manual ? '#b91c1c' : '#000000',
      paddingX: 4
    });
    desenharTextoNaCelula(doc, item.unidade || '-', colX[2], y, colWidths[2], rowHeight, {
      align: 'center',
      paddingX: 3,
      color: item.unidade_manual ? '#b91c1c' : '#000000'
    });
    desenharTextoNaCelula(doc, String(item.quantidade || ''), colX[3], y, colWidths[3], rowHeight, {
      align: 'center',
      paddingX: 3
    });
    desenharTextoNaCelula(doc, item.especificacao || '-', colX[4], y, colWidths[4], rowHeight, {
      paddingX: 4
    });
    desenharTextoNaCelula(doc, item.apropriacao || '-', colX[5], y, colWidths[5], rowHeight, {
      align: 'center',
      paddingX: 3
    });
    desenharTextoNaCelula(doc, formatDate(item.necessario_para) || '-', colX[6], y, colWidths[6], rowHeight, {
      align: 'center',
      paddingX: 3
    });

    if (anexoVisualNaCelula) {
      try {
        const image = doc.openImage(anexoVisualNaCelula.buffer);
        doc.image(image, colX[7] + 6, y + 6, {
          fit: [colWidths[7] - 12, rowHeight - 12],
          align: 'center',
          valign: 'center'
        });
      } catch (error) {
        desenharTextoNaCelula(doc, 'Foto anexada', colX[7], y, colWidths[7], rowHeight, {
          align: 'center',
          fontSize: 7
        });
      }
    } else if (item.link_produto) {
      doc.fontSize(5.5).fillColor('#1d4ed8');
      const alturaLink = doc.heightOfString(item.link_produto, { width: colWidths[7] - 8 });
      const yLink = y + Math.max(4, (rowHeight - Math.max(alturaLink, 12)) / 2);
      doc.text(item.link_produto, colX[7] + 4, yLink, {
        width: colWidths[7] - 8,
        link: item.link_produto,
        underline: false
      });
      if (item.arquivo_nome_original) {
        const offset = doc.heightOfString(item.link_produto, { width: colWidths[7] - 8 }) + 2;
        doc.fontSize(6).fillColor('#000000').text(construirTextoMidiaPdf({ ...item, link_produto: null }), colX[7] + 4, yLink + offset, {
          width: colWidths[7] - 8
        });
      }
    } else {
      desenharTextoNaCelula(doc, textoMidia || '-', colX[7], y, colWidths[7], rowHeight, {
        fontSize: 6,
        paddingX: 4
      });
    }

    y += rowHeight;
  });

  if (y + 70 > PDF_PAGE.bottomLimit) {
    doc.addPage({ margin: 40, size: 'A4', layout: 'landscape' });
    y = desenharCabecalhoFicha(doc, solicitacao);
  }

  desenharBlocoObservacoes(doc, y + 6, solicitacao);
}

async function gerarPdfBuffer(solicitacao) {
  let PDFDocument;
  PDFDocument = require('pdfkit');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    Promise.resolve(renderPdfSolicitacaoCompra(doc, solicitacao))
      .then(() => doc.end())
      .catch(reject);
  });
}

async function anexarPdfNaSolicitacaoPrincipal({ solicitacaoCompraId, solicitacaoPrincipalId, codigoSolicitacao, usuario }) {
  const solicitacao = await carregarSolicitacaoCompra(solicitacaoCompraId);
  if (!solicitacao) {
    return false;
  }

  let pdfBuffer;
  try {
    pdfBuffer = await gerarPdfBuffer(solicitacao);
  } catch (error) {
    console.error('Erro ao gerar PDF para anexar automaticamente:', error);
    return false;
  }

  try {
    const originalname = normalizeOriginalName(`solicitacao-compra-${codigoSolicitacao || solicitacaoCompraId}.pdf`);
    const url = await uploadToS3(
      {
        originalname,
        mimetype: 'application/pdf',
        buffer: pdfBuffer
      },
      `anexos/${codigoSolicitacao}/anexo`
    );

    const anexo = await Anexo.create({
      solicitacao_id: solicitacaoPrincipalId,
      tipo: 'ANEXO',
      nome_original: originalname,
      caminho_arquivo: url,
      uploaded_by: usuario.id,
      area_origem: usuario.setor_id
    });

    await Historico.create({
      solicitacao_id: solicitacaoPrincipalId,
      usuario_responsavel_id: usuario.id,
      setor: usuario.setor_id,
      acao: 'ANEXO_ADICIONADO',
      descricao: originalname,
      metadata: JSON.stringify({
        anexo_id: anexo.id,
        caminho: url,
        origem: 'MODULO_COMPRAS_AUTO_PDF'
      })
    });

    return true;
  } catch (error) {
    console.error('Erro ao anexar PDF automaticamente na solicitacao principal:', error);
    return false;
  }
}

module.exports = {
  async uploadTemporario(req, res) {
    try {
      const usuario = await validarAcesso(req, res);
      if (!usuario) return;

      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const nomeOriginal = normalizeOriginalName(req.file.originalname);
      const arquivoUrl = await uploadToS3(
        {
          ...req.file,
          originalname: nomeOriginal
        },
        `compras/itens-temporarios/usuario-${usuario.id}`
      );

      return res.status(201).json({
        arquivo_url: arquivoUrl,
        arquivo_nome_original: nomeOriginal
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao enviar arquivo do item' });
    }
  },

  async index(req, res) {
    try {
      const usuario = await validarAcesso(req, res);
      if (!usuario) return;

      const { obra_id } = req.query;
      const where = {};

      if (obra_id) {
        where.obra_id = obra_id;
      }

      const solicitacoes = await SolicitacaoCompra.findAll({
        where,
        order: [['createdAt', 'DESC']],
        include: [
          { model: Obra, as: 'obra', attributes: ['id', 'nome', 'codigo'] },
          { model: User, as: 'solicitante', attributes: ['id', 'nome', 'email'] },
          { model: Solicitacao, as: 'solicitacaoPrincipal', attributes: ['id', 'codigo', 'area_responsavel', 'status_global'] },
          {
            model: SolicitacaoCompraItem,
            as: 'itens',
            include: [
              { model: Insumo, as: 'insumo', attributes: ['id', 'nome', 'codigo'] },
              { model: Unidade, as: 'unidade', attributes: ['id', 'nome', 'sigla'] },
              { model: Apropriacao, as: 'apropriacao', attributes: ['id', 'codigo', 'descricao'] }
            ]
          },
          {
            model: SolicitacaoCompraItemManual,
            as: 'itensManuais',
            include: [
              { model: Apropriacao, as: 'apropriacao', attributes: ['id', 'codigo', 'descricao'] }
            ]
          },
          {
            model: SolicitacaoCompraFornecedor,
            as: 'fornecedores',
            attributes: ['id', 'status', 'respondido_em', 'fornecedor_compra_id']
          }
        ]
      });

      return res.json(solicitacoes);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar solicitacoes de compra' });
    }
  },

  async show(req, res) {
    try {
      const usuario = await validarAcesso(req, res);
      if (!usuario) return;

      const solicitacao = await carregarSolicitacaoCompra(req.params.id);

      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      return res.json(solicitacao);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar solicitacao de compra' });
    }
  },

  async create(req, res) {
    const transaction = await SolicitacaoCompra.sequelize.transaction();

    try {
      const usuario = await validarAcesso(req, res);
      if (!usuario) {
        await transaction.rollback();
        return;
      }

      const { obra_id, necessario_para, observacoes, link_geral, itens } = req.body;

      if (!obra_id || !Array.isArray(itens) || itens.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Informe obra e ao menos um item' });
      }

      const obra = await Obra.findByPk(obra_id, { transaction });
      if (!obra) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Obra nao encontrada' });
      }

      const itensPreparados = [];
      const itensManuaisPreparados = [];

      for (const item of itens) {
        const {
          insumo_id,
          unidade_id,
          apropriacao_id,
          quantidade,
          especificacao,
          necessario_para: itemNecessario,
          link_produto,
          arquivo_url,
          arquivo_nome_original,
          manual,
          nome_manual,
          unidade_sigla_manual
        } = item || {};

        if (!apropriacao_id || !quantidade) {
          await transaction.rollback();
          return res.status(400).json({ error: 'Todos os itens devem conter apropriacao e quantidade' });
        }

        const apropriacao = await Apropriacao.findByPk(apropriacao_id, { transaction });
        if (!apropriacao || Number(apropriacao.obra_id) !== Number(obra_id)) {
          await transaction.rollback();
          return res.status(400).json({ error: 'Apropriacao nao pertence a obra selecionada' });
        }

        if (manual || !insumo_id) {
          if (!nome_manual || !unidade_sigla_manual) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Itens manuais devem conter nome e unidade' });
          }

          itensManuaisPreparados.push({
            apropriacao_id,
            nome_manual,
            unidade_sigla_manual,
            quantidade,
            especificacao: especificacao || '',
            necessario_para: itemNecessario || necessario_para || null,
            link_produto: link_produto || null,
            arquivo_url: arquivo_url || null,
            arquivo_nome_original: arquivo_nome_original || null
          });
          continue;
        }

        itensPreparados.push({
          insumo_id,
          unidade_id: unidade_id || null,
          unidade_sigla_manual: unidade_sigla_manual || null,
          apropriacao_id,
          quantidade,
          especificacao: especificacao || '',
          necessario_para: itemNecessario || necessario_para || null,
          link_produto: link_produto || null,
          arquivo_url: arquivo_url || null,
          arquivo_nome_original: arquivo_nome_original || null
        });
      }

      const solicitacaoCompra = await SolicitacaoCompra.create(
        {
          obra_id,
          solicitante_id: usuario.id,
          status: 'ENVIADO',
          integrado_sienge: false,
          observacoes: observacoes || null,
          necessario_para: necessario_para || null,
          link_geral: link_geral || null
        },
        { transaction }
      );

      if (itensPreparados.length) {
        await SolicitacaoCompraItem.bulkCreate(
          itensPreparados.map((item) => ({
            ...item,
            solicitacao_compra_id: solicitacaoCompra.id
          })),
          { transaction }
        );
      }

      if (itensManuaisPreparados.length) {
        await SolicitacaoCompraItemManual.bulkCreate(
          itensManuaisPreparados.map((item) => ({
            ...item,
            solicitacao_compra_id: solicitacaoCompra.id
          })),
          { transaction }
        );
      }

      const tipoSolicitacao = await buscarTipoSolicitacaoCompra(transaction);
      const setorDestino = await buscarSetorDestino(transaction);
      const codigo = await gerarCodigoSolicitacao();

      const insumos = itensPreparados.length
        ? await Insumo.findAll({
            where: {
              id: {
                [Op.in]: itensPreparados.map((item) => item.insumo_id)
              }
            },
            attributes: ['id', 'nome'],
            transaction
          })
        : [];

      const mapaInsumos = new Map(insumos.map((item) => [item.id, item.nome]));
      const resumoItensNormais = itensPreparados.map((item) => {
        const nome = mapaInsumos.get(item.insumo_id) || `Insumo ${item.insumo_id}`;
        return `${item.quantidade}x ${nome}`;
      });
      const resumoItensManuais = itensManuaisPreparados.map((item) => `${item.quantidade}x ${item.nome_manual} [manual]`);
      const resumoItens = [...resumoItensNormais, ...resumoItensManuais].join(', ');

      const descricao = [
        'Solicitação de Compra',
        resumoItens ? `Itens: ${resumoItens}` : null,
        observacoes ? `Observações: ${observacoes}` : null
      ]
        .filter(Boolean)
        .join('\n');

      const solicitacaoPrincipal = await Solicitacao.create(
        {
          codigo,
          obra_id,
          tipo_solicitacao_id: tipoSolicitacao.id,
          descricao,
          status_global: 'PENDENTE',
          area_responsavel: setorDestino,
          criado_por: usuario.id,
          data_vencimento: necessario_para || null,
          cancelada: false
        },
        { transaction }
      );

      await solicitacaoCompra.update(
        {
          solicitacao_principal_id: solicitacaoPrincipal.id
        },
        { transaction }
      );

      await Historico.create(
        {
          solicitacao_id: solicitacaoPrincipal.id,
          usuario_responsavel_id: usuario.id,
          setor: setorDestino,
          acao: 'CRIADA',
          status_novo: 'PENDENTE',
          observacao: `Solicita??o de compra criada com ${itensPreparados.length + itensManuaisPreparados.length} item(ns)`
        },
        { transaction }
      );

      await StatusArea.create(
        {
          solicitacao_id: solicitacaoPrincipal.id,
          setor: setorDestino,
          status: 'PENDENTE',
          observacao: 'Solicita??o de compra criada'
        },
        { transaction }
      );

      await registrarLogSolicitacaoCompra({
        solicitacaoCompraId: solicitacaoCompra.id,
        usuarioId: usuario.id,
        tipoAcao: 'CRIACAO',
        descricao: `Solicitacao de compra criada com ${itensPreparados.length + itensManuaisPreparados.length} item(ns)`,
        metadados: {
          obra_id,
          solicitacao_principal_id: solicitacaoPrincipal.id,
          quantidade_itens: itensPreparados.length + itensManuaisPreparados.length
        },
        transaction
      });

      await transaction.commit();

      const pdfAnexado = await anexarPdfNaSolicitacaoPrincipal({
        solicitacaoCompraId: solicitacaoCompra.id,
        solicitacaoPrincipalId: solicitacaoPrincipal.id,
        codigoSolicitacao: codigo,
        usuario
      });

      return res.status(201).json({
        id: solicitacaoCompra.id,
        solicitacao_principal_id: solicitacaoPrincipal.id,
        codigo,
        quantidade_itens: itensPreparados.length + itensManuaisPreparados.length,
        pdf_anexado: pdfAnexado
      });
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar solicitacao de compra' });
    }
  },

  async integrar(req, res) {
    const transaction = await SolicitacaoCompra.sequelize.transaction();

    try {
      const usuario = await validarAcesso(req, res);
      if (!usuario) {
        await transaction.rollback();
        return;
      }

      if (!(await validarAcessoIntegracao(usuario))) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Apenas gerencia de processos pode integrar no Sienge' });
      }

      const numeroSienge = String(req.body?.numero_sienge || '').trim();
      if (!numeroSienge) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Informe o numero do Sienge' });
      }

      const solicitacao = await SolicitacaoCompra.findByPk(req.params.id, { transaction });
      if (!solicitacao) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      if (normalizeTextCompra(solicitacao.status) === 'ENCERRADO') {
        await transaction.rollback();
        return res.status(400).json({ error: 'Solicitacao encerrada nao pode ser reintegrada' });
      }

      await solicitacao.update(
        {
          numero_sienge: numeroSienge,
          integrado_sienge: true,
          data_integracao_sienge: new Date(),
          status: 'INTEGRADO_SIENGE'
        },
        { transaction }
      );

      await registrarLogSolicitacaoCompra({
        solicitacaoCompraId: solicitacao.id,
        usuarioId: usuario.id,
        tipoAcao: 'INTEGRACAO_SIENGE',
        descricao: `Solicitacao integrada ao Sienge sob numero ${numeroSienge}`,
        metadados: { numero_sienge: numeroSienge },
        transaction
      });

      await transaction.commit();
      const atualizada = await carregarSolicitacaoCompra(req.params.id);
      return res.json(atualizada);
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(500).json({ error: 'Erro ao integrar solicitacao no Sienge' });
    }
  },

  async liberar(req, res) {
    const transaction = await SolicitacaoCompra.sequelize.transaction();

    try {
      const usuario = await validarAcesso(req, res);
      if (!usuario) {
        await transaction.rollback();
        return;
      }

      if (!(await validarAcessoIntegracao(usuario))) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Apenas gerencia de processos pode liberar para compra' });
      }

      const solicitacao = await SolicitacaoCompra.findByPk(req.params.id, { transaction });
      if (!solicitacao) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      if (normalizeTextCompra(solicitacao.status) === 'ENCERRADO') {
        await transaction.rollback();
        return res.status(400).json({ error: 'Solicitacao encerrada nao pode ser liberada novamente' });
      }

      if (!solicitacao.integrado_sienge || !String(solicitacao.numero_sienge || '').trim()) {
        await transaction.rollback();
        return res.status(400).json({ error: 'A solicitacao precisa estar integrada ao Sienge antes da liberacao' });
      }

      await solicitacao.update(
        {
          status: 'LIBERADO_PARA_COMPRA',
          liberado_para_compra_em: new Date()
        },
        { transaction }
      );

      await registrarLogSolicitacaoCompra({
        solicitacaoCompraId: solicitacao.id,
        usuarioId: usuario.id,
        tipoAcao: 'LIBERACAO_COMPRA',
        descricao: 'Solicitacao liberada para cotacao e compras',
        transaction
      });

      await transaction.commit();
      const atualizada = await carregarSolicitacaoCompra(req.params.id);
      return res.json(atualizada);
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(500).json({ error: 'Erro ao liberar solicitacao para compra' });
    }
  },

  async enviarParaFornecedores(req, res) {
    const transaction = await SolicitacaoCompra.sequelize.transaction();

    try {
      const usuario = await validarAcesso(req, res);
      if (!usuario) {
        await transaction.rollback();
        return;
      }

      if (!(await validarAcessoCompras(usuario))) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Apenas compras pode enviar cotacoes para fornecedores' });
      }

      const solicitacao = await SolicitacaoCompra.findByPk(req.params.id, { transaction });
      if (!solicitacao) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      if (normalizeTextCompra(solicitacao.status) === 'ENCERRADO') {
        await transaction.rollback();
        return res.status(400).json({ error: 'Solicitacao encerrada nao aceita novo envio para fornecedores' });
      }

      if (normalizeTextCompra(solicitacao.status) !== 'LIBERADO_PARA_COMPRA') {
        await transaction.rollback();
        return res.status(400).json({ error: 'A solicitacao precisa estar liberada para compra antes do envio' });
      }

      const fornecedoresPayload = Array.isArray(req.body?.fornecedores) ? req.body.fornecedores : [];
      if (!fornecedoresPayload.length) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Selecione ao menos um fornecedor' });
      }

      const vinculados = [];

      for (const entry of fornecedoresPayload) {
        let fornecedor = null;
        const fornecedorId = Number(entry?.fornecedor_id);

        if (fornecedorId > 0) {
          fornecedor = await FornecedorCompra.findByPk(fornecedorId, { transaction });
        } else if (String(entry?.nome || '').trim()) {
          fornecedor = await FornecedorCompra.create(
            {
              nome: String(entry.nome).trim(),
              email: entry.email ? String(entry.email).trim() : null,
              whatsapp: entry.whatsapp ? String(entry.whatsapp).trim() : null,
              contato: entry.contato ? String(entry.contato).trim() : null,
              observacoes: null,
              ativo: true
            },
            { transaction }
          );
        }

        if (!fornecedor) {
          await transaction.rollback();
          return res.status(400).json({ error: 'Fornecedor invalido informado para envio' });
        }

        let vinculacao = await SolicitacaoCompraFornecedor.findOne({
          where: {
            solicitacao_compra_id: solicitacao.id,
            fornecedor_compra_id: fornecedor.id
          },
          transaction
        });

        if (!vinculacao) {
          vinculacao = await SolicitacaoCompraFornecedor.create(
            {
              solicitacao_compra_id: solicitacao.id,
              fornecedor_compra_id: fornecedor.id,
              token: gerarTokenCotacao(),
              status: 'ENVIADO',
              enviado_em: new Date()
            },
            { transaction }
          );
        } else {
          await vinculacao.update(
            {
              status: 'ENVIADO',
              enviado_em: new Date()
            },
            { transaction }
          );
        }

        await registrarLogSolicitacaoCompra({
          solicitacaoCompraId: solicitacao.id,
          usuarioId: usuario.id,
          fornecedorCompraId: fornecedor.id,
          tipoAcao: 'ENVIO_FORNECEDOR',
          descricao: `Cotacao disponibilizada para ${fornecedor.nome}`,
          metadados: {
            cotacao_fornecedor_id: vinculacao.id,
            token: vinculacao.token
          },
          transaction
        });

        vinculados.push({
          id: vinculacao.id,
          fornecedor_id: fornecedor.id,
          fornecedor_nome: fornecedor.nome,
          email: fornecedor.email || '',
          whatsapp: fornecedor.whatsapp || '',
          token: vinculacao.token,
          url_publica: montarUrlCotacaoPublica(req, vinculacao.token)
        });
      }

      await transaction.commit();
      return res.status(201).json({ fornecedores: vinculados });
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(500).json({ error: 'Erro ao enviar solicitacao para fornecedores' });
    }
  },

  async comparativo(req, res) {
    try {
      const usuario = await validarAcesso(req, res);
      if (!usuario) return;

      const solicitacao = await carregarSolicitacaoCompra(req.params.id);
      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      return res.json(montarComparativoSolicitacao(solicitacao));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao gerar comparativo da solicitacao' });
    }
  },

  async encerrar(req, res) {
    const transaction = await SolicitacaoCompra.sequelize.transaction();

    try {
      const usuario = await validarAcesso(req, res);
      if (!usuario) {
        await transaction.rollback();
        return;
      }

      if (!(await validarAcessoCompras(usuario))) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Apenas compras pode encerrar a cotacao' });
      }

      const solicitacao = await carregarSolicitacaoCompra(req.params.id);
      if (!solicitacao) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      if (normalizeTextCompra(solicitacao.status) === 'ENCERRADO') {
        await transaction.rollback();
        return res.status(400).json({ error: 'Cotacao ja encerrada' });
      }

      const vencedores = Array.isArray(req.body?.vencedores) ? req.body.vencedores : [];
      if (!vencedores.length) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Selecione ao menos um vencedor para encerrar a cotacao' });
      }

      const cotacaoFornecedorIds = (solicitacao.fornecedores || []).map((item) => item.id);
      await SolicitacaoCompraRespostaItem.update(
        { vencedor: false },
        {
          where: {
            solicitacao_compra_fornecedor_id: {
              [Op.in]: cotacaoFornecedorIds.length ? cotacaoFornecedorIds : [0]
            }
          },
          transaction
        }
      );

      for (const entry of vencedores) {
        const resposta = await SolicitacaoCompraRespostaItem.findByPk(entry?.resposta_item_id, { transaction });
        if (!resposta) {
          await transaction.rollback();
          return res.status(400).json({ error: 'Resposta vencedora invalida informada' });
        }

        if (!cotacaoFornecedorIds.includes(resposta.solicitacao_compra_fornecedor_id)) {
          await transaction.rollback();
          return res.status(400).json({ error: 'Resposta nao pertence a esta solicitacao' });
        }

        await resposta.update({ vencedor: true }, { transaction });
      }

      const solicitacaoDb = await SolicitacaoCompra.findByPk(req.params.id, { transaction });
      await solicitacaoDb.update(
        {
          status: 'ENCERRADO',
          encerrado_em: new Date()
        },
        { transaction }
      );

      await registrarLogSolicitacaoCompra({
        solicitacaoCompraId: solicitacaoDb.id,
        usuarioId: usuario.id,
        tipoAcao: 'ENCERRAMENTO',
        descricao: 'Cotacao encerrada com vencedores definidos',
        metadados: {
          vencedores: vencedores.map((item) => item.resposta_item_id)
        },
        transaction
      });

      await transaction.commit();
      const atualizada = await carregarSolicitacaoCompra(req.params.id);
      return res.json(atualizada);
    } catch (error) {
      await transaction.rollback();
      console.error(error);
      return res.status(500).json({ error: 'Erro ao encerrar a cotacao' });
    }
  },

  async pdf(req, res) {
    try {
      const usuario = await validarAcesso(req, res);
      if (!usuario) return;

      let PDFDocument;
      try {
        PDFDocument = require('pdfkit');
      } catch (error) {
        return res.status(500).json({ error: 'Dependencia pdfkit nao instalada no backend' });
      }

      const solicitacao = await carregarSolicitacaoCompra(req.params.id);
      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitacao nao encontrada' });
      }

      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="solicitacao-compra-${req.params.id}.pdf"`);
      doc.pipe(res);

      await renderPdfSolicitacaoCompra(doc, solicitacao);
      doc.end();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao gerar PDF' });
    }
  }
};
