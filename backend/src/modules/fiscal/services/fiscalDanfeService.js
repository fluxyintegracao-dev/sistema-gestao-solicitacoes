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
const { parseNfeXml } = require('./fiscalXmlParserService');

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
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

function formatAccessKey(value) {
  const digits = onlyDigits(value);
  if (digits.length !== 44) return value || '-';
  return digits.match(/.{1,4}/g).join(' ');
}

function formatDate(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function asText(value, fallback = '-') {
  const text = String(value == null ? '' : value).trim();
  return text || fallback;
}

function buildDanfePayload(document, parsed) {
  const parsedJson = parsed?.parsed_xml_json || document.parsed_xml_json || {};
  const infNFe = parsedJson.infNFe || {};
  const emit = parsedJson.emit || {};
  const dest = parsedJson.dest || {};
  const protNFe = parsedJson.protNFe || {};

  return {
    accessKey: parsed?.access_key || document.access_key,
    operationNature: parsed?.operation_nature || document.operation_nature || infNFe.natOp,
    documentNumber: parsed?.document_number || document.document_number || infNFe.nNF,
    series: parsed?.series || document.series || infNFe.serie,
    emissionDate: parsed?.emission_date || document.emission_date || infNFe.dhEmi,
    totalValue: parsed?.total_value ?? document.total_value ?? infNFe.vNF,
    issuer: {
      name: parsed?.issuer_name || document.issuer_name || emit.name,
      cnpj: parsed?.issuer_cnpj || document.issuer_cnpj || emit.cnpj,
      ie: emit.ie,
      uf: emit.uf
    },
    recipient: {
      name: parsed?.recipient_name || document.recipient_name || dest.name,
      cnpj: parsed?.recipient_cnpj || document.recipient_cnpj || dest.cnpj,
      ie: dest.ie,
      uf: dest.uf
    },
    protocol: {
      status: parsed?.sefaz_status_code || document.sefaz_status_code || protNFe.cStat,
      reason: parsed?.sefaz_status_description || document.sefaz_status_description || protNFe.xMotivo,
      number: protNFe.nProt
    },
    items: Array.isArray(parsedJson.items) ? parsedJson.items : []
  };
}

function drawBox(doc, label, value, x, y, width, height = 38) {
  doc.rect(x, y, width, height).stroke('#CBD5E1');
  doc.font('Helvetica-Bold').fontSize(6).fillColor('#64748B').text(label, x + 5, y + 5, { width: width - 10 });
  doc.font('Helvetica').fontSize(8).fillColor('#0F172A').text(asText(value), x + 5, y + 16, { width: width - 10, height: height - 18 });
}

function drawSectionTitle(doc, title, left, y, width) {
  doc.rect(left, y, width, 18).fillAndStroke('#E2E8F0', '#CBD5E1');
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#0F172A').text(title, left + 6, y + 5, { width: width - 12 });
}

function drawItems(doc, items, left, y, width, bottom) {
  drawSectionTitle(doc, 'Produtos / Servicos', left, y, width);
  y += 18;

  const columns = [
    { key: 'cProd', label: 'COD', width: 52 },
    { key: 'xProd', label: 'DESCRICAO', width: width - 252 },
    { key: 'NCM', label: 'NCM', width: 48 },
    { key: 'CFOP', label: 'CFOP', width: 34 },
    { key: 'qCom', label: 'QTD', width: 42 },
    { key: 'vUnCom', label: 'UNIT.', width: 42 },
    { key: 'vProd', label: 'TOTAL', width: 34 }
  ];

  const drawHeader = () => {
    let x = left;
    doc.rect(left, y, width, 16).fillAndStroke('#F8FAFC', '#CBD5E1');
    doc.font('Helvetica-Bold').fontSize(6).fillColor('#334155');
    for (const column of columns) {
      doc.text(column.label, x + 3, y + 5, { width: column.width - 6 });
      x += column.width;
    }
    y += 16;
  };

  drawHeader();
  const safeItems = items.length ? items : [{ xProd: 'Sem itens detalhados no XML parseado.' }];

  for (const item of safeItems.slice(0, 80)) {
    if (y + 24 > bottom) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeader();
    }

    let x = left;
    doc.rect(left, y, width, 22).stroke('#E2E8F0');
    doc.font('Helvetica').fontSize(6).fillColor('#0F172A');
    for (const column of columns) {
      const rawValue = item[column.key];
      const value = ['qCom', 'vUnCom', 'vProd'].includes(column.key) && rawValue != null
        ? Number(rawValue).toLocaleString('pt-BR', { minimumFractionDigits: column.key === 'qCom' ? 3 : 2, maximumFractionDigits: column.key === 'qCom' ? 4 : 2 })
        : asText(rawValue, '');
      doc.text(value, x + 3, y + 5, { width: column.width - 6, height: 13 });
      x += column.width;
    }
    y += 22;
  }

  if (items.length > 80) {
    doc.font('Helvetica').fontSize(7).fillColor('#64748B').text(`PDF limitado aos primeiros 80 itens de ${items.length}.`, left, y + 6, { width });
    y += 18;
  }

  return y;
}

function buildDanfePdfBuffer({ document, parsed }) {
  return new Promise((resolve, reject) => {
    const payload = buildDanfePayload(document, parsed);
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 28, bufferPages: false });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bottom = doc.page.height - doc.page.margins.bottom;
    let y = 28;

    doc.font('Helvetica-Bold').fontSize(15).fillColor('#0F172A').text('DANFE', left, y);
    doc.font('Helvetica').fontSize(7).fillColor('#475569').text('Documento Auxiliar da Nota Fiscal Eletronica', left + 63, y + 4);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A').text(`NF-e ${asText(payload.documentNumber)} serie ${asText(payload.series)}`, left, y + 22);
    doc.font('Helvetica').fontSize(7).fillColor('#475569').text(`Gerado pelo Fluxy em ${formatDateTime(new Date())}`, left + 230, y + 24, {
      width: width - 230,
      align: 'right'
    });
    y += 44;

    drawBox(doc, 'CHAVE DE ACESSO', formatAccessKey(payload.accessKey), left, y, width, 42);
    y += 50;

    const half = (width - 8) / 2;
    drawSectionTitle(doc, 'Emitente', left, y, half);
    drawSectionTitle(doc, 'Destinatario', left + half + 8, y, half);
    y += 18;
    drawBox(doc, 'RAZAO SOCIAL / NOME', payload.issuer.name, left, y, half, 42);
    drawBox(doc, 'RAZAO SOCIAL / NOME', payload.recipient.name, left + half + 8, y, half, 42);
    y += 42;
    drawBox(doc, 'CNPJ / CPF', formatCpfCnpj(payload.issuer.cnpj), left, y, half * 0.62, 34);
    drawBox(doc, 'IE / UF', [payload.issuer.ie, payload.issuer.uf].filter(Boolean).join(' / '), left + half * 0.62, y, half * 0.38, 34);
    drawBox(doc, 'CNPJ / CPF', formatCpfCnpj(payload.recipient.cnpj), left + half + 8, y, half * 0.62, 34);
    drawBox(doc, 'IE / UF', [payload.recipient.ie, payload.recipient.uf].filter(Boolean).join(' / '), left + half + 8 + half * 0.62, y, half * 0.38, 34);
    y += 44;

    drawSectionTitle(doc, 'Dados da NF-e', left, y, width);
    y += 18;
    const third = width / 3;
    drawBox(doc, 'NATUREZA DA OPERACAO', payload.operationNature, left, y, third, 38);
    drawBox(doc, 'EMISSAO', formatDate(payload.emissionDate), left + third, y, third, 38);
    drawBox(doc, 'VALOR TOTAL', formatMoney(payload.totalValue), left + third * 2, y, third, 38);
    y += 38;
    drawBox(doc, 'PROTOCOLO', payload.protocol.number, left, y, third, 34);
    drawBox(doc, 'STATUS SEFAZ', payload.protocol.status, left + third, y, third, 34);
    drawBox(doc, 'MOTIVO', payload.protocol.reason, left + third * 2, y, third, 34);
    y += 46;

    y = drawItems(doc, payload.items, left, y, width, bottom);
    y += 12;

    if (y + 34 > bottom) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    doc.rect(left, y, width, 34).stroke('#CBD5E1');
    doc.font('Helvetica').fontSize(7).fillColor('#475569').text(
      'DANFE gerado a partir do XML fiscal armazenado no Fluxy. Use o XML autorizado como documento fiscal principal para auditoria e escrituração.',
      left + 6,
      y + 8,
      { width: width - 12 }
    );

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
      access_key: document.access_key || parsed.access_key
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
      storage_key: storage.key
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
