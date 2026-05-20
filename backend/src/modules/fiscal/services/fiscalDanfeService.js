'use strict';

const PDFDocument = require('pdfkit');
const { FiscalCompany, FiscalDfeDocument } = require('../../../models');
const { registrarEventoSeguranca } = require('../../../services/securityLogService');
const {
  buildFiscalObjectKey,
  getFiscalObjectBuffer,
  getFiscalObjectSignedUrl,
  uploadFiscalObject
} = require('./fiscalS3Service');
const { countNfeItemBlocks, parseNfeXml } = require('./fiscalXmlParserService');

const COLORS = {
  ink: '#111827',
  muted: '#374151',
  line: '#111827',
  fill: '#F3F4F6'
};

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function asText(value, fallback = '-') {
  const text = String(value == null ? '' : value).trim();
  return text || fallback;
}

function compactText(value) {
  return String(value == null ? '' : value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function formatCpfCnpj(value) {
  const digits = onlyDigits(value);
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return value || '-';
}

function formatCep(value) {
  const digits = onlyDigits(value);
  if (digits.length === 8) {
    return digits.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  return value || '';
}

function formatAccessKey(value) {
  const digits = onlyDigits(value);
  if (digits.length !== 44) return value || '-';
  return digits.match(/.{1,4}/g).join(' ');
}

function formatNfeNumber(value) {
  const digits = onlyDigits(value);
  if (!digits) return '-';
  return digits.padStart(9, '0').replace(/(\d{3})(\d{3})(\d{3})$/, '$1.$2.$3');
}

function formatDate(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function formatTime(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '-').slice(0, 8);
  return date.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function formatNumber(value, decimals = 2) {
  if (value == null || value === '') return '0,00';
  const number = Number(value);
  if (!Number.isFinite(number)) return '0,00';
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatQuantity(value) {
  if (value == null || value === '') return '0,0000';
  const number = Number(value);
  if (!Number.isFinite(number)) return '0,0000';
  return number.toLocaleString('pt-BR', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}

function formatMoneyPlain(value) {
  return formatNumber(value, 2);
}

function joinAddress(address = {}) {
  return [
    address.street,
    address.number && address.number !== 'S/N' ? address.number : address.number,
    address.complement
  ].filter(Boolean).join(', ');
}

function formatCityLine(address = {}) {
  const cityUf = [address.city, address.uf].filter(Boolean).join(' - ');
  const cep = formatCep(address.cep);
  const phone = address.phone ? `Fone/Fax: ${address.phone}` : '';
  return [address.district, cep, cityUf, phone].filter(Boolean).join(' - ');
}

function freightLabel(modFrete) {
  const labels = {
    0: '0-Por conta do Emitente',
    1: '1-Por conta do Dest.',
    2: '2-Por conta de Terceiros',
    3: '3-Proprio Remetente',
    4: '4-Proprio Destinatario',
    9: '9-Sem frete'
  };
  return labels[String(modFrete)] || asText(modFrete);
}

function buildDanfePayload(document, parsed) {
  const parsedJson = parsed?.parsed_xml_json || document.parsed_xml_json || {};
  const infNFe = parsedJson.infNFe || {};
  const emit = parsedJson.emit || {};
  const dest = parsedJson.dest || {};
  const protNFe = parsedJson.protNFe || {};
  const totals = parsedJson.totals || {};
  const transport = parsedJson.transport || {};
  const additionalInfo = parsedJson.additional_info || {};

  return {
    accessKey: parsed?.access_key || document.access_key,
    operationNature: parsed?.operation_nature || document.operation_nature || infNFe.natOp,
    documentNumber: parsed?.document_number || document.document_number || infNFe.nNF,
    series: parsed?.series || document.series || infNFe.serie,
    emissionDate: parsed?.emission_date || document.emission_date || infNFe.dhEmi,
    exitDate: infNFe.dhSaiEnt || infNFe.dEmi || parsed?.emission_date || document.emission_date,
    exitTime: infNFe.hSaiEnt || infNFe.dhSaiEnt || parsed?.emission_date || document.emission_date,
    totalValue: parsed?.total_value ?? document.total_value ?? infNFe.vNF,
    operationType: String(infNFe.tpNF || '1'),
    issuer: {
      name: parsed?.issuer_name || document.issuer_name || emit.name,
      fantasyName: emit.fantasy_name,
      cnpj: parsed?.issuer_cnpj || document.issuer_cnpj || emit.cnpj,
      ie: emit.ie,
      im: emit.im,
      cnae: emit.cnae,
      uf: emit.uf,
      address: emit.address || {}
    },
    recipient: {
      name: parsed?.recipient_name || document.recipient_name || dest.name,
      cnpj: parsed?.recipient_cnpj || document.recipient_cnpj || dest.cnpj,
      ie: dest.ie,
      email: dest.email,
      uf: dest.uf,
      address: dest.address || {}
    },
    protocol: {
      status: parsed?.sefaz_status_code || document.sefaz_status_code || protNFe.cStat,
      reason: parsed?.sefaz_status_description || document.sefaz_status_description || protNFe.xMotivo,
      number: protNFe.nProt,
      receivedAt: protNFe.dhRecbto
    },
    totals: {
      ...totals,
      vNF: totals.vNF ?? parsed?.total_value ?? document.total_value
    },
    transport,
    additionalInfo,
    items: Array.isArray(parsedJson.items) ? parsedJson.items : []
  };
}

function text(doc, value, x, y, options = {}) {
  doc.text(asText(value, ''), x, y, options);
}

function label(doc, value, x, y, width) {
  doc.font('Helvetica-Bold').fontSize(5).fillColor(COLORS.muted).text(value, x + 2, y + 2, { width: width - 4 });
}

function value(doc, valueText, x, y, width, height, options = {}) {
  doc.font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(options.size || 7)
    .fillColor(COLORS.ink)
    .text(asText(valueText), x + 2, y + 10, {
      width: width - 4,
      height: Math.max(8, height - 11),
      align: options.align || 'left'
    });
}

function box(doc, title, valueText, x, y, width, height, options = {}) {
  doc.rect(x, y, width, height).lineWidth(0.55).stroke(COLORS.line);
  label(doc, title, x, y, width);
  value(doc, valueText, x, y, width, height, options);
}

function sectionTitle(doc, title, x, y, width) {
  doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.ink).text(title, x, y - 8, { width });
}

function drawBarcode(doc, key, x, y, width, height) {
  const digits = onlyDigits(key);
  if (!digits) return;
  const narrow = Math.max(0.8, width / 320);
  let cursor = x;
  for (const char of digits) {
    const number = Number(char);
    const bars = [
      1 + (number % 3),
      1,
      1 + ((number + 1) % 2),
      1,
      1 + ((number + 2) % 3),
      1
    ];
    for (let index = 0; index < bars.length; index += 1) {
      const barWidth = bars[index] * narrow;
      if (index % 2 === 0) {
        doc.rect(cursor, y, barWidth, height).fill(COLORS.ink);
      }
      cursor += barWidth;
      if (cursor > x + width) return;
    }
  }
}

function drawReceiptStub(doc, payload, left, top, width) {
  const height = 58;
  const rightWidth = 118;
  doc.rect(left, top, width, height).lineWidth(0.55).stroke(COLORS.line);
  doc.moveTo(left + width - rightWidth, top).lineTo(left + width - rightWidth, top + height).stroke(COLORS.line);
  doc.moveTo(left, top + 36).lineTo(left + width, top + 36).stroke(COLORS.line);

  const receipt = `RECEBEMOS DE ${asText(payload.issuer.name, '').toUpperCase()} OS PRODUTOS E/OU SERVICOS CONSTANTES DA NOTA FISCAL ELETRONICA INDICADA ABAIXO.`;
  doc.font('Helvetica-Bold').fontSize(6).fillColor(COLORS.ink).text(receipt, left + 4, top + 5, { width: width - rightWidth - 8 });
  doc.font('Helvetica').fontSize(6).text(
    `EMISSAO: ${formatDate(payload.emissionDate)}  VALOR TOTAL: R$ ${formatMoneyPlain(payload.totalValue)}  DESTINATARIO: ${asText(payload.recipient.name)} - ${joinAddress(payload.recipient.address)}`,
    left + 4,
    top + 16,
    { width: width - rightWidth - 8, height: 18 }
  );

  box(doc, 'DATA DE RECEBIMENTO', '', left + 3, top + 38, 112, 17);
  box(doc, 'IDENTIFICACAO E ASSINATURA DO RECEBEDOR', '', left + 115, top + 38, width - rightWidth - 118, 17);

  doc.font('Helvetica-Bold').fontSize(14).text('NF-e', left + width - rightWidth + 38, top + 8);
  doc.font('Helvetica-Bold').fontSize(8).text(`No. ${formatNfeNumber(payload.documentNumber)}`, left + width - rightWidth + 12, top + 26, { width: rightWidth - 24, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(8).text(`Serie ${asText(payload.series)}`, left + width - rightWidth + 12, top + 38, { width: rightWidth - 24, align: 'center' });

  return top + height + 12;
}

function drawHeader(doc, payload, left, y, width) {
  const issuerWidth = 210;
  const danfeWidth = 150;
  const keyWidth = width - issuerWidth - danfeWidth;
  const height = 96;

  doc.rect(left, y, width, height).lineWidth(0.55).stroke(COLORS.line);
  doc.moveTo(left + issuerWidth, y).lineTo(left + issuerWidth, y + height).stroke(COLORS.line);
  doc.moveTo(left + issuerWidth + danfeWidth, y).lineTo(left + issuerWidth + danfeWidth, y + height).stroke(COLORS.line);

  doc.font('Helvetica-Bold').fontSize(6).text('IDENTIFICACAO DO EMITENTE', left + 4, y + 4, { width: issuerWidth - 8 });
  doc.font('Helvetica-Bold').fontSize(10).text(asText(payload.issuer.name), left + 4, y + 18, { width: issuerWidth - 8, align: 'center' });
  doc.font('Helvetica').fontSize(7).text(joinAddress(payload.issuer.address), left + 8, y + 39, { width: issuerWidth - 16, align: 'center' });
  doc.text(formatCityLine(payload.issuer.address), left + 8, y + 51, { width: issuerWidth - 16, align: 'center', height: 28 });

  const danfeX = left + issuerWidth;
  doc.font('Helvetica-Bold').fontSize(16).text('DANFE', danfeX, y + 7, { width: danfeWidth, align: 'center' });
  doc.font('Helvetica').fontSize(8).text('Documento Auxiliar da Nota\nFiscal Eletronica', danfeX + 12, y + 28, { width: danfeWidth - 24, align: 'center' });
  doc.font('Helvetica').fontSize(8).text('0 - ENTRADA', danfeX + 18, y + 52);
  doc.font('Helvetica').fontSize(8).text('1 - SAIDA', danfeX + 18, y + 64);
  doc.rect(danfeX + 78, y + 53, 15, 15).stroke(COLORS.line);
  doc.font('Helvetica-Bold').fontSize(10).text(payload.operationType === '0' ? '0' : '1', danfeX + 82, y + 56);
  doc.font('Helvetica-Bold').fontSize(8).text(`No. ${formatNfeNumber(payload.documentNumber)}`, danfeX, y + 76, { width: danfeWidth, align: 'center' });
  doc.font('Helvetica-Bold').fontSize(8).text(`Serie ${asText(payload.series)}    Folha 1/1`, danfeX, y + 87, { width: danfeWidth, align: 'center' });

  const keyX = left + issuerWidth + danfeWidth;
  label(doc, 'CHAVE DE ACESSO', keyX, y, keyWidth);
  drawBarcode(doc, payload.accessKey, keyX + 10, y + 13, keyWidth - 20, 26);
  doc.font('Helvetica-Bold').fontSize(7).text(formatAccessKey(payload.accessKey), keyX + 8, y + 45, { width: keyWidth - 16, align: 'center' });
  doc.font('Helvetica').fontSize(6).text(
    'Consulta de autenticidade no portal nacional da NF-e\nwww.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora',
    keyX + 7,
    y + 62,
    { width: keyWidth - 14, align: 'center' }
  );

  return y + height + 15;
}

function drawNatureAndProtocol(doc, payload, left, y, width) {
  const natureWidth = width * 0.58;
  box(doc, 'NATUREZA DA OPERACAO', payload.operationNature, left, y, natureWidth, 24, { size: 7 });
  box(doc, 'PROTOCOLO DE AUTORIZACAO DE USO', [payload.protocol.number, formatDateTime(payload.protocol.receivedAt)].filter(Boolean).join('  -  '), left + natureWidth, y, width - natureWidth, 24, { size: 7 });
  y += 24;

  const col = width / 4;
  box(doc, 'INSCRICAO ESTADUAL', payload.issuer.ie, left, y, col, 24);
  box(doc, 'INSCRICAO MUNICIPAL', payload.issuer.im, left + col, y, col, 24);
  box(doc, 'INSCRICAO ESTADUAL DO SUBST. TRIBUT.', '', left + col * 2, y, col, 24);
  box(doc, 'CNPJ / CPF', formatCpfCnpj(payload.issuer.cnpj), left + col * 3, y, col, 24);
  return y + 34;
}

function drawRecipient(doc, payload, left, y, width) {
  sectionTitle(doc, 'DESTINATARIO / REMETENTE', left, y, width);
  const row1 = y;
  box(doc, 'NOME / RAZAO SOCIAL', payload.recipient.name, left, row1, width * 0.58, 24);
  box(doc, 'CNPJ / CPF', formatCpfCnpj(payload.recipient.cnpj), left + width * 0.58, row1, width * 0.22, 24);
  box(doc, 'DATA DA EMISSAO', formatDate(payload.emissionDate), left + width * 0.80, row1, width * 0.20, 24);

  const row2 = row1 + 24;
  box(doc, 'ENDERECO', joinAddress(payload.recipient.address), left, row2, width * 0.58, 24);
  box(doc, 'BAIRRO / DISTRITO', payload.recipient.address.district, left + width * 0.58, row2, width * 0.22, 24);
  box(doc, 'CEP', formatCep(payload.recipient.address.cep), left + width * 0.80, row2, width * 0.20, 24);

  const row3 = row2 + 24;
  box(doc, 'MUNICIPIO', payload.recipient.address.city, left, row3, width * 0.32, 24);
  box(doc, 'UF', payload.recipient.address.uf, left + width * 0.32, row3, width * 0.08, 24, { align: 'center' });
  box(doc, 'FONE / FAX', payload.recipient.address.phone, left + width * 0.40, row3, width * 0.18, 24);
  box(doc, 'INSCRICAO ESTADUAL', payload.recipient.ie, left + width * 0.58, row3, width * 0.22, 24);
  box(doc, 'DATA DA SAIDA/ENTRADA', formatDate(payload.exitDate), left + width * 0.80, row3, width * 0.20, 24);

  const row4 = row3 + 24;
  box(doc, 'HORA DA SAIDA/ENTRADA', formatTime(payload.exitTime), left + width * 0.80, row4, width * 0.20, 22);

  return row4 + 32;
}

function drawTotals(doc, payload, left, y, width) {
  sectionTitle(doc, 'CALCULO DO IMPOSTO', left, y, width);
  const total = payload.totals || {};
  const rowHeight = 23;
  const row1 = [
    ['BASE DE CALC. DO ICMS', total.vBC],
    ['VALOR DO ICMS', total.vICMS],
    ['BASE DE CALC. ICMS S.T.', total.vBCST],
    ['VALOR DO ICMS SUBST.', total.vST],
    ['V. IMP. IMPORTACAO', total.vII],
    ['V. ICMS UF REMET.', total.vICMSUFRemet],
    ['V. FCP UF DEST.', total.vFCPUFDest],
    ['V. TOTAL PRODUTOS', total.vProd]
  ];
  const row2 = [
    ['VALOR DO FRETE', total.vFrete],
    ['VALOR DO SEGURO', total.vSeg],
    ['DESCONTO', total.vDesc],
    ['OUTRAS DESPESAS', total.vOutro],
    ['VALOR TOTAL IPI', total.vIPI],
    ['V. ICMS UF DEST.', total.vICMSUFDest],
    ['V. TOT. TRIB.', total.vTotTrib],
    ['V. TOTAL DA NOTA', total.vNF ?? payload.totalValue]
  ];
  const colWidth = width / row1.length;
  row1.forEach(([title, val], index) => box(doc, title, formatMoneyPlain(val), left + colWidth * index, y, colWidth, rowHeight, { align: 'right' }));
  y += rowHeight;
  row2.forEach(([title, val], index) => box(doc, title, formatMoneyPlain(val), left + colWidth * index, y, colWidth, rowHeight, { align: 'right' }));
  return y + rowHeight + 16;
}

function drawTransport(doc, payload, left, y, width) {
  sectionTitle(doc, 'TRANSPORTADOR / VOLUMES TRANSPORTADOS', left, y, width);
  const transport = payload.transport || {};
  const carrier = transport.carrier || {};
  const vehicle = transport.vehicle || {};
  const volumes = transport.volumes || {};
  const rowHeight = 23;

  box(doc, 'NOME / RAZAO SOCIAL', carrier.name, left, y, width * 0.34, rowHeight);
  box(doc, 'FRETE', freightLabel(transport.modFrete), left + width * 0.34, y, width * 0.18, rowHeight);
  box(doc, 'CODIGO ANTT', vehicle.rntc, left + width * 0.52, y, width * 0.12, rowHeight);
  box(doc, 'PLACA DO VEICULO', vehicle.plate, left + width * 0.64, y, width * 0.14, rowHeight);
  box(doc, 'UF', vehicle.uf, left + width * 0.78, y, width * 0.07, rowHeight);
  box(doc, 'CNPJ / CPF', formatCpfCnpj(carrier.cnpj), left + width * 0.85, y, width * 0.15, rowHeight);
  y += rowHeight;

  box(doc, 'ENDERECO', carrier.address, left, y, width * 0.52, rowHeight);
  box(doc, 'MUNICIPIO', carrier.city, left + width * 0.52, y, width * 0.26, rowHeight);
  box(doc, 'UF', carrier.uf, left + width * 0.78, y, width * 0.07, rowHeight);
  box(doc, 'INSCRICAO ESTADUAL', carrier.ie, left + width * 0.85, y, width * 0.15, rowHeight);
  y += rowHeight;

  const col = width / 6;
  box(doc, 'QUANTIDADE', volumes.quantity == null ? '' : formatNumber(volumes.quantity, 3), left, y, col, rowHeight);
  box(doc, 'ESPECIE', volumes.species, left + col, y, col, rowHeight);
  box(doc, 'MARCA', volumes.brand, left + col * 2, y, col, rowHeight);
  box(doc, 'NUMERACAO', volumes.numbering, left + col * 3, y, col, rowHeight);
  box(doc, 'PESO BRUTO', volumes.gross_weight == null ? '' : formatNumber(volumes.gross_weight, 3), left + col * 4, y, col, rowHeight);
  box(doc, 'PESO LIQUIDO', volumes.net_weight == null ? '' : formatNumber(volumes.net_weight, 3), left + col * 5, y, col, rowHeight);
  return y + rowHeight + 16;
}

function drawProductHeader(doc, left, y, width) {
  sectionTitle(doc, 'DADOS DOS PRODUTOS / SERVICOS', left, y, width);
  const columns = productColumns(width);
  doc.rect(left, y, width, 19).lineWidth(0.55).stroke(COLORS.line);
  let x = left;
  doc.font('Helvetica-Bold').fontSize(5).fillColor(COLORS.ink);
  for (const column of columns) {
    doc.text(column.label, x + 1, y + 3, { width: column.width - 2, height: 14, align: column.align || 'left' });
    if (x > left) doc.moveTo(x, y).lineTo(x, y + 19).stroke(COLORS.line);
    x += column.width;
  }
  return y + 19;
}

function productColumns(width) {
  return [
    { key: 'cProd', label: 'CODIGO\nPRODUTO', width: 48 },
    { key: 'xProd', label: 'DESCRICAO DO PRODUTO / SERVICO', width: width - 421 },
    { key: 'NCM', label: 'NCM/SH', width: 36 },
    { key: 'CST', label: 'O/CST', width: 25 },
    { key: 'CFOP', label: 'CFOP', width: 26 },
    { key: 'uCom', label: 'UN', width: 20 },
    { key: 'qCom', label: 'QUANT', width: 34, align: 'right' },
    { key: 'vUnCom', label: 'VALOR\nUNIT', width: 34, align: 'right' },
    { key: 'vProd', label: 'VALOR\nTOTAL', width: 34, align: 'right' },
    { key: 'vDesc', label: 'VALOR\nDESC', width: 28, align: 'right' },
    { key: 'vBC', label: 'B.CALC\nICMS', width: 32, align: 'right' },
    { key: 'vICMS', label: 'VALOR\nICMS', width: 32, align: 'right' },
    { key: 'vIPI', label: 'VALOR\nIPI', width: 28, align: 'right' },
    { key: 'pICMS', label: 'ALIQ.\nICMS', width: 22, align: 'right' },
    { key: 'pIPI', label: 'ALIQ.\nIPI', width: 22, align: 'right' }
  ];
}

function itemValue(item, key) {
  if (key === 'qCom') return formatQuantity(item[key]);
  if (['vUnCom', 'vProd', 'vDesc', 'vBC', 'vICMS', 'vIPI', 'pICMS', 'pIPI'].includes(key)) {
    if (item[key] == null) return '';
    return formatNumber(item[key], 2);
  }
  return asText(item[key], '');
}

function drawProducts(doc, payload, left, y, width, bottom) {
  y = drawProductHeader(doc, left, y, width);
  const columns = productColumns(width);
  const items = payload.items.length ? payload.items : [{ xProd: 'Sem itens detalhados no XML parseado.' }];

  for (const item of items.slice(0, 120)) {
    const descriptionHeight = doc.heightOfString(asText(item.xProd, ''), { width: columns[1].width - 2, size: 5 });
    const rowHeight = Math.max(18, Math.min(44, descriptionHeight + 8));
    if (y + rowHeight > bottom - 86) {
      doc.addPage();
      y = doc.page.margins.top;
      y = drawProductHeader(doc, left, y, width);
    }

    doc.rect(left, y, width, rowHeight).lineWidth(0.35).stroke(COLORS.line);
    let x = left;
    doc.font('Helvetica').fontSize(5).fillColor(COLORS.ink);
    for (const column of columns) {
      if (x > left) doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke(COLORS.line);
      doc.text(itemValue(item, column.key), x + 1, y + 3, {
        width: column.width - 2,
        height: rowHeight - 4,
        align: column.align || 'left'
      });
      x += column.width;
    }
    y += rowHeight;
  }

  if (payload.items.length > 120) {
    doc.font('Helvetica').fontSize(6).fillColor(COLORS.muted).text(`PDF limitado aos primeiros 120 itens de ${payload.items.length}.`, left, y + 4, { width });
    y += 14;
  }

  return y + 12;
}

function drawAdditionalInfo(doc, payload, left, y, width, bottom) {
  if (y + 88 > bottom) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  sectionTitle(doc, 'DADOS ADICIONAIS', left, y, width);
  const half = width / 2;
  const height = Math.max(72, bottom - y - 20);
  box(doc, 'INFORMACOES COMPLEMENTARES', compactText(payload.additionalInfo?.infCpl), left, y, half, height, { size: 6 });
  box(doc, 'RESERVADO AO FISCO', compactText(payload.additionalInfo?.infAdFisco), left + half, y, half, height, { size: 6 });
  doc.font('Helvetica').fontSize(5).fillColor(COLORS.muted).text(`Impresso em ${formatDateTime(new Date())}`, left + 4, y + height - 10, { width: half - 8 });
  return y + height;
}

function buildDanfePdfBuffer({ document, parsed }) {
  return new Promise((resolve, reject) => {
    const payload = buildDanfePayload(document, parsed);
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 18, bufferPages: false });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bottom = doc.page.height - doc.page.margins.bottom;
    let y = doc.page.margins.top;

    y = drawReceiptStub(doc, payload, left, y, width);
    y = drawHeader(doc, payload, left, y, width);
    y = drawNatureAndProtocol(doc, payload, left, y, width);
    y = drawRecipient(doc, payload, left, y, width);
    y = drawTotals(doc, payload, left, y, width);
    y = drawTransport(doc, payload, left, y, width);
    y = drawProducts(doc, payload, left, y, width, bottom);
    drawAdditionalInfo(doc, payload, left, y, width, bottom);

    doc.end();
  });
}

async function gerarDanfeDocumentoFiscal(req, id) {
  const document = await FiscalDfeDocument.findByPk(id, {
    include: [
      { model: FiscalCompany, as: 'company', attributes: ['id', 'razao_social', 'cnpj', 'uf'], required: false }
    ]
  });

  if (!document) {
    throw createHttpError('Documento fiscal nao encontrado.', 404);
  }
  if (!document.xml_storage_key) {
    throw createHttpError('XML fiscal indisponivel para gerar DANFE.', 400);
  }

  const xmlBuffer = await getFiscalObjectBuffer(document.xml_storage_key);
  const xml = xmlBuffer.toString('utf8');
  const parsed = parseNfeXml(xml);
  const xmlItemCount = countNfeItemBlocks(xml);
  const parsedItemCount = parsed.parsed_xml_json?.items?.length || 0;

  if (xmlItemCount > 0 && parsedItemCount === 0) {
    throw createHttpError('Nao foi possivel extrair os itens do XML fiscal para gerar o DANFE. Verifique o XML importado.', 422);
  }

  const pdfBuffer = await buildDanfePdfBuffer({ document, parsed });
  const storage = await uploadFiscalObject({
    key: buildFiscalObjectKey({
      cnpj: document.company?.cnpj || document.recipient_cnpj || document.issuer_cnpj || parsed.recipient_cnpj || 'sem-cnpj',
      documentType: document.document_type || 'nfe',
      accessKey: document.access_key || parsed.access_key,
      folder: 'danfe',
      filename: 'danfe.pdf',
      date: document.emission_date || parsed.emission_date || new Date()
    }),
    body: pdfBuffer,
    contentType: 'application/pdf',
    metadata: {
      fiscal_document_id: document.id,
      fiscal_company_id: document.fiscal_company_id,
      file_type: 'danfe',
      generated_by: 'fluxy',
      access_key: document.access_key || parsed.access_key,
      item_count: String(parsedItemCount)
    }
  });

  await document.update({
    danfe_storage_key: storage.key,
    parsed_xml_json: parsed.parsed_xml_json || document.parsed_xml_json
  });

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'FISCAL_DANFE_GENERATED',
    recursoTipo: 'FISCAL_DFE_DOCUMENT',
    recursoId: document.id,
    status: 'SUCCESS',
    descricao: 'DANFE gerado a partir do XML fiscal',
    metadata: {
      fiscal_company_id: document.fiscal_company_id,
      access_key: document.access_key,
      storage_key: storage.key,
      item_count: parsedItemCount
    }
  });

  return {
    document: await FiscalDfeDocument.findByPk(document.id, {
      include: [
        { model: FiscalCompany, as: 'company', attributes: ['id', 'razao_social', 'cnpj', 'uf'], required: false }
      ]
    }),
    file_type: 'danfe',
    storage,
    url: await getFiscalObjectSignedUrl(storage.key),
    expires_in_seconds: Number(process.env.FISCAL_S3_PRESIGNED_EXPIRES_SECONDS || 300)
  };
}

module.exports = {
  buildDanfePdfBuffer,
  gerarDanfeDocumentoFiscal
};
