const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const {
  ContratoComercial,
  ContratoComercialDocumento,
  ContratoComercialModelo,
  ContratoComercialParcela,
  Empreendimento,
  Obra,
  Parceiro,
  TituloFinanceiro,
  UnidadeComercial,
  User
} = require('../models');
const { getPresignedUrl, uploadToS3 } = require('./s3');
const { createSignerList, getConfig, registerWebhook, sendToSigners, uploadPdfDocument } = require('./d4signService');
const { normalizeOriginalName, sanitizeFileNameForStorage } = require('../utils/fileName');

const TIPOS_DOCUMENTO = new Set(['CONTRATO', 'QUADRO_RESUMO']);

const VARIAVEIS_CONTRATO_COMERCIAL = [
  { chave: 'contrato.numero', descricao: 'Numero do contrato' },
  { chave: 'contrato.data', descricao: 'Data do contrato em formato brasileiro' },
  { chave: 'contrato.valor_total', descricao: 'Valor total em numero' },
  { chave: 'contrato.valor_total_formatado', descricao: 'Valor total formatado em reais' },
  { chave: 'contrato.valor_entrada_formatado', descricao: 'Valor de entrada formatado' },
  { chave: 'contrato.desconto_formatado', descricao: 'Desconto formatado' },
  { chave: 'contrato.indice_reajuste', descricao: 'Indice de reajuste' },
  { chave: 'cliente.nome', descricao: 'Nome do comprador' },
  { chave: 'cliente.cpf_cnpj', descricao: 'CPF/CNPJ do comprador' },
  { chave: 'cliente.email', descricao: 'E-mail do comprador' },
  { chave: 'cliente.telefone', descricao: 'Telefone do comprador' },
  { chave: 'cliente.endereco', descricao: 'Endereco do comprador' },
  { chave: 'cliente.numero', descricao: 'Numero do endereco do comprador' },
  { chave: 'cliente.bairro', descricao: 'Bairro do comprador' },
  { chave: 'cliente.cidade_uf', descricao: 'Cidade/UF do comprador' },
  { chave: 'cliente.cep', descricao: 'CEP do comprador' },
  { chave: 'empreendimento.nome', descricao: 'Nome do empreendimento' },
  { chave: 'empreendimento.codigo', descricao: 'Codigo do empreendimento' },
  { chave: 'unidade.codigo', descricao: 'Codigo da unidade' },
  { chave: 'unidade.nome', descricao: 'Nome da unidade' },
  { chave: 'unidade.bloco', descricao: 'Bloco da unidade' },
  { chave: 'unidade.torre', descricao: 'Torre/predio da unidade' },
  { chave: 'unidade.pavimento', descricao: 'Pavimento da unidade' },
  { chave: 'unidade.tipologia', descricao: 'Tipologia da unidade' },
  { chave: 'unidade.metragem_privativa', descricao: 'Metragem privativa da unidade' },
  { chave: 'corretor.nome', descricao: 'Nome do corretor' },
  { chave: 'corretor.cpf_cnpj', descricao: 'CPF/CNPJ do corretor' },
  { chave: 'corretor.percentual_comissao', descricao: 'Percentual de comissao do corretor' },
  { chave: 'parcelas.resumo', descricao: 'Resumo das parcelas do contrato' },
  { chave: 'custom.*', descricao: 'Qualquer dado complementar enviado no momento da geracao' }
];

const LEGACY_BRACKET_ALIASES = {
  '[NOME DO CLIENTE]': '{{cliente.nome}}',
  '[Nº do CPF]': '{{cliente.cpf_cnpj}}',
  '[nº do RG]': '{{cliente.rg}}',
  '[data de nascimento]': '{{cliente.data_nascimento}}',
  '[nacionalidade]': '{{cliente.nacionalidade}}',
  '[profissão]': '{{cliente.profissao}}',
  '[nome da Rua/Avenida]': '{{cliente.endereco}}',
  '[Nº]': '{{cliente.numero}}',
  '[Complemento]': '{{cliente.complemento}}',
  '[Bairro]': '{{cliente.bairro}}',
  '[CEP]': '{{cliente.cep}}',
  '[Cidade-UF]': '{{cliente.cidade_uf}}',
  '[NOME DA ESPOSA(O)]': '{{cliente.conjuge_nome}}',
  '[regime de bens]': '{{cliente.regime_bens}}',
  '[Nome do Corretor]': '{{corretor.nome}}',
  '[Nº do CPF do Corretor]': '{{corretor.cpf_cnpj}}',
  '[Nº do CRECI do Corretor]': '{{corretor.creci}}',
  '[Percentual]': '{{corretor.percentual_comissao}}',
  '[Valor em Reais]': '{{contrato.valor_total_formatado}}',
  '[XXXX]': '{{contrato.numero}}'
};

function createHttpError(statusCode, message, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

function normalizeTipoDocumento(value) {
  const normalized = String(value || 'CONTRATO').trim().toUpperCase();
  return TIPOS_DOCUMENTO.has(normalized) ? normalized : 'CONTRATO';
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function safeString(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function formatDateBr(value) {
  if (!value) return '';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR');
}

function formatCurrency(value) {
  const numeric = Number(value || 0);
  return numeric.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function getPathValue(scope, rawPath) {
  const normalizedPath = String(rawPath || '').trim();
  if (!normalizedPath) return '';

  return normalizedPath.split('.').reduce((current, segment) => {
    if (current === null || current === undefined) return undefined;
    return current[segment];
  }, scope);
}

function docxParser(tag) {
  return {
    get(scope) {
      const value = getPathValue(scope, tag);
      if (value === null || value === undefined) return '';
      return value;
    }
  };
}

function deepMerge(base, extra) {
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return base;

  Object.entries(extra).forEach(([key, value]) => {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      deepMerge(base[key], value);
      return;
    }

    base[key] = value;
  });

  return base;
}

function replaceAll(source, search, replacement) {
  return source.split(search).join(replacement);
}

function applyLegacyBracketAliases(zip) {
  zip.file(/word\/.*\.xml$/).forEach((entry) => {
    let xml = entry.asText();
    Object.entries(LEGACY_BRACKET_ALIASES).forEach(([legacy, modern]) => {
      xml = replaceAll(xml, legacy, modern);
    });
    zip.file(entry.name, xml);
  });
}

function buildParcelasResumo(parcelas = []) {
  if (!Array.isArray(parcelas) || !parcelas.length) return '';

  return parcelas
    .map((parcela) => {
      const partes = [
        parcela.descricao || `Parcela ${parcela.sequencia || ''}`.trim(),
        parcela.data_vencimento ? `venc. ${formatDateBr(parcela.data_vencimento)}` : '',
        formatCurrency(parcela.valor || 0)
      ].filter(Boolean);
      return partes.join(' - ');
    })
    .join('\n');
}

function buildDadosContrato(contrato, customVariables = {}) {
  const raw = contrato?.toJSON ? contrato.toJSON() : contrato;
  const cliente = raw.cliente || {};
  const unidade = raw.unidadeComercial || {};
  const corretor = raw.corretorParceiro || {};
  const empreendimento = raw.empreendimento || {};
  const obra = raw.obra || {};

  const dados = {
    contrato: {
      id: raw.id,
      numero: safeString(raw.numero),
      data: formatDateBr(raw.data_contrato),
      data_iso: safeString(raw.data_contrato),
      status: safeString(raw.status),
      valor_total: safeString(raw.valor_total),
      valor_total_formatado: formatCurrency(raw.valor_total),
      valor_entrada: safeString(raw.valor_entrada),
      valor_entrada_formatado: formatCurrency(raw.valor_entrada),
      desconto: safeString(raw.desconto_concedido),
      desconto_formatado: formatCurrency(raw.desconto_concedido),
      indice_reajuste: safeString(raw.indice_reajuste),
      observacoes: safeString(raw.observacoes)
    },
    cliente: {
      nome: safeString(cliente.nome),
      cpf_cnpj: safeString(cliente.cpf_cnpj),
      telefone: safeString(cliente.telefone),
      email: safeString(cliente.email),
      endereco: safeString(cliente.endereco),
      numero: safeString(cliente.numero),
      bairro: safeString(cliente.bairro),
      cep: safeString(cliente.cep),
      municipio: safeString(cliente.municipio),
      estado: safeString(cliente.estado),
      cidade_uf: [cliente.municipio, cliente.estado].filter(Boolean).join('-'),
      rg: '',
      data_nascimento: '',
      nacionalidade: '',
      profissao: '',
      complemento: '',
      conjuge_nome: '',
      regime_bens: ''
    },
    empreendimento: {
      nome: safeString(empreendimento.nome),
      codigo: safeString(empreendimento.codigo)
    },
    unidade: {
      codigo: safeString(unidade.codigo),
      nome: safeString(unidade.nome),
      bloco: safeString(unidade.bloco),
      torre: safeString(unidade.torre),
      pavimento: safeString(unidade.pavimento),
      tipologia: safeString(unidade.tipologia),
      metragem_privativa: safeString(unidade.metragem_privativa),
      valor_tabela: safeString(unidade.valor_tabela),
      valor_tabela_formatado: formatCurrency(unidade.valor_tabela),
      valor_base_venda: safeString(unidade.valor_base_venda),
      valor_base_venda_formatado: formatCurrency(unidade.valor_base_venda)
    },
    corretor: {
      nome: safeString(corretor.nome || raw.corretor_nome),
      cpf_cnpj: safeString(corretor.cpf_cnpj),
      telefone: safeString(corretor.telefone),
      email: safeString(corretor.email),
      creci: '',
      percentual_comissao: raw.comissao_percentual ? `${safeString(raw.comissao_percentual)}%` : ''
    },
    obra: {
      nome: safeString(obra.nome),
      codigo: safeString(obra.codigo)
    },
    parcelas: {
      resumo: buildParcelasResumo(raw.parcelas || []),
      itens: raw.parcelas || []
    },
    custom: customVariables || {}
  };

  return deepMerge(dados, customVariables);
}

async function carregarContratoParaDocumento(id) {
  const contrato = await ContratoComercial.findByPk(id, {
    include: [
      { model: Empreendimento, as: 'empreendimento' },
      { model: UnidadeComercial, as: 'unidadeComercial' },
      { model: Parceiro, as: 'cliente' },
      { model: Parceiro, as: 'corretorParceiro' },
      { model: Obra, as: 'obra' },
      {
        model: ContratoComercialParcela,
        as: 'parcelas',
        separate: true,
        order: [['sequencia', 'ASC']],
        include: [{ model: TituloFinanceiro, as: 'tituloFinanceiro' }]
      }
    ]
  });

  if (!contrato) {
    throw createHttpError(404, 'Contrato comercial nao encontrado.');
  }

  return contrato;
}

async function readStoredFileBuffer(urlOrPath) {
  if (!urlOrPath) {
    throw createHttpError(400, 'Arquivo do modelo nao informado.');
  }

  const value = String(urlOrPath);
  if (value.startsWith('/uploads/')) {
    const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads');
    const target = path.resolve(uploadsRoot, value.replace(/^\/uploads\//, ''));
    if (!target.startsWith(uploadsRoot)) {
      throw createHttpError(400, 'Caminho de arquivo invalido.');
    }
    return fs.promises.readFile(target);
  }

  const url = value.startsWith('http') ? await getPresignedUrl(value, 300) : value;
  const response = await fetch(url);
  if (!response.ok) {
    throw createHttpError(502, 'Nao foi possivel baixar o arquivo do modelo.');
  }

  return Buffer.from(await response.arrayBuffer());
}

function renderDocx(templateBuffer, data) {
  const zip = new PizZip(templateBuffer);
  applyLegacyBracketAliases(zip);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    parser: docxParser
  });

  doc.render(data);
  return doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE'
  });
}

function runLibreOffice(args, tempDir) {
  return new Promise((resolve, reject) => {
    const bin = String(process.env.LIBREOFFICE_BIN || 'soffice').trim() || 'soffice';
    const child = spawn(bin, args, {
      cwd: tempDir,
      windowsHide: true
    });

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(createHttpError(
          500,
          'LibreOffice nao encontrado no servidor. Instale libreoffice e, se necessario, configure LIBREOFFICE_BIN no .env.',
          'LIBREOFFICE_MISSING'
        ));
        return;
      }

      reject(error);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(createHttpError(
          500,
          `Falha ao converter DOCX para PDF com LibreOffice. ${stderr || `Codigo ${code}`}`,
          'LIBREOFFICE_CONVERT_FAILED'
        ));
        return;
      }

      resolve();
    });
  });
}

async function convertDocxToPdf(docxBuffer, baseName) {
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'fluxy-contrato-'));
  const safeBaseName = sanitizeFileNameForStorage(baseName || 'contrato').replace(/\.docx$/i, '') || 'contrato';
  const docxPath = path.join(tempDir, `${safeBaseName}.docx`);
  const pdfPath = path.join(tempDir, `${safeBaseName}.pdf`);

  try {
    await fs.promises.writeFile(docxPath, docxBuffer);
    await runLibreOffice(['--headless', '--convert-to', 'pdf', '--outdir', tempDir, docxPath], tempDir);
    return await fs.promises.readFile(pdfPath);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

function buildUploadFile(buffer, originalname, mimetype) {
  return {
    buffer,
    originalname,
    mimetype,
    size: buffer.length
  };
}

async function listarModelosContratoComercial(query = {}) {
  const where = { ativo: true };
  if (query.empreendimento_id) where.empreendimento_id = Number(query.empreendimento_id);
  if (query.tipo_documento) where.tipo_documento = normalizeTipoDocumento(query.tipo_documento);

  return ContratoComercialModelo.findAll({
    where,
    include: [
      { model: Empreendimento, as: 'empreendimento', attributes: ['id', 'nome', 'codigo'] },
      { model: User, as: 'criadoPor', attributes: ['id', 'nome', 'email'] }
    ],
    order: [['updatedAt', 'DESC'], ['id', 'DESC']]
  });
}

async function criarModeloContratoComercial(req, payload = {}, file) {
  if (!file) {
    throw createHttpError(400, 'Arquivo DOCX do modelo e obrigatorio.');
  }

  const extension = path.extname(file.originalname || '').toLowerCase();
  if (extension !== '.docx') {
    throw createHttpError(400, 'Envie um arquivo .docx para preservar a formatacao do contrato.');
  }

  const empreendimentoId = Number(payload.empreendimento_id);
  if (!Number.isFinite(empreendimentoId) || empreendimentoId <= 0) {
    throw createHttpError(400, 'Empreendimento e obrigatorio.');
  }

  const empreendimento = await Empreendimento.findByPk(empreendimentoId);
  if (!empreendimento) {
    throw createHttpError(404, 'Empreendimento nao encontrado.');
  }

  const tipoDocumento = normalizeTipoDocumento(payload.tipo_documento);
  const nomeOriginal = normalizeOriginalName(file.originalname);
  const arquivoUrl = await uploadToS3(file, `comercial/contratos/modelos/${empreendimentoId}`);

  return ContratoComercialModelo.create({
    empreendimento_id: empreendimentoId,
    tipo_documento: tipoDocumento,
    nome: String(payload.nome || nomeOriginal).trim() || nomeOriginal,
    descricao: String(payload.descricao || '').trim() || null,
    arquivo_url: arquivoUrl,
    arquivo_nome: nomeOriginal,
    arquivo_mime: file.mimetype,
    variaveis_json: payload.variaveis ? JSON.stringify(parseJson(payload.variaveis, {})) : null,
    d4sign_safe_uuid: String(payload.d4sign_safe_uuid || '').trim() || null,
    ativo: true,
    criado_por: req.user?.id || null,
    atualizado_por: req.user?.id || null
  });
}

async function listarDocumentosContratoComercial(contratoId) {
  return ContratoComercialDocumento.findAll({
    where: { contrato_comercial_id: Number(contratoId) },
    include: [
      { model: ContratoComercialModelo, as: 'modelo', attributes: ['id', 'nome', 'tipo_documento'] },
      { model: User, as: 'criadoPor', attributes: ['id', 'nome', 'email'] }
    ],
    order: [['createdAt', 'DESC'], ['id', 'DESC']]
  });
}

async function resolveModeloParaContrato(contrato, payload = {}) {
  if (payload.modelo_id) {
    const modelo = await ContratoComercialModelo.findOne({
      where: {
        id: Number(payload.modelo_id),
        ativo: true
      }
    });

    if (!modelo) {
      throw createHttpError(404, 'Modelo de contrato nao encontrado.');
    }

    return modelo;
  }

  const tipoDocumento = normalizeTipoDocumento(payload.tipo_documento);
  const modelo = await ContratoComercialModelo.findOne({
    where: {
      empreendimento_id: contrato.empreendimento_id,
      tipo_documento: tipoDocumento,
      ativo: true
    },
    order: [['updatedAt', 'DESC'], ['id', 'DESC']]
  });

  if (!modelo) {
    throw createHttpError(404, 'Nenhum modelo ativo encontrado para este empreendimento e tipo de documento.');
  }

  return modelo;
}

async function gerarDocumentoContratoComercial(req, contratoId, payload = {}) {
  const contrato = await carregarContratoParaDocumento(contratoId);
  const modelo = await resolveModeloParaContrato(contrato, payload);
  const customVariables = deepMerge(
    parseJson(modelo.variaveis_json, {}),
    parseJson(payload.variaveis, {})
  );
  const dados = buildDadosContrato(contrato, customVariables);
  const templateBuffer = await readStoredFileBuffer(modelo.arquivo_url);
  const docxBuffer = renderDocx(templateBuffer, dados);
  const tipoDocumento = normalizeTipoDocumento(modelo.tipo_documento);
  const numeroContrato = sanitizeFileNameForStorage(contrato.numero || `contrato-${contrato.id}`);
  const baseName = `${tipoDocumento.toLowerCase()}-${numeroContrato || contrato.id}`;
  const pdfBuffer = await convertDocxToPdf(docxBuffer, baseName);
  const docxName = `${baseName}.docx`;
  const pdfName = `${baseName}.pdf`;

  const [arquivoDocxUrl, arquivoPdfUrl] = await Promise.all([
    uploadToS3(
      buildUploadFile(docxBuffer, docxName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      `comercial/contratos/gerados/${contrato.id}`
    ),
    uploadToS3(
      buildUploadFile(pdfBuffer, pdfName, 'application/pdf'),
      `comercial/contratos/gerados/${contrato.id}`
    )
  ]);

  return ContratoComercialDocumento.create({
    contrato_comercial_id: contrato.id,
    modelo_id: modelo.id,
    tipo_documento: tipoDocumento,
    nome: String(payload.nome || modelo.nome || pdfName).trim(),
    status: 'GERADO',
    arquivo_docx_url: arquivoDocxUrl,
    arquivo_pdf_url: arquivoPdfUrl,
    d4sign_safe_uuid: modelo.d4sign_safe_uuid || process.env.D4SIGN_SAFE_UUID || null,
    criado_por: req.user?.id || null,
    atualizado_por: req.user?.id || null
  });
}

async function obterLinkDocumentoContratoComercial(documentoId, tipo = 'pdf') {
  const documento = await ContratoComercialDocumento.findByPk(documentoId);
  if (!documento) {
    throw createHttpError(404, 'Documento nao encontrado.');
  }

  const normalizedTipo = String(tipo || 'pdf').trim().toLowerCase();
  const target = normalizedTipo === 'docx' ? documento.arquivo_docx_url : documento.arquivo_pdf_url;
  if (!target) {
    throw createHttpError(404, 'Arquivo do documento nao encontrado.');
  }

  return {
    url: await getPresignedUrl(target, 300)
  };
}

function defaultSignersFromContrato(contrato) {
  const cliente = contrato?.cliente || {};
  if (!cliente.email) return [];

  return [
    {
      email: cliente.email,
      act: '1',
      foreign: '0',
      certificadoicpbr: '0',
      docauth: '0'
    }
  ];
}

async function enviarDocumentoD4Sign(req, documentoId, payload = {}) {
  const documento = await ContratoComercialDocumento.findByPk(documentoId, {
    include: [
      {
        model: ContratoComercial,
        as: 'contrato',
        include: [{ model: Parceiro, as: 'cliente' }]
      }
    ]
  });

  if (!documento) {
    throw createHttpError(404, 'Documento nao encontrado.');
  }

  if (!documento.arquivo_pdf_url) {
    throw createHttpError(400, 'Gere o PDF antes de enviar para assinatura.');
  }

  const config = getConfig();
  const pdfBuffer = await readStoredFileBuffer(documento.arquivo_pdf_url);
  const safeUuid = documento.d4sign_safe_uuid || config.safeUuid;
  const signatarios = Array.isArray(payload.signatarios) && payload.signatarios.length
    ? payload.signatarios
    : defaultSignersFromContrato(documento.contrato);

  if (!signatarios.length) {
    throw createHttpError(400, 'Contrato sem e-mail de comprador. Informe signatarios manualmente.');
  }

  try {
    const uploadResponse = await uploadPdfDocument({
      pdfBuffer,
      fileName: `${sanitizeFileNameForStorage(documento.nome || 'contrato')}.pdf`,
      safeUuid,
      folderUuid: payload.uuid_folder
    });
    const documentUuid = uploadResponse?.uuid || uploadResponse?.UUID || uploadResponse?.uuid_document;
    if (!documentUuid) {
      throw createHttpError(502, 'D4Sign nao retornou o UUID do documento enviado.');
    }

    const webhookResponse = await registerWebhook(documentUuid, payload.webhook_url);
    const signersResponse = await createSignerList(documentUuid, signatarios);
    const sendResponse = await sendToSigners(documentUuid, {
      message: payload.message,
      skip_email: payload.skip_email,
      workflow: payload.workflow
    });

    const d4signPayload = {
      upload: uploadResponse,
      webhook: webhookResponse,
      signers: signersResponse,
      send: sendResponse,
      signatarios
    };

    await documento.update({
      status: 'ENVIADO_D4SIGN',
      d4sign_uuid_documento: documentUuid,
      d4sign_safe_uuid: safeUuid,
      d4sign_status: 'ENVIADO',
      d4sign_enviado_em: new Date(),
      d4sign_payload_json: JSON.stringify(d4signPayload),
      erro: null,
      atualizado_por: req.user?.id || null
    });

    return documento.reload();
  } catch (error) {
    await documento.update({
      status: documento.status === 'ASSINADO' ? documento.status : 'ERRO',
      erro: error.message,
      atualizado_por: req.user?.id || null
    });
    throw error;
  }
}

async function processarWebhookD4Sign(payload = {}) {
  const uuid =
    payload.uuid ||
    payload.uuidDoc ||
    payload.uuid_document ||
    payload.uuidDocument ||
    payload['uuid-document'];

  if (!uuid) {
    return { ignored: true, reason: 'uuid ausente' };
  }

  const documento = await ContratoComercialDocumento.findOne({
    where: { d4sign_uuid_documento: String(uuid) }
  });

  if (!documento) {
    return { ignored: true, reason: 'documento nao encontrado' };
  }

  const statusText = String(payload.status || payload.statusName || payload.message || '').toUpperCase();
  const statusId = String(payload.statusId || payload.status_id || '');
  let status = documento.status;

  if (statusId === '4' || /FINISHED|FINALIZADO|COMPLETED|ASSINADO/.test(statusText)) {
    status = 'ASSINADO';
  } else if (statusId === '6' || /CANCEL|CANCELADO/.test(statusText)) {
    status = 'CANCELADO';
  } else if (/SIGNED|ASSINOU|SIGNATARIO/.test(statusText)) {
    status = 'ENVIADO_D4SIGN';
  }

  await documento.update({
    status,
    d4sign_status: statusText || statusId || documento.d4sign_status,
    d4sign_finalizado_em: status === 'ASSINADO' ? new Date() : documento.d4sign_finalizado_em,
    d4sign_payload_json: JSON.stringify({
      ...(parseJson(documento.d4sign_payload_json, {}) || {}),
      ultimoWebhook: payload
    })
  });

  return { ok: true, id: documento.id, status };
}

module.exports = {
  LEGACY_BRACKET_ALIASES,
  TIPOS_DOCUMENTO,
  VARIAVEIS_CONTRATO_COMERCIAL,
  criarModeloContratoComercial,
  enviarDocumentoD4Sign,
  gerarDocumentoContratoComercial,
  listarDocumentosContratoComercial,
  listarModelosContratoComercial,
  obterLinkDocumentoContratoComercial,
  processarWebhookD4Sign
};
