const crypto = require('crypto');
const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const {
  Apropriacao,
  CategoriaFinanceira,
  EmpresaGrupo,
  FinanceiroTituloImportacao,
  FinanceiroTituloImportacaoLinha,
  FinanceiroTituloImportacaoResultado,
  FormaPagamentoFinanceira,
  Obra,
  Parceiro,
  PaymentBeneficiary,
  TituloFinanceiro,
  sequelize
} = require('../models');
const {
  canImportTitulosFinanceiros,
  getFinanceiroObraScopeIds
} = require('./authorizationService');
const { criarTituloManual } = require('./tituloFinanceiroService');
const { registrarEventoSeguranca } = require('./securityLogService');

const TEMPLATE_VERSION = '1.2';
const MAX_TITULOS = 500;
const MAX_TOTAL_ROWS = 5000;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 120 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 2000;
const PREVIEW_EXPIRATION_HOURS = 24;
const REQUIRED_SHEETS = ['TITULOS', 'PARCELAS', 'RATEIOS', 'IMPOSTOS'];
const IMPORTABLE_SHEETS = new Set(REQUIRED_SHEETS);
const ALLOWED_HEADERS = {
  TITULOS: [
    'chave_importacao', 'empresa_codigo', 'obra_codigo', 'credor_id', 'categoria_id',
    'forma_pagamento_codigo', 'status', 'descricao', 'numero_documento', 'valor_total',
    'data_emissao', 'data_vencimento', 'competencia_data', 'considera_dre',
    'apropriacao_codigo', 'observacoes', 'forma_cobranca', 'banco_cobranca',
    'linha_digitavel', 'codigo_barras'
  ],
  PARCELAS: [
    'chave_importacao', 'numero_parcela', 'valor', 'data_vencimento', 'numero_documento',
    'linha_digitavel', 'codigo_barras', 'observacoes'
  ],
  RATEIOS: [
    'chave_importacao', 'empresa_codigo', 'obra_codigo', 'apropriacao_codigo',
    'tipo_rateio', 'percentual', 'valor_rateio', 'observacoes'
  ],
  IMPOSTOS: [
    'chave_importacao', 'tipo_imposto', 'descricao', 'natureza', 'base_calculo',
    'aliquota', 'valor', 'observacoes'
  ]
};

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function parseJson(value, fallback = []) {
  if (!value) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeText(value, maxLength = 4000) {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, maxLength) : null;
}

function normalizeUpper(value, maxLength = 80) {
  const text = normalizeText(value, maxLength);
  return text ? text.toUpperCase() : null;
}

function buildObraLookupKey(empresaCodigo, obraCodigo) {
  const empresa = normalizeUpper(empresaCodigo, 60);
  const obra = normalizeUpper(obraCodigo, 255);
  return empresa && obra ? JSON.stringify([empresa, obra]) : null;
}

function buildObraLookup(obras = []) {
  const obraByCodigoComposto = new Map();
  const obraCodigosAmbiguos = new Set();
  obras.forEach((obra) => {
    const key = buildObraLookupKey(obra?.empresaGrupo?.codigo, obra?.codigo);
    if (!key) return;
    if (obraByCodigoComposto.has(key)) {
      obraByCodigoComposto.delete(key);
      obraCodigosAmbiguos.add(key);
      return;
    }
    if (!obraCodigosAmbiguos.has(key)) obraByCodigoComposto.set(key, obra);
  });
  return { obraByCodigoComposto, obraCodigosAmbiguos };
}

function resolveObraByCodigos(refs, empresaCodigo, obraCodigo, label = 'Obra') {
  const empresa = normalizeUpper(empresaCodigo, 60);
  const obra = normalizeUpper(obraCodigo, 255);
  if (!empresa) throw createHttpError(400, `${label}: codigo da empresa e obrigatorio.`);
  if (!obra) throw createHttpError(400, `${label}: codigo da obra e obrigatorio.`);
  const key = buildObraLookupKey(empresa, obra);
  if (refs.obraCodigosAmbiguos.has(key)) {
    throw createHttpError(400, `${label}: a combinacao empresa_codigo + obra_codigo esta duplicada no cadastro e precisa ser regularizada.`);
  }
  const resolved = refs.obraByCodigoComposto.get(key);
  if (!resolved) {
    throw createHttpError(400, `${label}: combinacao empresa_codigo + obra_codigo inexistente, inativa, incompleta ou fora do seu escopo.`);
  }
  return resolved;
}

function buildApropriacaoLookupKey(obraId, apropriacaoCodigo) {
  const obra = Number(obraId);
  const apropriacao = normalizeUpper(apropriacaoCodigo, 255);
  return Number.isInteger(obra) && obra > 0 && apropriacao
    ? JSON.stringify([obra, apropriacao])
    : null;
}

function buildApropriacaoLookup(apropriacoes = []) {
  const apropriacaoByObraECodigo = new Map();
  const apropriacaoCodigosAmbiguos = new Set();
  apropriacoes.forEach((apropriacao) => {
    const key = buildApropriacaoLookupKey(apropriacao?.obra_id, apropriacao?.codigo);
    if (!key) return;
    if (apropriacaoByObraECodigo.has(key)) {
      apropriacaoByObraECodigo.delete(key);
      apropriacaoCodigosAmbiguos.add(key);
      return;
    }
    if (!apropriacaoCodigosAmbiguos.has(key)) apropriacaoByObraECodigo.set(key, apropriacao);
  });
  return { apropriacaoByObraECodigo, apropriacaoCodigosAmbiguos };
}

function resolveApropriacaoByCodigo(refs, obra, apropriacaoCodigo, label = 'Apropriacao', { required = false } = {}) {
  const codigo = normalizeUpper(apropriacaoCodigo, 255);
  if (!codigo) {
    if (required) throw createHttpError(400, `${label}: codigo e obrigatorio.`);
    return null;
  }
  const key = buildApropriacaoLookupKey(obra?.id, codigo);
  if (refs.apropriacaoCodigosAmbiguos.has(key)) {
    throw createHttpError(400, `${label}: apropriacao_codigo esta duplicado na obra informada e precisa ser regularizado.`);
  }
  const resolved = refs.apropriacaoByObraECodigo.get(key);
  if (!resolved) {
    throw createHttpError(400, `${label}: apropriacao_codigo inexistente, inativo, somador ou pertencente a outra obra.`);
  }
  return resolved;
}

function parseInteger(value, label, { required = false } = {}) {
  if (value === '' || value == null) {
    if (required) throw createHttpError(400, `${label} e obrigatorio.`);
    return null;
  }
  const parsed = Number(String(value).trim());
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, `${label} invalido.`);
  }
  return parsed;
}

function parseMoney(value, label, { required = false, allowZero = false } = {}) {
  if (value === '' || value == null) {
    if (required) throw createHttpError(400, `${label} e obrigatorio.`);
    return null;
  }
  let normalized = value;
  if (typeof value === 'string') {
    normalized = value.trim().replace(/[R$\s]/gi, '');
    if (normalized.includes(',')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    }
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) {
    throw createHttpError(400, `${label} invalido.`);
  }
  return roundCurrency(parsed);
}

function parsePercentage(value, label) {
  if (value === '' || value == null) return null;
  const normalized = typeof value === 'string' ? value.trim().replace('%', '').replace(',', '.') : value;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw createHttpError(400, `${label} invalido.`);
  }
  return parsed;
}

function parseBoolean(value, defaultValue = true) {
  if (value === '' || value == null) return defaultValue;
  if (typeof value === 'boolean') return value;
  const token = String(value).trim().toUpperCase();
  if (['SIM', 'S', 'TRUE', '1'].includes(token)) return true;
  if (['NAO', 'NÃO', 'N', 'FALSE', '0'].includes(token)) return false;
  throw createHttpError(400, 'Use SIM ou NAO no campo considera_dre.');
}

function excelSerialToDate(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial)) return null;
  const milliseconds = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnly(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value, label, { required = false, defaultValue = null } = {}) {
  if (value === '' || value == null) {
    if (required) throw createHttpError(400, `${label} e obrigatoria.`);
    return defaultValue;
  }

  let date = null;
  let expected = null;
  if (value instanceof Date) {
    date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  } else if (typeof value === 'number') {
    date = excelSerialToDate(value);
  } else {
    const raw = String(value).trim();
    const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (iso) {
      expected = `${iso[1]}-${iso[2]}-${iso[3]}`;
      date = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    }
    if (br) {
      expected = `${br[3]}-${br[2]}-${br[1]}`;
      date = new Date(Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1])));
    }
  }

  if (!date || Number.isNaN(date.getTime())) {
    throw createHttpError(400, `${label} invalida. Use AAAA-MM-DD ou DD/MM/AAAA.`);
  }
  const formatted = formatDateOnly(date);
  if (expected && formatted !== expected) {
    throw createHttpError(400, `${label} invalida.`);
  }
  const [year, month, day] = formatted.split('-').map(Number);
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw createHttpError(400, `${label} fora do intervalo permitido.`);
  }
  return formatted;
}

function cellRawValue(cell) {
  const value = cell?.value;
  if (value && typeof value === 'object' && value.formula) {
    throw createHttpError(400, 'Formulas nao sao permitidas nas abas de importacao. Cole somente valores.');
  }
  if (value && typeof value === 'object' && value.richText) {
    return value.richText.map((part) => part.text || '').join('');
  }
  if (value && typeof value === 'object' && value.text != null) return value.text;
  return value ?? '';
}

function assertSafeXlsxArchive(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 22) throw createHttpError(400, 'Arquivo XLSX invalido ou vazio.');
  if (buffer.length > MAX_FILE_BYTES) throw createHttpError(400, 'O arquivo XLSX excede o limite de 10 MB.');
  const minEocdOffset = Math.max(0, buffer.length - 65557);
  let eocdOffset = -1;
  for (let offset = buffer.length - 22; offset >= minEocdOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw createHttpError(400, 'Estrutura ZIP do XLSX invalida.');
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralSize = buffer.readUInt32LE(eocdOffset + 12);
  const centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw createHttpError(400, 'Arquivos XLSX em formato ZIP64 nao sao permitidos.');
  }
  if (entryCount <= 0 || entryCount > MAX_ZIP_ENTRIES || centralOffset + centralSize > buffer.length) {
    throw createHttpError(400, 'Estrutura interna do XLSX excede os limites permitidos.');
  }
  let offset = centralOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw createHttpError(400, 'Diretorio interno do XLSX invalido.');
    }
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    if (nameEnd > buffer.length) throw createHttpError(400, 'Entrada interna do XLSX invalida.');
    const fileName = buffer.toString('utf8', nameStart, nameEnd).replace(/\\/g, '/');
    if (fileName.includes('../') || fileName.startsWith('/') || /vbaProject\.bin$/i.test(fileName)) {
      throw createHttpError(400, 'O XLSX possui conteudo interno nao permitido.');
    }
    if (uncompressedSize > MAX_UNCOMPRESSED_BYTES || (compressedSize === 0 && uncompressedSize > 0)) {
      throw createHttpError(400, 'O XLSX possui uma entrada interna desproporcional.');
    }
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_UNCOMPRESSED_BYTES || totalUncompressed > buffer.length * 150) {
      throw createHttpError(400, 'O XLSX excede o limite de expansao segura.');
    }
    offset = nameEnd + extraLength + commentLength;
  }
}

function worksheetRows(worksheet, sheetName) {
  const expectedHeaders = ALLOWED_HEADERS[sheetName];
  const headers = [];
  for (let column = 1; column <= Math.max(worksheet.columnCount, expectedHeaders.length); column += 1) {
    headers.push(normalizeHeader(cellRawValue(worksheet.getRow(1).getCell(column))));
  }
  const populatedHeaders = headers.filter(Boolean);
  const unknownHeaders = populatedHeaders.filter((header) => !expectedHeaders.includes(header));
  if (unknownHeaders.length) {
    throw createHttpError(400, `Aba ${sheetName} possui colunas desconhecidas: ${unknownHeaders.join(', ')}.`);
  }
  const missingHeaders = expectedHeaders.filter((header) => !populatedHeaders.includes(header));
  if (missingHeaders.length) {
    throw createHttpError(400, `Aba ${sheetName} esta sem colunas do modelo: ${missingHeaders.join(', ')}.`);
  }

  const rows = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    if (row.hidden) {
      throw createHttpError(400, `Aba ${sheetName}, linha ${rowNumber}: linhas ocultas nao sao permitidas.`);
    }
    const payload = {};
    let hasValue = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const cell = row.getCell(index + 1);
      if (worksheet.getColumn(index + 1).hidden && cellRawValue(cell) !== '') {
        throw createHttpError(400, `Aba ${sheetName}: colunas ocultas com dados nao sao permitidas.`);
      }
      const value = cellRawValue(cell);
      payload[header] = value;
      if (String(value ?? '').trim() !== '') hasValue = true;
    });
    if (hasValue) rows.push({ rowNumber, payload });
  }
  return rows;
}

async function parseWorkbook(buffer) {
  assertSafeXlsxArchive(buffer);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  if (workbook.vbaProject) {
    throw createHttpError(400, 'Arquivos com macros nao sao permitidos.');
  }
  const sheets = {};
  for (const sheetName of REQUIRED_SHEETS) {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) throw createHttpError(400, `Aba obrigatoria ausente: ${sheetName}.`);
    sheets[sheetName] = worksheetRows(worksheet, sheetName);
  }
  const totalRows = Object.values(sheets).reduce((sum, rows) => sum + rows.length, 0);
  if (sheets.TITULOS.length === 0) throw createHttpError(400, 'A aba TITULOS nao possui dados para importar.');
  if (sheets.TITULOS.length > MAX_TITULOS) throw createHttpError(400, `O limite e de ${MAX_TITULOS} titulos por arquivo.`);
  if (totalRows > MAX_TOTAL_ROWS) throw createHttpError(400, `O limite total e de ${MAX_TOTAL_ROWS} linhas por arquivo.`);
  return { sheets, totalRows };
}

function isBusinessAdmin(user) {
  return ['SUPERADMIN', 'ADMINISTRADOR'].includes(String(user?.perfil || '').trim().toUpperCase());
}

async function assertImportPermission(req) {
  if (await canImportTitulosFinanceiros(req.user)) return;
  throw createHttpError(403, 'Acesso negado para importar titulos financeiros.');
}

async function getReferenceData(user) {
  const scopeIds = await getFinanceiroObraScopeIds(user);
  const obraWhere = { ativo: true, empresa_grupo_id: { [Op.ne]: null } };
  if (Array.isArray(scopeIds)) {
    obraWhere.id = scopeIds.length ? { [Op.in]: scopeIds } : -1;
  }

  const obrasEncontradas = await Obra.findAll({
    where: obraWhere,
    include: [{ model: EmpresaGrupo, as: 'empresaGrupo', attributes: ['id', 'nome', 'codigo'] }],
    order: [['codigo', 'ASC'], ['nome', 'ASC']]
  });
  const obras = obrasEncontradas.filter((obra) => (
    normalizeText(obra.codigo, 255) && normalizeText(obra.empresaGrupo?.codigo, 60)
  ));
  const obraIds = obras.map((obra) => Number(obra.id));
  const [credores, categorias, formasPagamento, apropriacoes] = await Promise.all([
    Parceiro.findAll({
      where: { ativo: true, [Op.or]: [{ fornecedor: true }, { corretor: true }] },
      attributes: ['id', 'nome', 'cpf_cnpj', 'fornecedor', 'corretor'],
      include: [{
        model: PaymentBeneficiary,
        as: 'paymentBeneficiaries',
        required: false,
        where: { ativo: true },
        attributes: ['id', 'pix_tipo_chave', 'pix_chave', 'ativo', 'validado_em']
      }],
      order: [['nome', 'ASC']]
    }),
    CategoriaFinanceira.findAll({
      where: { ativo: true, tipo: { [Op.in]: ['PAGAR', 'AMBOS'] } },
      order: [['nome', 'ASC']]
    }),
    FormaPagamentoFinanceira.findAll({ where: { ativo: true }, order: [['ordem', 'ASC'], ['nome', 'ASC']] }),
    obraIds.length
      ? Apropriacao.findAll({
          where: { obra_id: { [Op.in]: obraIds }, ativo: true, somadora: false },
          order: [['obra_id', 'ASC'], ['codigo', 'ASC']]
        })
      : []
  ]);

  const formasPermitidas = formasPagamento.filter((forma) => {
    const token = `${forma.codigo || ''} ${forma.nome || ''} ${forma.tipo || ''}`.toUpperCase();
    return !forma.exige_cartao && !forma.exige_cheque && !forma.gera_fatura
      && !token.includes('CARTAO') && !token.includes('CHEQUE');
  });
  return { obras, credores, categorias, formasPagamento: formasPermitidas, apropriacoes };
}

function applyHeaderStyle(row) {
  row.height = 30;
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173B57' } };
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: 'FFF5F8FA' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FFB8944A' } } };
  });
}

function setupDataSheet(worksheet, headers, widths = {}) {
  worksheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: false }];
  worksheet.addRow(headers);
  worksheet.autoFilter = { from: 'A1', to: `${worksheet.getColumn(headers.length).letter}1` };
  headers.forEach((header, index) => {
    const column = worksheet.getColumn(index + 1);
    column.width = widths[header] || 18;
    column.font = { name: 'Aptos', size: 10, color: { argb: 'FF0000FF' } };
  });
  applyHeaderStyle(worksheet.getRow(1));
}

function applyValidation(worksheet, columnNumber, formula1, rowEnd = MAX_TITULOS + 1) {
  for (let row = 2; row <= rowEnd; row += 1) {
    worksheet.getCell(row, columnNumber).dataValidation = {
      type: 'list', allowBlank: true, formulae: [formula1],
      showErrorMessage: true, errorTitle: 'Valor invalido', error: 'Selecione um valor da lista de referencias.'
    };
  }
}

async function gerarModeloImportacao(req, { references = null, skipAudit = false } = {}) {
  await assertImportPermission(req);
  const refs = references || await getReferenceData(req.user);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fluxy';
  workbook.created = new Date();
  workbook.title = 'Modelo de importacao de contas a pagar';
  workbook.subject = `Versao ${TEMPLATE_VERSION}`;

  const instrucoes = workbook.addWorksheet('INSTRUCOES', { views: [{ showGridLines: false }] });
  instrucoes.columns = [{ width: 28 }, { width: 105 }];
  instrucoes.mergeCells('A1:B1');
  instrucoes.getCell('A1').value = 'IMPORTACAO DE CONTAS A PAGAR';
  instrucoes.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173B57' } };
  instrucoes.getCell('A1').font = { name: 'Aptos Display', size: 18, bold: true, color: { argb: 'FFF5F8FA' } };
  instrucoes.getCell('A1').alignment = { vertical: 'middle' };
  instrucoes.getRow(1).height = 42;
  const instructionRows = [
    ['Versao do modelo', TEMPLATE_VERSION],
    ['Objetivo', 'Criar titulos PAGAR em massa. A planilha nunca registra baixa, movimento bancario ou pagamento.'],
    ['Chave principal', 'Use uma chave_importacao unica por titulo logico, por exemplo FOLHA-2026-07-0001.'],
    ['Obra e empresa', 'Informe empresa_codigo e obra_codigo exatamente como cadastrados. A combinacao resolve a obra; a empresa real do titulo continua sendo derivada dessa obra.'],
    ['Apropriacao', 'Quando utilizada, informe apropriacao_codigo da aba REFERENCIAS. O backend resolve o cadastro dentro da obra informada; IDs internos nao fazem parte do modelo.'],
    ['Credor', 'Informe credor_id da aba REFERENCIAS. O parceiro precisa estar ativo e elegivel para contas a pagar. A coluna favorecido_bancario indica se o credor esta pronto para lote PIX.'],
    ['Datas', 'Use datas reais do Excel ou AAAA-MM-DD.'],
    ['Valores', 'Use numeros positivos. Nao inclua R$ como texto. Parcelas devem somar valor_total.'],
    ['Abas filhas', 'PARCELAS, RATEIOS e IMPOSTOS se relacionam pela chave_importacao. Deixe-as vazias quando nao forem necessarias.'],
    ['Rateios', 'Use somente PERCENTUAL ou VALOR em todas as linhas da mesma chave. A soma deve fechar 100% ou o valor total.'],
    ['Seguranca', 'Formulas, macros, linhas ocultas e colunas ocultas com dados sao rejeitadas. Nao altere os cabecalhos.'],
    ['Limites', `Ate ${MAX_TITULOS} titulos e ${MAX_TOTAL_ROWS} linhas somando as abas de dados.`],
    ['Fluxo', 'Envie o arquivo, revise erros/avisos no preview e confirme. A confirmacao e atomica.']
  ];
  instructionRows.forEach((values, index) => {
    const row = instrucoes.addRow(values);
    row.height = [3, 4].includes(index) ? 46 : 34;
    row.getCell(1).font = { name: 'Aptos', size: 10, bold: true, color: { argb: 'FF173B57' } };
    row.getCell(2).font = { name: 'Aptos', size: 10, color: { argb: 'FF263746' } };
    row.eachCell((cell) => {
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFDCE4E9' } } };
    });
  });
  instrucoes.getCell('B4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };

  const titulos = workbook.addWorksheet('TITULOS');
  setupDataSheet(titulos, ALLOWED_HEADERS.TITULOS, {
    chave_importacao: 25, empresa_codigo: 20, obra_codigo: 20, credor_id: 12, categoria_id: 12,
    forma_pagamento_codigo: 24, descricao: 42, numero_documento: 22,
    valor_total: 16, observacoes: 42, linha_digitavel: 34, codigo_barras: 34
  });
  titulos.getColumn(10).numFmt = '#,##0.00;[Red](#,##0.00);-';
  [11, 12, 13].forEach((column) => { titulos.getColumn(column).numFmt = 'yyyy-mm-dd'; });
  [1, 2, 3, 6, 7, 8, 9, 14, 15, 16, 17, 18, 19, 20].forEach((column) => { titulos.getColumn(column).numFmt = '@'; });
  [4, 5].forEach((column) => { titulos.getColumn(column).numFmt = '0'; });

  const parcelas = workbook.addWorksheet('PARCELAS');
  setupDataSheet(parcelas, ALLOWED_HEADERS.PARCELAS, { chave_importacao: 25, numero_documento: 22, linha_digitavel: 34, codigo_barras: 34, observacoes: 42 });
  parcelas.getColumn(3).numFmt = '#,##0.00;[Red](#,##0.00);-';
  parcelas.getColumn(4).numFmt = 'yyyy-mm-dd';
  parcelas.getColumn(1).numFmt = '@';
  parcelas.getColumn(2).numFmt = '0';
  [5, 6, 7, 8].forEach((column) => { parcelas.getColumn(column).numFmt = '@'; });

  const rateios = workbook.addWorksheet('RATEIOS');
  setupDataSheet(rateios, ALLOWED_HEADERS.RATEIOS, { chave_importacao: 25, empresa_codigo: 20, obra_codigo: 20, observacoes: 42 });
  rateios.getColumn(6).numFmt = '0.00';
  rateios.getColumn(7).numFmt = '#,##0.00;[Red](#,##0.00);-';
  [1, 2, 3, 4, 5, 8].forEach((column) => { rateios.getColumn(column).numFmt = '@'; });

  const impostos = workbook.addWorksheet('IMPOSTOS');
  setupDataSheet(impostos, ALLOWED_HEADERS.IMPOSTOS, { chave_importacao: 25, tipo_imposto: 18, descricao: 28, observacoes: 42 });
  impostos.getColumn(5).numFmt = '#,##0.00;[Red](#,##0.00);-';
  impostos.getColumn(6).numFmt = '0.0000';
  impostos.getColumn(7).numFmt = '#,##0.00;[Red](#,##0.00);-';
  [1, 2, 3, 4, 8].forEach((column) => { impostos.getColumn(column).numFmt = '@'; });

  const referencias = workbook.addWorksheet('REFERENCIAS', { views: [{ state: 'frozen', ySplit: 1, showGridLines: false }] });
  const refHeaders = [
    'empresa_codigo', 'empresa_nome', 'obra_codigo', 'obra_nome',
    'credor_id', 'credor_nome', 'cpf_cnpj', 'favorecido_bancario',
    'categoria_id', 'categoria_nome', 'dre_grupo',
    'forma_codigo', 'forma_nome',
    'apropriacao_empresa_codigo', 'apropriacao_obra_codigo',
    'apropriacao_codigo', 'apropriacao_descricao'
  ];
  referencias.addRow(refHeaders);
  applyHeaderStyle(referencias.getRow(1));
  referencias.columns.forEach((column, index) => {
    column.width = [20, 30, 20, 36, 12, 36, 20, 22, 12, 36, 24, 20, 30, 24, 24, 22, 42][index] || 18;
  });
  const obraByIdReferencia = new Map(refs.obras.map((obra) => [Number(obra.id), obra]));
  const maxRefRows = Math.max(refs.obras.length, refs.credores.length, refs.categorias.length, refs.formasPagamento.length, refs.apropriacoes.length, 1);
  for (let index = 0; index < maxRefRows; index += 1) {
    const obra = refs.obras[index];
    const credor = refs.credores[index];
    const categoria = refs.categorias[index];
    const forma = refs.formasPagamento[index];
    const apropriacao = refs.apropriacoes[index];
    const apropriacaoObra = apropriacao ? obraByIdReferencia.get(Number(apropriacao.obra_id)) : null;
    const beneficiary = credor?.paymentBeneficiaries?.find((item) => item.ativo !== false && item.pix_tipo_chave && item.pix_chave);
    referencias.addRow([
      obra?.empresaGrupo?.codigo || null, obra?.empresaGrupo?.nome || null, obra?.codigo || null, obra?.nome || null,
      credor?.id || null, credor?.nome || null, credor?.cpf_cnpj || null, credor ? (beneficiary ? 'PRONTO' : 'PENDENTE') : null,
      categoria?.id || null, categoria?.nome || null, categoria?.dre_grupo || null,
      forma?.codigo || null, forma?.nome || null,
      apropriacaoObra?.empresaGrupo?.codigo || null, apropriacaoObra?.codigo || null,
      apropriacao?.codigo || null, apropriacao?.descricao || null
    ]);
  }
  referencias.getColumn(5).numFmt = '0';
  referencias.getColumn(9).numFmt = '0';
  [1, 2, 3, 4, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17].forEach((column) => { referencias.getColumn(column).numFmt = '@'; });

  const obraEnd = Math.max(refs.obras.length + 1, 2);
  const credorEnd = Math.max(refs.credores.length + 1, 2);
  const categoriaEnd = Math.max(refs.categorias.length + 1, 2);
  const formaEnd = Math.max(refs.formasPagamento.length + 1, 2);
  const apropriacaoEnd = Math.max(refs.apropriacoes.length + 1, 2);
  applyValidation(titulos, 2, `REFERENCIAS!$A$2:$A$${obraEnd}`);
  applyValidation(titulos, 3, `REFERENCIAS!$C$2:$C$${obraEnd}`);
  applyValidation(titulos, 4, `REFERENCIAS!$E$2:$E$${credorEnd}`);
  applyValidation(titulos, 5, `REFERENCIAS!$I$2:$I$${categoriaEnd}`);
  applyValidation(titulos, 6, `REFERENCIAS!$L$2:$L$${formaEnd}`);
  applyValidation(titulos, 7, '"ABERTO,PREVISAO"');
  applyValidation(titulos, 14, '"SIM,NAO"');
  applyValidation(titulos, 15, `REFERENCIAS!$P$2:$P$${apropriacaoEnd}`);
  applyValidation(titulos, 17, '"BOLETO,PIX,OUTROS"');
  applyValidation(rateios, 2, `REFERENCIAS!$A$2:$A$${obraEnd}`, MAX_TOTAL_ROWS + 1);
  applyValidation(rateios, 3, `REFERENCIAS!$C$2:$C$${obraEnd}`, MAX_TOTAL_ROWS + 1);
  applyValidation(rateios, 4, `REFERENCIAS!$P$2:$P$${apropriacaoEnd}`, MAX_TOTAL_ROWS + 1);
  applyValidation(rateios, 5, '"PERCENTUAL,VALOR"', MAX_TOTAL_ROWS + 1);
  applyValidation(impostos, 4, '"RETENCAO,ACRESCIMO"', MAX_TOTAL_ROWS + 1);
  await referencias.protect('', { selectLockedCells: true, selectUnlockedCells: true });

  const buffer = await workbook.xlsx.writeBuffer();
  if (!skipAudit) {
    await registrarEventoSeguranca({
      req, usuarioId: req.user?.id || null, tipoEvento: 'FINANCIAL_TITLE_IMPORT_TEMPLATE_DOWNLOADED',
      recursoTipo: 'FINANCEIRO_TITULO_IMPORTACAO', recursoId: TEMPLATE_VERSION, status: 'SUCCESS',
      descricao: 'Modelo de importacao de contas a pagar exportado',
      metadata: { template_version: TEMPLATE_VERSION, obras: refs.obras.length, credores: refs.credores.length }
    });
  }
  return Buffer.from(buffer);
}

function groupChildren(rows, sheetName, globalErrors) {
  const map = new Map();
  rows.forEach(({ rowNumber, payload }) => {
    const key = normalizeText(payload.chave_importacao, 120);
    if (!key) {
      globalErrors.push({ aba: sheetName, linha: rowNumber, coluna: 'chave_importacao', mensagem: 'Chave de importacao obrigatoria.' });
      return;
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ rowNumber, payload });
  });
  return map;
}

function addLineError(errors, sheet, row, column, error) {
  errors.push({ aba: sheet, linha: row, coluna: column || null, mensagem: error?.message || String(error) });
}

function buildFingerprint({ empresaId, parceiroId, documento, vencimento, valor, parcelas }) {
  const part = Array.isArray(parcelas) && parcelas.length
    ? parcelas.map((item) => `${item.numero_parcela}:${item.data_vencimento}:${item.valor}`).join('|')
    : 'UNICA';
  return crypto.createHash('sha256').update([
    empresaId, parceiroId, normalizeUpper(documento, 120) || '', vencimento, roundCurrency(valor), part
  ].join('::')).digest('hex');
}

function normalizeTituloRow(row, childMaps, refs, globalErrors) {
  const { rowNumber, payload: raw } = row;
  const errors = [];
  const warnings = [];
  let key = null;
  let payload = null;
  let fingerprint = null;
  try {
    key = normalizeText(raw.chave_importacao, 120);
    if (!key) throw createHttpError(400, 'Chave de importacao obrigatoria.');
    const obra = resolveObraByCodigos(refs, raw.empresa_codigo, raw.obra_codigo);
    const obraId = Number(obra.id);
    const parceiroId = parseInteger(raw.credor_id, 'Credor', { required: true });
    const categoriaId = parseInteger(raw.categoria_id, 'Categoria', { required: true });
    const formaCodigo = normalizeUpper(raw.forma_pagamento_codigo, 60);
    if (!formaCodigo) throw createHttpError(400, 'Forma de pagamento e obrigatoria.');
    const parceiro = refs.credorById.get(parceiroId);
    const categoria = refs.categoriaById.get(categoriaId);
    const forma = refs.formaByCodigo.get(formaCodigo);
    if (!parceiro) throw createHttpError(400, 'Credor inexistente, inativo ou inelegivel para contas a pagar.');
    if (!categoria) throw createHttpError(400, 'Categoria inexistente, inativa ou incompativel com contas a pagar.');
    if (!forma) throw createHttpError(400, 'Forma de pagamento inativa ou nao permitida nesta importacao.');
    const favorecidoPronto = Array.isArray(parceiro.paymentBeneficiaries)
      && parceiro.paymentBeneficiaries.some((item) => item.ativo !== false && item.pix_tipo_chave && item.pix_chave);
    if (!favorecidoPronto) {
      warnings.push({
        aba: 'TITULOS',
        linha: rowNumber,
        coluna: 'credor_id',
        mensagem: 'Credor sem favorecido bancario/PIX completo. O titulo pode ser importado, mas nao estara elegivel para lote bancario ate a regularizacao.'
      });
    }
    const status = normalizeUpper(raw.status, 20) || 'ABERTO';
    if (!['ABERTO', 'PREVISAO'].includes(status)) throw createHttpError(400, 'Status deve ser ABERTO ou PREVISAO.');
    const descricao = normalizeText(raw.descricao, 255);
    if (!descricao) throw createHttpError(400, 'Descricao obrigatoria.');
    const valor = parseMoney(raw.valor_total, 'Valor total', { required: true });
    const hoje = new Date().toISOString().slice(0, 10);
    const dataEmissao = parseDate(raw.data_emissao, 'Data de emissao', { defaultValue: hoje });
    const dataVencimento = parseDate(raw.data_vencimento, 'Data de vencimento', { required: true });
    const competenciaData = parseDate(raw.competencia_data, 'Competencia', { required: true });
    const consideraDre = parseBoolean(raw.considera_dre, true);
    const apropriacao = resolveApropriacaoByCodigo(refs, obra, raw.apropriacao_codigo);
    const apropriacaoId = apropriacao ? Number(apropriacao.id) : null;

    const parcelRows = childMaps.PARCELAS.get(key) || [];
    const parcelas = parcelRows.map(({ rowNumber: childRow, payload: item }) => {
      try {
        return {
          numero_parcela: parseInteger(item.numero_parcela, 'Numero da parcela', { required: true }),
          valor: parseMoney(item.valor, 'Valor da parcela', { required: true }),
          data_vencimento: parseDate(item.data_vencimento, 'Vencimento da parcela', { required: true }),
          numero_documento: normalizeText(item.numero_documento, 120),
          linha_digitavel: normalizeText(item.linha_digitavel, 255),
          codigo_barras: normalizeText(item.codigo_barras, 255),
          observacoes: normalizeText(item.observacoes, 4000)
        };
      } catch (error) {
        addLineError(errors, 'PARCELAS', childRow, null, error);
        return null;
      }
    }).filter(Boolean).sort((a, b) => a.numero_parcela - b.numero_parcela);
    if (parcelas.length) {
      const numbers = parcelas.map((item) => item.numero_parcela);
      const expected = Array.from({ length: parcelas.length }, (_, index) => index + 1);
      if (numbers.join(',') !== expected.join(',')) addLineError(errors, 'PARCELAS', rowNumber, 'numero_parcela', 'Parcelas devem ser sequenciais, sem repeticoes ou lacunas.');
      const parcelTotal = roundCurrency(parcelas.reduce((sum, item) => sum + item.valor, 0));
      if (Math.abs(parcelTotal - valor) > 0.009) addLineError(errors, 'PARCELAS', rowNumber, 'valor', 'A soma das parcelas deve ser igual ao valor_total.');
    }

    const rateioRows = childMaps.RATEIOS.get(key) || [];
    const rateios = rateioRows.map(({ rowNumber: childRow, payload: item }) => {
      try {
        const rateioObra = resolveObraByCodigos(refs, item.empresa_codigo, item.obra_codigo, 'Obra do rateio');
        const rateioObraId = Number(rateioObra.id);
        const rateioApropriacao = resolveApropriacaoByCodigo(
          refs,
          rateioObra,
          item.apropriacao_codigo,
          'Apropriacao do rateio',
          { required: true }
        );
        const rateioApropriacaoId = Number(rateioApropriacao.id);
        const tipoRateio = normalizeUpper(item.tipo_rateio, 20);
        if (!['PERCENTUAL', 'VALOR'].includes(tipoRateio)) throw createHttpError(400, 'Tipo de rateio deve ser PERCENTUAL ou VALOR.');
        return {
          obra_id: rateioObraId,
          apropriacao_id: rateioApropriacaoId,
          tipo_rateio: tipoRateio,
          percentual: tipoRateio === 'PERCENTUAL' ? parsePercentage(item.percentual, 'Percentual') : null,
          valor_rateio: tipoRateio === 'VALOR' ? parseMoney(item.valor_rateio, 'Valor do rateio', { required: true }) : null,
          observacoes: normalizeText(item.observacoes, 4000)
        };
      } catch (error) {
        addLineError(errors, 'RATEIOS', childRow, null, error);
        return null;
      }
    }).filter(Boolean);
    if (rateios.length && apropriacaoId) addLineError(errors, 'TITULOS', rowNumber, 'apropriacao_codigo', 'Nao informe apropriacao principal quando houver rateios.');
    if (rateios.length && new Set(rateios.map((item) => item.tipo_rateio)).size > 1) addLineError(errors, 'RATEIOS', rowNumber, 'tipo_rateio', 'Todos os rateios da chave devem usar o mesmo tipo.');

    const impostoRows = childMaps.IMPOSTOS.get(key) || [];
    const impostos = impostoRows.map(({ rowNumber: childRow, payload: item }) => {
      try {
        const tipoImposto = normalizeText(item.tipo_imposto, 60);
        if (!tipoImposto) throw createHttpError(400, 'Tipo de imposto obrigatorio.');
        const natureza = normalizeUpper(item.natureza, 20) || 'RETENCAO';
        if (!['RETENCAO', 'ACRESCIMO'].includes(natureza)) throw createHttpError(400, 'Natureza deve ser RETENCAO ou ACRESCIMO.');
        return {
          tipo_imposto: tipoImposto,
          descricao: normalizeText(item.descricao, 180),
          natureza,
          base_calculo: parseMoney(item.base_calculo, 'Base de calculo', { allowZero: true }),
          aliquota: parsePercentage(item.aliquota, 'Aliquota'),
          valor: parseMoney(item.valor, 'Valor do imposto', { required: true }),
          observacoes: normalizeText(item.observacoes, 4000)
        };
      } catch (error) {
        addLineError(errors, 'IMPOSTOS', childRow, null, error);
        return null;
      }
    }).filter(Boolean);

    payload = {
      tipo: 'PAGAR', status, obra_id: obraId, parceiro_id: parceiroId,
      categoria_financeira_id: categoriaId, forma_pagamento_id: forma.id,
      descricao, numero_documento: normalizeText(raw.numero_documento, 120), valor,
      data_emissao: dataEmissao, data_vencimento: dataVencimento, competencia_data: competenciaData,
      considera_dre: consideraDre, apropriacao_id: apropriacaoId,
      observacoes: normalizeText(raw.observacoes, 4000), forma_cobranca: normalizeUpper(raw.forma_cobranca, 30),
      banco_cobranca: normalizeText(raw.banco_cobranca, 120), linha_digitavel: normalizeText(raw.linha_digitavel, 255),
      codigo_barras: normalizeText(raw.codigo_barras, 255),
      quantidade_parcelas: parcelas.length || 1, parcelas, rateios, impostos,
      tipo_rateio: rateios[0]?.tipo_rateio || null
    };
    const totalRetencoes = impostos.filter((item) => item.natureza === 'RETENCAO').reduce((sum, item) => sum + item.valor, 0);
    const totalAcrescimos = impostos.filter((item) => item.natureza === 'ACRESCIMO').reduce((sum, item) => sum + item.valor, 0);
    payload.__resumo = {
      valor_bruto: valor,
      valor_impostos: roundCurrency(totalRetencoes - totalAcrescimos),
      valor_liquido: roundCurrency(Math.max(valor - totalRetencoes + totalAcrescimos, 0)),
      titulos_gerados: parcelas.length || 1,
      empresa_id: Number(obra.empresa_grupo_id)
    };
    fingerprint = buildFingerprint({
      empresaId: obra.empresa_grupo_id, parceiroId, documento: payload.numero_documento,
      vencimento: dataVencimento, valor, parcelas
    });
  } catch (error) {
    addLineError(errors, 'TITULOS', rowNumber, null, error);
  }
  globalErrors.push(...errors);
  return { rowNumber, key: key || `LINHA-${rowNumber}`, payload, fingerprint, errors, warnings };
}

async function validatePayloadWithDomain(req, item) {
  if (!item.payload || item.errors.length) return;
  const payload = { ...item.payload };
  delete payload.__resumo;
  const transaction = await sequelize.transaction();
  try {
    await criarTituloManual(req, payload, {
      transaction, origemTitulo: 'IMPORTACAO', registrarSeguranca: false, retornarTitulosCriados: true
    });
  } catch (error) {
    addLineError(item.errors, 'TITULOS', item.rowNumber, null, error);
  } finally {
    await transaction.rollback();
  }
}

function calculatePayloadNet(payload = {}) {
  const taxes = Array.isArray(payload.impostos) ? payload.impostos : [];
  const retentions = taxes.filter((item) => item.natureza === 'RETENCAO').reduce((sum, item) => sum + Number(item.valor || 0), 0);
  const additions = taxes.filter((item) => item.natureza === 'ACRESCIMO').reduce((sum, item) => sum + Number(item.valor || 0), 0);
  return roundCurrency(Math.max(Number(payload.valor || 0) - retentions + additions, 0));
}

async function findExistingDuplicate(payload, { transaction = null } = {}) {
  const obra = await Obra.findByPk(payload.obra_id, { attributes: ['id', 'empresa_grupo_id'], transaction });
  if (!obra?.empresa_grupo_id) return null;
  const where = {
    tipo: 'PAGAR', empresa_id: Number(obra.empresa_grupo_id), parceiro_id: Number(payload.parceiro_id),
    data_vencimento: payload.data_vencimento, valor_original: calculatePayloadNet(payload)
  };
  if (payload.numero_documento) where.numero_documento = payload.numero_documento;
  return TituloFinanceiro.findOne({ where, attributes: ['id', 'codigo', 'origem_titulo'], transaction });
}

async function addDuplicateWarnings(items, userId, fileHash) {
  const previous = await FinanceiroTituloImportacao.findOne({
    where: { arquivo_hash: fileHash, criado_por: userId, status: 'CONFIRMADO' },
    order: [['id', 'DESC']]
  });
  if (previous) {
    items.forEach((item) => item.warnings.push({
      aba: 'TITULOS', linha: item.rowNumber, coluna: null,
      mensagem: `Este arquivo ja foi confirmado na importacao ${previous.codigo}. Confirme somente se a repeticao for intencional.`
    }));
  }

  for (const item of items) {
    if (!item.payload || item.errors.length) continue;
    const duplicate = await findExistingDuplicate(item.payload);
    if (duplicate) {
      item.warnings.push({
        aba: 'TITULOS', linha: item.rowNumber, coluna: 'numero_documento',
        mensagem: `Possivel duplicidade com ${duplicate.codigo || `titulo #${duplicate.id}`} (${duplicate.origem_titulo}).`
      });
    }
  }
}

function buildReferenceMaps(refs) {
  const obraLookup = buildObraLookup(refs.obras);
  const apropriacaoLookup = buildApropriacaoLookup(refs.apropriacoes);
  return {
    ...refs,
    ...obraLookup,
    ...apropriacaoLookup,
    credorById: new Map(refs.credores.map((item) => [Number(item.id), item])),
    categoriaById: new Map(refs.categorias.map((item) => [Number(item.id), item])),
    formaByCodigo: new Map(refs.formasPagamento.map((item) => [String(item.codigo).toUpperCase(), item]))
  };
}

async function criarPreviewImportacao(req, file) {
  await assertImportPermission(req);
  if (!file?.buffer) throw createHttpError(400, 'Selecione um arquivo .xlsx.');
  if (!String(file.originalname || '').toLowerCase().endsWith('.xlsx')) throw createHttpError(400, 'Envie somente o modelo .xlsx.');
  const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
  const { sheets, totalRows } = await parseWorkbook(file.buffer);
  const refs = buildReferenceMaps(await getReferenceData(req.user));
  const globalErrors = [];
  const childMaps = {
    PARCELAS: groupChildren(sheets.PARCELAS, 'PARCELAS', globalErrors),
    RATEIOS: groupChildren(sheets.RATEIOS, 'RATEIOS', globalErrors),
    IMPOSTOS: groupChildren(sheets.IMPOSTOS, 'IMPOSTOS', globalErrors)
  };
  const titleKeys = new Set();
  const items = sheets.TITULOS.map((row) => {
    const item = normalizeTituloRow(row, childMaps, refs, globalErrors);
    if (titleKeys.has(item.key)) addLineError(item.errors, 'TITULOS', item.rowNumber, 'chave_importacao', 'Chave de importacao repetida na aba TITULOS.');
    titleKeys.add(item.key);
    return item;
  });
  for (const [sheetName, map] of Object.entries(childMaps)) {
    for (const [key, rows] of map.entries()) {
      if (!titleKeys.has(key)) rows.forEach((row) => addLineError(globalErrors, sheetName, row.rowNumber, 'chave_importacao', 'Chave nao encontrada na aba TITULOS.'));
    }
  }
  for (const item of items) await validatePayloadWithDomain(req, item);
  await addDuplicateWarnings(items, req.user.id, fileHash);
  const errors = [...globalErrors, ...items.flatMap((item) => item.errors)].filter((error, index, array) =>
    array.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(error)) === index
  );
  const warnings = items.flatMap((item) => item.warnings);
  const validItems = items.filter((item) => item.payload && item.errors.length === 0);
  const totals = validItems.reduce((acc, item) => {
    const summary = item.payload.__resumo;
    acc.valor_bruto += summary.valor_bruto;
    acc.valor_impostos += summary.valor_impostos;
    acc.valor_liquido += summary.valor_liquido;
    acc.titulos_gerados += summary.titulos_gerados;
    return acc;
  }, { valor_bruto: 0, valor_impostos: 0, valor_liquido: 0, titulos_gerados: 0 });
  const code = `IMP-TIT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const expiration = new Date(Date.now() + PREVIEW_EXPIRATION_HOURS * 60 * 60 * 1000);
  const importacao = await sequelize.transaction(async (transaction) => {
    const created = await FinanceiroTituloImportacao.create({
      codigo: code, template_version: TEMPLATE_VERSION, arquivo_nome: String(file.originalname).slice(0, 255),
      arquivo_hash: fileHash, status: errors.length ? 'PREVIEW' : 'VALIDADO', total_linhas: totalRows,
      total_titulos_logicos: items.length, total_titulos_gerados: totals.titulos_gerados,
      total_erros: errors.length, total_avisos: warnings.length,
      valor_bruto: roundCurrency(totals.valor_bruto), valor_impostos: roundCurrency(totals.valor_impostos),
      valor_liquido: roundCurrency(totals.valor_liquido), erros_json: JSON.stringify(errors),
      avisos_json: JSON.stringify(warnings), criado_por: req.user.id, expira_em: expiration
    }, { transaction });
    await FinanceiroTituloImportacaoLinha.bulkCreate(items.map((item) => {
      const payload = item.payload ? { ...item.payload } : null;
      if (payload) delete payload.__resumo;
      return {
        importacao_id: created.id, aba: 'TITULOS', numero_linha: item.rowNumber,
        chave_importacao: item.key, fingerprint: item.fingerprint,
        payload_json: payload ? JSON.stringify(payload) : null,
        status: item.errors.length ? 'ERRO' : item.warnings.length ? 'AVISO' : 'VALIDO',
        erros_json: JSON.stringify(item.errors), avisos_json: JSON.stringify(item.warnings)
      };
    }), { transaction });
    return created;
  });
  await registrarEventoSeguranca({
    req, usuarioId: req.user.id, tipoEvento: 'FINANCIAL_TITLE_IMPORT_PREVIEWED',
    recursoTipo: 'FINANCEIRO_TITULO_IMPORTACAO', recursoId: importacao.id, status: errors.length ? 'WARNING' : 'SUCCESS',
    descricao: 'Preview de importacao de contas a pagar processado',
    metadata: { codigo: code, total_titulos: items.length, erros: errors.length, avisos: warnings.length, arquivo_hash: fileHash }
  });
  return carregarImportacao(req, importacao.id);
}

function serializeLine(line) {
  const plain = line.toJSON ? line.toJSON() : { ...line };
  return { ...plain, payload: parseJson(plain.payload_json, null), erros: parseJson(plain.erros_json), avisos: parseJson(plain.avisos_json), payload_json: undefined, erros_json: undefined, avisos_json: undefined };
}

function serializeImport(importacao) {
  const plain = importacao.toJSON ? importacao.toJSON() : { ...importacao };
  return {
    ...plain,
    erros: parseJson(plain.erros_json), avisos: parseJson(plain.avisos_json),
    erros_json: undefined, avisos_json: undefined,
    linhas: Array.isArray(plain.linhas) ? plain.linhas.map(serializeLine) : [],
    resultados: Array.isArray(plain.resultados) ? plain.resultados : []
  };
}

async function carregarImportacao(req, importacaoId, { transaction = null, lock = false } = {}) {
  await assertImportPermission(req);
  const id = Number(importacaoId);
  if (!Number.isInteger(id) || id <= 0) throw createHttpError(400, 'Importacao invalida.');
  const importacao = await FinanceiroTituloImportacao.findByPk(id, {
    include: [
      { model: FinanceiroTituloImportacaoLinha, as: 'linhas', include: [{ model: FinanceiroTituloImportacaoResultado, as: 'resultados' }] },
      { model: FinanceiroTituloImportacaoResultado, as: 'resultados', include: [{ model: TituloFinanceiro, as: 'tituloFinanceiro', attributes: ['id', 'codigo', 'status', 'valor_original'] }] }
    ],
    transaction,
    lock: lock && transaction ? transaction.LOCK.UPDATE : undefined
  });
  if (!importacao) throw createHttpError(404, 'Importacao nao encontrada.');
  if (!isBusinessAdmin(req.user) && Number(importacao.criado_por) !== Number(req.user.id)) throw createHttpError(403, 'Acesso negado a esta importacao.');
  return serializeImport(importacao);
}

async function confirmarImportacao(req, importacaoId, { idempotencyKey, aceitarAvisos = false } = {}) {
  await assertImportPermission(req);
  const key = normalizeText(idempotencyKey, 180);
  if (!key) throw createHttpError(400, 'Idempotency-Key e obrigatoria para confirmar a importacao.');
  let confirmedImport = null;
  let createdTitleIds = [];
  try {
    await sequelize.transaction(async (transaction) => {
      const importacao = await FinanceiroTituloImportacao.findByPk(importacaoId, {
        include: [{ model: FinanceiroTituloImportacaoLinha, as: 'linhas' }], transaction, lock: transaction.LOCK.UPDATE
      });
      if (!importacao) throw createHttpError(404, 'Importacao nao encontrada.');
      if (!isBusinessAdmin(req.user) && Number(importacao.criado_por) !== Number(req.user.id)) throw createHttpError(403, 'Acesso negado a esta importacao.');
      if (importacao.status === 'CONFIRMADO') {
        if (importacao.idempotency_key === key) {
          confirmedImport = importacao;
          return;
        }
        throw createHttpError(409, 'Importacao ja confirmada com outra chave de idempotencia.');
      }
      if (importacao.total_erros > 0 || importacao.status !== 'VALIDADO') throw createHttpError(400, 'Corrija os erros e gere um novo preview antes de confirmar.');
      if (new Date(importacao.expira_em).getTime() < Date.now()) throw createHttpError(400, 'Preview expirado. Envie a planilha novamente.');
      if (importacao.total_avisos > 0 && !aceitarAvisos) throw createHttpError(400, 'Confirme explicitamente os avisos antes de continuar.');
      const existingKey = await FinanceiroTituloImportacao.findOne({ where: { idempotency_key: key }, transaction, lock: transaction.LOCK.UPDATE });
      if (existingKey && Number(existingKey.id) !== Number(importacao.id)) throw createHttpError(409, 'Chave de idempotencia ja utilizada em outra importacao.');
      await importacao.update({ status: 'PROCESSANDO', idempotency_key: key }, { transaction });
      for (const line of importacao.linhas.sort((a, b) => a.numero_linha - b.numero_linha)) {
        const payload = parseJson(line.payload_json, null);
        if (!payload) throw createHttpError(400, `Linha ${line.numero_linha} sem payload validado.`);
        const duplicate = await findExistingDuplicate(payload, { transaction });
        const previewAlreadyWarnedDuplicate = parseJson(line.avisos_json).some((warning) =>
          String(warning?.mensagem || '').startsWith('Possivel duplicidade com')
        );
        if (duplicate && !previewAlreadyWarnedDuplicate) {
          throw createHttpError(
            409,
            `Foi encontrado um novo possivel duplicado para a linha ${line.numero_linha} (${duplicate.codigo || `titulo #${duplicate.id}`}). Gere o preview novamente.`
          );
        }
        const result = await criarTituloManual(req, payload, {
          transaction, origemTitulo: 'IMPORTACAO', registrarSeguranca: false, retornarTitulosCriados: true
        });
        for (const title of result.titulos) {
          await FinanceiroTituloImportacaoResultado.create({
            importacao_id: importacao.id, linha_id: line.id, titulo_financeiro_id: title.id,
            numero_parcela: title.numero_parcela || null, valor: title.valor_original
          }, { transaction });
          createdTitleIds.push(title.id);
        }
      }
      await importacao.update({
        status: 'CONFIRMADO', confirmado_por: req.user.id, confirmado_em: new Date(),
        total_titulos_gerados: createdTitleIds.length, falha_mensagem: null
      }, { transaction });
      confirmedImport = importacao;
    });
  } catch (error) {
    await FinanceiroTituloImportacao.update({ status: 'FALHA', falha_mensagem: String(error.message || error).slice(0, 4000) }, {
      where: { id: importacaoId, status: { [Op.ne]: 'CONFIRMADO' } }
    }).catch(() => null);
    throw error;
  }
  await registrarEventoSeguranca({
    req, usuarioId: req.user.id, tipoEvento: 'FINANCIAL_TITLE_IMPORT_CONFIRMED',
    recursoTipo: 'FINANCEIRO_TITULO_IMPORTACAO', recursoId: importacaoId, status: 'SUCCESS',
    descricao: 'Importacao atomica de contas a pagar confirmada',
    metadata: { idempotency_key: key, quantidade_titulos: createdTitleIds.length, titulos_ids: createdTitleIds }
  });
  return carregarImportacao(req, confirmedImport.id);
}

module.exports = {
  TEMPLATE_VERSION,
  __testables: {
    buildReferenceMaps,
    normalizeTituloRow,
    resolveObraByCodigos,
    resolveApropriacaoByCodigo
  },
  criarPreviewImportacao,
  confirmarImportacao,
  carregarImportacao,
  gerarModeloImportacao,
  parseWorkbook
};
