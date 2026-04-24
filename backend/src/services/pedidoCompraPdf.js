const fs = require('fs');
const path = require('path');
const { findPedidoCompraStatusConfig } = require('./pedidoCompraStatusConfig');
const { getRuntimeInstallationConfig } = require('./runtimeConfig');

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('pt-BR');
}

function formatQuantity(value, unidade) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return unidade ? `- ${unidade}` : '-';
  }

  const formatted = numeric.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
    maximumFractionDigits: 2
  });

  return `${formatted}${unidade ? ` ${unidade}` : ''}`;
}

function getPdfLogoPath() {
  const config = getRuntimeInstallationConfig();
  const logoUrl = String(config?.pdf_logo_url || config?.logo_url || '').trim();

  if (!logoUrl || /^https?:\/\//i.test(logoUrl)) {
    return null;
  }

  const normalized = logoUrl.replace(/^\/+/, '');
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', 'frontend', 'public', normalized),
    path.resolve(__dirname, '..', '..', '..', normalized)
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function getPageMetrics(doc) {
  return {
    left: 40,
    top: 32,
    width: doc.page.width - 80,
    bottomLimit: doc.page.height - 50,
    footerY: doc.page.height - 24
  };
}

function drawFieldCard(doc, { x, y, width, height = 56, label, value, accent = '#0f172a' }) {
  doc
    .roundedRect(x, y, width, height, 10)
    .fillAndStroke('#f8fafc', '#dbe4f0');

  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor('#64748b')
    .text(label, x + 12, y + 10, { width: width - 24 });

  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(accent)
    .text(String(value || '-'), x + 12, y + 25, { width: width - 24 });
}

function drawSectionTitle(doc, title, subtitle, y, metrics) {
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#0f172a')
    .text(title, metrics.left, y, { width: metrics.width });

  if (subtitle) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#64748b')
      .text(subtitle, metrics.left, y + 14, { width: metrics.width });
  }

  return y + (subtitle ? 34 : 18);
}

function drawPageFooter(doc, pageNumber, companyName) {
  const metrics = getPageMetrics(doc);

  doc
    .moveTo(metrics.left, metrics.footerY - 6)
    .lineTo(metrics.left + metrics.width, metrics.footerY - 6)
    .strokeColor('#dbe4f0')
    .stroke();

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#64748b')
    .text(`${companyName} · Pagina ${pageNumber}`, metrics.left, metrics.footerY, {
      width: metrics.width,
      align: 'right'
    });
}

function drawPageHeader(doc, context, { continued = false } = {}) {
  const metrics = getPageMetrics(doc);
  const { pedido, statusConfig, companyName, pdfLogoPath } = context;
  const headerHeight = 78;
  const logoBoxWidth = 86;
  const statusWidth = 180;
  const infoX = metrics.left + logoBoxWidth + 16;
  const infoWidth = metrics.width - logoBoxWidth - statusWidth - 32;
  const statusX = metrics.left + metrics.width - statusWidth;

  doc
    .roundedRect(metrics.left, metrics.top, metrics.width, headerHeight, 16)
    .fillAndStroke('#eff6ff', '#bfdbfe');

  if (pdfLogoPath) {
    try {
      doc.image(pdfLogoPath, metrics.left + 10, metrics.top + 10, {
        fit: [logoBoxWidth - 20, headerHeight - 20],
        align: 'center',
        valign: 'center'
      });
    } catch {
      // segue sem a logo se ela nao puder ser renderizada
    }
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor('#0f172a')
    .text(continued ? 'PEDIDO DE COMPRA · CONTINUACAO' : 'PEDIDO DE COMPRA', infoX, metrics.top + 14, {
      width: infoWidth
    });

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#475569')
    .text(companyName, infoX, metrics.top + 38, { width: infoWidth });

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#64748b')
    .text(
      `Fornecedor: ${pedido?.fornecedor?.nome || '-'} · Gerado em ${formatDateTime(new Date())}`,
      infoX,
      metrics.top + 54,
      { width: infoWidth }
    );

  doc
    .roundedRect(statusX, metrics.top + 10, statusWidth - 10, headerHeight - 20, 12)
    .fillAndStroke('#ffffff', '#dbe4f0');

  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor('#64748b')
    .text(`PC-${String(pedido?.id || '').padStart(5, '0')}`, statusX + 14, metrics.top + 22, {
      width: statusWidth - 38,
      align: 'right'
    });

  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(statusConfig?.cor || '#0f172a')
    .text(statusConfig?.nome || pedido?.status || '-', statusX + 14, metrics.top + 38, {
      width: statusWidth - 38,
      align: 'right'
    });

  return metrics.top + headerHeight + 16;
}

function drawResumoGrid(doc, context, y) {
  const metrics = getPageMetrics(doc);
  const { pedido, statusConfig } = context;
  const gap = 12;
  const cardWidth = (metrics.width - gap * 3) / 4;
  const firstRow = [
    { label: 'Solicitacao', value: `SC-${String(pedido?.solicitacao_compra_id || '').padStart(5, '0')}${pedido?.solicitacao?.numero_sienge ? ` · ${pedido.solicitacao.numero_sienge}` : ''}` },
    { label: 'Fornecedor', value: pedido?.fornecedor?.nome || '-' },
    { label: 'Obra', value: pedido?.obra?.nome || '-' },
    { label: 'Itens ativos', value: String((pedido?.itens || []).filter((item) => !item.removido).length) }
  ];
  const secondRow = [
    { label: 'Status', value: statusConfig?.nome || pedido?.status || '-', accent: statusConfig?.cor || '#0f172a' },
    { label: 'Criado em', value: formatDateTime(pedido?.createdAt) },
    { label: 'Criado por', value: pedido?.criador?.nome || '-' },
    { label: 'Valor total', value: formatMoney(pedido?.valor_total), accent: '#1d4ed8' }
  ];

  firstRow.forEach((item, index) => {
    drawFieldCard(doc, {
      x: metrics.left + (cardWidth + gap) * index,
      y,
      width: cardWidth,
      label: item.label,
      value: item.value,
      accent: item.accent
    });
  });

  y += 68;

  secondRow.forEach((item, index) => {
    drawFieldCard(doc, {
      x: metrics.left + (cardWidth + gap) * index,
      y,
      width: cardWidth,
      label: item.label,
      value: item.value,
      accent: item.accent
    });
  });

  return y + 72;
}

function drawFornecedorGrid(doc, context, y) {
  const metrics = getPageMetrics(doc);
  const { pedido } = context;
  const gap = 12;
  const cardWidth = (metrics.width - gap * 4) / 5;
  const cards = [
    { label: 'Contato', value: pedido?.fornecedor?.contato || '-' },
    { label: 'WhatsApp', value: pedido?.fornecedor?.whatsapp || '-' },
    { label: 'Email', value: pedido?.fornecedor?.email || '-' },
    { label: 'Pedido minimo', value: pedido?.valor_minimo_pedido ? formatMoney(pedido.valor_minimo_pedido) : '-' },
    { label: 'Atingiu minimo', value: pedido?.atingiu_pedido_minimo ? 'Sim' : 'Nao', accent: pedido?.atingiu_pedido_minimo ? '#15803d' : '#b45309' }
  ];

  cards.forEach((item, index) => {
    drawFieldCard(doc, {
      x: metrics.left + (cardWidth + gap) * index,
      y,
      width: cardWidth,
      label: item.label,
      value: item.value,
      accent: item.accent
    });
  });

  y += 72;

  if (!pedido?.atingiu_pedido_minimo) {
    doc
      .roundedRect(metrics.left, y, metrics.width, 30, 10)
      .fillAndStroke('#fffbeb', '#fcd34d');

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#92400e')
      .text(
        'Atencao: o valor atual do pedido ainda nao atinge o pedido minimo informado pelo fornecedor.',
        metrics.left + 12,
        y + 10,
        { width: metrics.width - 24 }
      );

    y += 42;
  }

  return y;
}

function getTableColumns(metrics) {
  const widths = [32, 188, 62, 74, 74, 46, 80, 82, 124];
  const labels = ['#', 'Item', 'Origem', 'Qtd. solic.', 'Qtd. pedido', 'Unid.', 'Preco unit.', 'Total', 'Observacoes'];
  let currentX = metrics.left;

  return widths.map((width, index) => {
    const column = {
      label: labels[index],
      width,
      x: currentX
    };
    currentX += width;
    return column;
  });
}

function drawCellText(doc, text, column, y, rowHeight, { align = 'left', fontSize = 8, color = '#0f172a', paddingX = 4 } = {}) {
  const value = String(text || '-');
  const textWidth = Math.max(4, column.width - paddingX * 2);
  const textHeight = doc.heightOfString(value, { width: textWidth, align });
  const textY = y + Math.max(4, (rowHeight - textHeight) / 2);

  doc
    .font('Helvetica')
    .fontSize(fontSize)
    .fillColor(color)
    .text(value, column.x + paddingX, textY, { width: textWidth, align });
}

function drawTableHeader(doc, y, columns, metrics) {
  doc
    .roundedRect(metrics.left, y, metrics.width, 24, 8)
    .fillAndStroke('#dbe7f5', '#cbd5e1');

  columns.forEach((column, index) => {
    if (index > 0) {
      doc.moveTo(column.x, y).lineTo(column.x, y + 24).strokeColor('#cbd5e1').stroke();
    }

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#334155')
      .text(column.label, column.x + 4, y + 8, {
        width: column.width - 8,
        align: ['#', 'Qtd. solic.', 'Qtd. pedido', 'Unid.', 'Preco unit.', 'Total'].includes(column.label) ? 'center' : 'left'
      });
  });

  return y + 24;
}

function drawItemRow(doc, item, index, y, columns) {
  const observacoes = item?.observacoes || item?.respostaItem?.observacao || '-';
  const itemHeight = doc.heightOfString(item?.descricao || '-', { width: columns[1].width - 8 });
  const obsHeight = doc.heightOfString(observacoes, { width: columns[8].width - 8 });
  const rowHeight = Math.max(28, Math.ceil(Math.max(itemHeight, obsHeight) + 12));
  const rowFill = index % 2 === 0 ? '#ffffff' : '#f8fafc';

  doc
    .rect(columns[0].x, y, columns.reduce((sum, column) => sum + column.width, 0), rowHeight)
    .fillAndStroke(rowFill, '#e2e8f0');

  columns.forEach((column, columnIndex) => {
    if (columnIndex > 0) {
      doc.moveTo(column.x, y).lineTo(column.x, y + rowHeight).strokeColor('#e2e8f0').stroke();
    }
  });

  drawCellText(doc, String(index + 1), columns[0], y, rowHeight, { align: 'center', paddingX: 2 });
  drawCellText(doc, item?.descricao || '-', columns[1], y, rowHeight);
  drawCellText(doc, item?.origem || '-', columns[2], y, rowHeight, { align: 'center' });
  drawCellText(doc, formatQuantity(item?.quantidade_solicitada), columns[3], y, rowHeight, { align: 'center' });
  drawCellText(doc, formatQuantity(item?.quantidade_pedido), columns[4], y, rowHeight, { align: 'center' });
  drawCellText(doc, item?.unidade || '-', columns[5], y, rowHeight, { align: 'center' });
  drawCellText(doc, formatMoney(item?.preco_unitario), columns[6], y, rowHeight, { align: 'right' });
  drawCellText(doc, formatMoney(item?.valor_total), columns[7], y, rowHeight, { align: 'right' });
  drawCellText(doc, observacoes, columns[8], y, rowHeight, { fontSize: 7.5 });

  return rowHeight;
}

function ensureSpace(doc, state, requiredHeight, columns) {
  if (state.y + requiredHeight <= state.metrics.bottomLimit) {
    return;
  }

  drawPageFooter(doc, state.pageNumber, state.context.companyName);
  doc.addPage({ margin: 40, size: 'A4', layout: 'landscape' });
  state.pageNumber += 1;
  state.metrics = getPageMetrics(doc);
  state.y = drawPageHeader(doc, state.context, { continued: true });
  state.y = drawSectionTitle(doc, 'Itens do pedido', 'Continuacao da listagem de itens do pedido.', state.y, state.metrics);
  state.y = drawTableHeader(doc, state.y, columns, state.metrics);
}

function drawResumoFinal(doc, context, y) {
  const metrics = getPageMetrics(doc);
  const { pedido } = context;
  const gap = 12;
  const cardWidth = (metrics.width - gap * 3) / 4;
  const cards = [
    { label: 'Itens ativos', value: String((pedido?.itens || []).filter((item) => !item.removido).length) },
    { label: 'Valor minimo', value: pedido?.valor_minimo_pedido ? formatMoney(pedido.valor_minimo_pedido) : '-' },
    { label: 'Encerrado em', value: formatDateTime(pedido?.encerrado_em) },
    { label: 'Valor consolidado', value: formatMoney(pedido?.valor_total), accent: '#1d4ed8' }
  ];

  cards.forEach((item, index) => {
    drawFieldCard(doc, {
      x: metrics.left + (cardWidth + gap) * index,
      y,
      width: cardWidth,
      height: 60,
      label: item.label,
      value: item.value,
      accent: item.accent
    });
  });
}

async function renderPedidoCompraPdf(doc, pedido) {
  const installationConfig = getRuntimeInstallationConfig();
  const pdfLogoPath = getPdfLogoPath();
  const statusConfig = await findPedidoCompraStatusConfig(pedido?.status);
  const companyName =
    installationConfig?.pdf_company_name ||
    installationConfig?.company_legal_name ||
    installationConfig?.company_name ||
    installationConfig?.product_name ||
    'Fluxy';
  const itensAtivos = (pedido?.itens || []).filter((item) => !item.removido);
  const context = {
    pedido,
    statusConfig,
    companyName,
    pdfLogoPath
  };
  const state = {
    context,
    pageNumber: 1,
    metrics: getPageMetrics(doc),
    y: 0
  };

  state.y = drawPageHeader(doc, context);
  state.y = drawResumoGrid(doc, context, state.y);
  state.y = drawSectionTitle(doc, 'Fornecedor e condicoes do pedido', 'Dados de contato e contexto comercial do fornecedor selecionado.', state.y, state.metrics);
  state.y = drawFornecedorGrid(doc, context, state.y);
  state.y = drawSectionTitle(doc, 'Itens do pedido', 'Listagem operacional consolidada para envio e conferencia.', state.y, state.metrics);

  const columns = getTableColumns(state.metrics);
  state.y = drawTableHeader(doc, state.y, columns, state.metrics);

  if (!itensAtivos.length) {
    ensureSpace(doc, state, 40, columns);
    doc
      .roundedRect(state.metrics.left, state.y, state.metrics.width, 34, 8)
      .fillAndStroke('#ffffff', '#e2e8f0');
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#64748b')
      .text('Nenhum item ativo encontrado para este pedido.', state.metrics.left + 12, state.y + 11, {
        width: state.metrics.width - 24
      });
    state.y += 44;
  } else {
    itensAtivos.forEach((item, index) => {
      const observacoes = item?.observacoes || item?.respostaItem?.observacao || '-';
      const rowHeight = Math.max(
        28,
        Math.ceil(
          Math.max(
            doc.heightOfString(item?.descricao || '-', { width: columns[1].width - 8 }),
            doc.heightOfString(observacoes, { width: columns[8].width - 8 })
          ) + 12
        )
      );

      ensureSpace(doc, state, rowHeight + 2, columns);
      state.y += drawItemRow(doc, item, index, state.y, columns);
    });
  }

  ensureSpace(doc, state, 90, columns);
  state.y += 18;
  drawResumoFinal(doc, context, state.y);
  drawPageFooter(doc, state.pageNumber, companyName);
}

module.exports = {
  renderPedidoCompraPdf
};
