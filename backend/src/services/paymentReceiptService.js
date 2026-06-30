const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const {
  ContaBancaria,
  EmpresaGrupo,
  Historico,
  Parceiro,
  PaymentAccount,
  PaymentBatch,
  PaymentBatchItem,
  PaymentBeneficiary,
  PaymentIntent,
  PaymentProvider,
  PaymentTransaction,
  TituloFinanceiro,
  sequelize
} = require('../models');
const { getPresignedUrl, uploadToS3 } = require('./s3');

const COMPROVANTE_STATUSES = new Set([
  'AGUARDANDO_CONFIRMACAO_BAIXA',
  'BAIXADO',
  'CONFIRMADO_BANCO',
  'PAGO',
  'QUITADO'
]);

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatCpfCnpj(value) {
  const digits = onlyDigits(value);
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value || '-';
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function normalizeStatus(value) {
  return String(value || '').toUpperCase();
}

function normalizeText(value) {
  return String(value || '').trim();
}

function findDeepValue(source, candidates = []) {
  const keys = new Set(candidates.map((key) => String(key).toLowerCase()));
  let found = null;

  function walk(value) {
    if (found !== null || value === null || value === undefined) return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (typeof value !== 'object') return;

    for (const [key, itemValue] of Object.entries(value)) {
      if (found !== null) return;
      if (keys.has(String(key).toLowerCase()) && itemValue !== null && itemValue !== undefined && String(itemValue).trim() !== '') {
        found = String(itemValue);
        return;
      }
      walk(itemValue);
    }
  }

  walk(source);
  return found;
}

function getDisplayStatus(item, intent) {
  const status = normalizeStatus(item?.status || intent?.status);
  if (status === 'BAIXADO' || status === 'QUITADO') return 'PAGAMENTO BAIXADO';
  return 'PAGAMENTO CONFIRMADO PELO BANCO';
}

function getPaymentDate(item, transaction, intent) {
  return (
    intent?.confirmado_banco_em ||
    transaction?.finished_at ||
    item?.updatedAt ||
    new Date()
  );
}

function getTransactionProtocol(transaction, batch) {
  return (
    findDeepValue(transaction?.response_snapshot, [
      'numeroRequisicao',
      'numeroRequisicaoPagamento',
      'codigoPagamento',
      'protocolo',
      'protocoloPagamento',
      'idRequisicao',
      'requestNumber'
    ]) ||
    transaction?.provider_transaction_id ||
    transaction?.provider_batch_id ||
    batch?.correlation_id ||
    '-'
  );
}

function getTransactionEndToEnd(transaction) {
  return findDeepValue(transaction?.response_snapshot, [
    'endToEndId',
    'endToEnd',
    'e2eId',
    'idFimAFim',
    'codigoEndToEnd'
  ]) || '-';
}

function buildReceiptData(item, transaction) {
  const intent = item.intent;
  const batch = item.batch;
  const paymentAccount = intent?.paymentAccount || batch?.paymentAccount;
  const beneficiary = intent?.beneficiary;
  const parceiro = beneficiary?.parceiro || intent?.titulo?.parceiro;
  const empresa = paymentAccount?.empresa || batch?.empresa;

  return {
    titulo: 'COMPROVANTE DE PAGAMENTO PIX',
    origem: 'Gerado a partir do retorno confirmado pelo Banco do Brasil.',
    status: getDisplayStatus(item, intent),
    data_pagamento: getPaymentDate(item, transaction, intent),
    pagador_nome: normalizeText(empresa?.razao_social || empresa?.nome || 'Empresa pagadora'),
    pagador_documento: formatCpfCnpj(paymentAccount?.cnpj_pagador || empresa?.cnpj),
    instituicao_pagadora: 'Banco do Brasil',
    favorecido_nome: normalizeText(beneficiary?.nome || parceiro?.nome || 'Favorecido'),
    favorecido_documento: formatCpfCnpj(beneficiary?.cpf_cnpj || parceiro?.cpf_cnpj),
    pix_tipo_chave: normalizeText(beneficiary?.pix_tipo_chave || 'PIX'),
    pix_chave: normalizeText(beneficiary?.pix_chave || '-'),
    valor: Number(item.valor || intent?.valor || 0),
    forma_pagamento: 'PIX',
    protocolo_banco: getTransactionProtocol(transaction, batch),
    end_to_end_id: getTransactionEndToEnd(transaction)
  };
}

function receiptHash(receiptData) {
  const payload = {
    status: receiptData.status,
    data_pagamento: receiptData.data_pagamento,
    pagador_documento: receiptData.pagador_documento,
    favorecido_documento: receiptData.favorecido_documento,
    pix_tipo_chave: receiptData.pix_tipo_chave,
    pix_chave: receiptData.pix_chave,
    valor: receiptData.valor,
    protocolo_banco: receiptData.protocolo_banco,
    end_to_end_id: receiptData.end_to_end_id
  };
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function drawKeyValue(doc, label, value, x, y, width = 220) {
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor('#64748b')
    .text(label.toUpperCase(), x, y, { width });
  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor('#0f172a')
    .text(value || '-', x, y + 13, { width });
}

function drawSectionTitle(doc, title, y) {
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#1d4ed8')
    .text(title.toUpperCase(), 56, y);
  doc
    .moveTo(56, y + 16)
    .lineTo(539, y + 16)
    .lineWidth(0.6)
    .strokeColor('#dbeafe')
    .stroke();
}

function createReceiptPdfBuffer(receiptData, hash) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 56,
      info: {
        Title: 'Comprovante de Pagamento PIX',
        Author: 'Fluxy'
      }
    });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc
      .roundedRect(46, 42, 503, 72, 10)
      .fillColor('#eff6ff')
      .fill();
    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor('#0f172a')
      .text(receiptData.titulo, 64, 60);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#475569')
      .text(receiptData.origem, 64, 84);
    doc
      .roundedRect(390, 61, 126, 30, 15)
      .fillColor('#dcfce7')
      .fill();
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#047857')
      .text('CONFIRMADO', 414, 71);

    drawSectionTitle(doc, 'Status do pagamento', 142);
    drawKeyValue(doc, 'Status', receiptData.status, 56, 172, 230);
    drawKeyValue(doc, 'Data do pagamento', formatDate(receiptData.data_pagamento), 322, 172, 200);

    drawSectionTitle(doc, 'Dados do pagador', 226);
    drawKeyValue(doc, 'Pagador', receiptData.pagador_nome, 56, 256, 270);
    drawKeyValue(doc, 'CPF/CNPJ', receiptData.pagador_documento, 350, 256, 160);
    drawKeyValue(doc, 'Instituicao pagadora', receiptData.instituicao_pagadora, 56, 304, 260);

    drawSectionTitle(doc, 'Dados do favorecido', 358);
    drawKeyValue(doc, 'Favorecido', receiptData.favorecido_nome, 56, 388, 270);
    drawKeyValue(doc, 'CPF/CNPJ', receiptData.favorecido_documento, 350, 388, 160);
    drawKeyValue(doc, 'Tipo de chave PIX', receiptData.pix_tipo_chave, 56, 436, 160);
    drawKeyValue(doc, 'Chave PIX', receiptData.pix_chave, 232, 436, 300);

    drawSectionTitle(doc, 'Dados do pagamento', 490);
    drawKeyValue(doc, 'Valor', formatCurrency(receiptData.valor), 56, 520, 160);
    drawKeyValue(doc, 'Forma de pagamento', receiptData.forma_pagamento, 232, 520, 160);
    drawKeyValue(doc, 'Protocolo Banco do Brasil', receiptData.protocolo_banco, 56, 568, 230);
    drawKeyValue(doc, 'EndToEndId', receiptData.end_to_end_id, 322, 568, 210);

    doc
      .roundedRect(56, 636, 483, 66, 8)
      .fillColor('#f8fafc')
      .fill();
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#334155')
      .text(
        'Este comprovante foi gerado pelo Fluxy com base no retorno de pagamento confirmado pelo Banco do Brasil.',
        74,
        654,
        { width: 445 }
      );
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#64748b')
      .text('HASH DO COMPROVANTE', 74, 684);
    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#475569')
      .text(hash, 184, 684, { width: 330 });

    doc.end();
  });
}

async function loadPaymentItem(batchId, itemId, { transaction = null, lock = null } = {}) {
  return PaymentBatchItem.findOne({
    where: {
      id: itemId,
      payment_batch_id: batchId
    },
    include: [
      {
        model: PaymentBatch,
        as: 'batch',
        include: [
          { model: PaymentProvider, as: 'provider', attributes: ['id', 'codigo', 'nome', 'ambiente'] },
          { model: EmpresaGrupo, as: 'empresa', attributes: ['id', 'nome', 'razao_social', 'cnpj'] },
          {
            model: PaymentAccount,
            as: 'paymentAccount',
            include: [
              { model: ContaBancaria, as: 'contaBancaria', attributes: ['id', 'nome', 'banco', 'agencia', 'conta'] },
              { model: EmpresaGrupo, as: 'empresa', attributes: ['id', 'nome', 'razao_social', 'cnpj'] }
            ]
          }
        ]
      },
      {
        model: PaymentIntent,
        as: 'intent',
        include: [
          {
            model: TituloFinanceiro,
            as: 'titulo',
            include: [{ model: Parceiro, as: 'parceiro', attributes: ['id', 'nome', 'cpf_cnpj'] }]
          },
          {
            model: PaymentBeneficiary,
            as: 'beneficiary',
            include: [{ model: Parceiro, as: 'parceiro', attributes: ['id', 'nome', 'cpf_cnpj'] }]
          },
          {
            model: PaymentAccount,
            as: 'paymentAccount',
            include: [
              { model: ContaBancaria, as: 'contaBancaria', attributes: ['id', 'nome', 'banco', 'agencia', 'conta'] },
              { model: EmpresaGrupo, as: 'empresa', attributes: ['id', 'nome', 'razao_social', 'cnpj'] }
            ]
          }
        ]
      }
    ],
    transaction,
    lock
  });
}

async function getLatestBankTransaction(batchId) {
  return PaymentTransaction.findOne({
    where: {
      payment_batch_id: batchId,
      status: {
        [Op.in]: [
          'AGUARDANDO_CONFIRMACAO_BAIXA',
          'CONFIRMADO_BANCO',
          'BAIXADO',
          'ENVIADO_AO_BANCO',
          'PROCESSANDO_BANCO'
        ]
      }
    },
    order: [['finished_at', 'DESC'], ['createdAt', 'DESC']]
  });
}

function assertItemCanGenerateReceipt(item) {
  const itemStatus = normalizeStatus(item?.status);
  const intentStatus = normalizeStatus(item?.intent?.status);
  if (!COMPROVANTE_STATUSES.has(itemStatus) && !COMPROVANTE_STATUSES.has(intentStatus)) {
    throw createHttpError(400, 'Comprovante disponivel somente para pagamento confirmado pelo banco ou ja baixado.');
  }
}

async function buildExistingResponse(item) {
  return {
    comprovante_pdf_url: item.comprovante_pdf_url,
    comprovante_hash: item.comprovante_hash,
    comprovante_gerado_em: item.comprovante_gerado_em,
    signed_url: await getPresignedUrl(item.comprovante_pdf_url, 900)
  };
}

async function gerarComprovantePagamentoBb(req, batchId, itemId) {
  const item = await loadPaymentItem(batchId, itemId);
  if (!item) throw createHttpError(404, 'Item do lote de pagamento nao encontrado.');

  assertItemCanGenerateReceipt(item);
  if (item.comprovante_pdf_url) {
    return buildExistingResponse(item);
  }

  const transaction = await getLatestBankTransaction(batchId);
  const receiptData = buildReceiptData(item, transaction);
  const hash = receiptHash(receiptData);
  const pdfBuffer = await createReceiptPdfBuffer(receiptData, hash);
  const safeCode = String(item.intent?.titulo?.codigo || `item-${item.id}`).replace(/[^a-zA-Z0-9_-]/g, '-');
  const folder = `pagamentos/comprovantes-bb/${String(item.batch?.codigo || batchId).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const uploadedUrl = await uploadToS3({
    originalname: `comprovante-pix-${safeCode}.pdf`,
    buffer: pdfBuffer,
    mimetype: 'application/pdf'
  }, folder);

  let persistedUrl = uploadedUrl;
  let persistedGeneratedAt = new Date();

  await sequelize.transaction(async (transactionScope) => {
    const lockedItem = await loadPaymentItem(batchId, itemId, {
      transaction: transactionScope,
      lock: transactionScope.LOCK.UPDATE
    });
    if (!lockedItem) throw createHttpError(404, 'Item do lote de pagamento nao encontrado.');
    assertItemCanGenerateReceipt(lockedItem);

    if (lockedItem.comprovante_pdf_url) {
      persistedUrl = lockedItem.comprovante_pdf_url;
      persistedGeneratedAt = lockedItem.comprovante_gerado_em;
      return;
    }

    await lockedItem.update({
      comprovante_pdf_url: uploadedUrl,
      comprovante_hash: hash,
      comprovante_gerado_em: persistedGeneratedAt
    }, { transaction: transactionScope });

    const solicitacaoId = lockedItem.intent?.titulo?.solicitacao_id;
    if (solicitacaoId) {
      await Historico.create({
        solicitacao_id: solicitacaoId,
        usuario_responsavel_id: req.user?.id || null,
        setor: req.user?.setor?.codigo || req.user?.area || 'FINANCEIRO',
        acao: 'COMPROVANTE_PAGAMENTO_BB_GERADO',
        descricao: 'Comprovante de pagamento Banco do Brasil gerado para envio ao favorecido.',
        metadata: JSON.stringify({
          payment_batch_item_id: lockedItem.id,
          payment_intent_id: lockedItem.payment_intent_id,
          comprovante_hash: hash,
          comprovante_pdf_url: uploadedUrl
        })
      }, { transaction: transactionScope });
    }
  });

  return {
    comprovante_pdf_url: persistedUrl,
    comprovante_hash: hash,
    comprovante_gerado_em: persistedGeneratedAt,
    signed_url: await getPresignedUrl(persistedUrl, 900)
  };
}

module.exports = {
  gerarComprovantePagamentoBb
};
