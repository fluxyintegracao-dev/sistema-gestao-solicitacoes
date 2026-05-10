const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { PDFDocument } = require('pdf-lib');
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
const { registrarEventoSeguranca } = require('./securityLogService');
const { normalizeOriginalName, sanitizeFileNameForStorage } = require('../utils/fileName');

const TIPOS_DOCUMENTO = new Set(['CONTRATO', 'QUADRO_RESUMO']);

const VARIAVEIS_CONTRATO_COMERCIAL = [
  { chave: 'contrato.numero', descricao: 'Numero do contrato' },
  { chave: 'contrato.numero_identificador', descricao: 'Identificador do contrato calculado pelo empreendimento/unidade' },
  { chave: 'contrato.data', descricao: 'Data do contrato em formato brasileiro' },
  { chave: 'contrato.valor_total', descricao: 'Valor total em numero' },
  { chave: 'contrato.valor_total_formatado', descricao: 'Valor total formatado em reais' },
  { chave: 'contrato.valor_total_extenso', descricao: 'Valor total por extenso' },
  { chave: 'contrato.valor_total_com_extenso', descricao: 'Valor total formatado com valor por extenso' },
  { chave: 'contrato.valor_entrada_formatado', descricao: 'Valor de entrada formatado' },
  { chave: 'contrato.desconto_formatado', descricao: 'Desconto formatado' },
  { chave: 'contrato.indice_reajuste', descricao: 'Indice de reajuste' },
  { chave: 'contrato.possui_vaga_garagem', descricao: 'Indica se o contrato possui vaga de garagem' },
  { chave: 'contrato.quantidade_vagas_garagem', descricao: 'Quantidade de vagas de garagem' },
  { chave: 'contrato.vagas_garagem_posicao', descricao: 'Posicao especifica das vagas de garagem' },
  { chave: 'contrato.local_assinatura', descricao: 'Local de assinatura do quadro resumo' },
  { chave: 'contrato.data_assinatura', descricao: 'Data de assinatura em formato brasileiro' },
  { chave: 'contrato.data_assinatura_extenso', descricao: 'Data de assinatura por extenso' },
  { chave: 'contrato.local_data_assinatura', descricao: 'Local e data de assinatura no formato do item XI' },
  { chave: 'cliente.nome', descricao: 'Nome do comprador' },
  { chave: 'cliente.cpf_cnpj', descricao: 'CPF/CNPJ do comprador' },
  { chave: 'cliente.email', descricao: 'E-mail do comprador' },
  { chave: 'cliente.telefone', descricao: 'Telefone do comprador' },
  { chave: 'cliente.rg', descricao: 'RG do comprador' },
  { chave: 'cliente.data_nascimento', descricao: 'Data de nascimento do comprador' },
  { chave: 'cliente.nacionalidade', descricao: 'Nacionalidade do comprador' },
  { chave: 'cliente.profissao', descricao: 'Profissao do comprador' },
  { chave: 'cliente.estado_civil', descricao: 'Estado civil do comprador' },
  { chave: 'cliente.endereco', descricao: 'Endereco do comprador' },
  { chave: 'cliente.numero', descricao: 'Numero do endereco do comprador' },
  { chave: 'cliente.complemento', descricao: 'Complemento do endereco do comprador' },
  { chave: 'cliente.bairro', descricao: 'Bairro do comprador' },
  { chave: 'cliente.cidade_uf', descricao: 'Cidade/UF do comprador' },
  { chave: 'cliente.cep', descricao: 'CEP do comprador' },
  { chave: 'cliente.conjuge_nome', descricao: 'Nome do conjuge do comprador' },
  { chave: 'conjuge.nome', descricao: 'Nome do conjuge cadastrado' },
  { chave: 'conjuge.cpf_cnpj', descricao: 'CPF/CNPJ do conjuge cadastrado' },
  { chave: 'conjuge.email', descricao: 'E-mail do conjuge cadastrado' },
  { chave: 'conjuge.telefone', descricao: 'Telefone do conjuge cadastrado' },
  { chave: 'conjuge.data_nascimento', descricao: 'Data de nascimento do conjuge cadastrado' },
  { chave: 'conjuge.nacionalidade', descricao: 'Nacionalidade do conjuge cadastrado' },
  { chave: 'conjuge.profissao', descricao: 'Profissao do conjuge cadastrado' },
  { chave: 'conjuge.estado_civil', descricao: 'Estado civil do conjuge cadastrado' },
  { chave: 'conjuge.endereco', descricao: 'Endereco do conjuge cadastrado' },
  { chave: 'conjuge.numero', descricao: 'Numero do endereco do conjuge cadastrado' },
  { chave: 'conjuge.complemento', descricao: 'Complemento do endereco do conjuge cadastrado' },
  { chave: 'conjuge.bairro', descricao: 'Bairro do conjuge cadastrado' },
  { chave: 'conjuge.cidade_uf', descricao: 'Cidade/UF do conjuge cadastrado' },
  { chave: 'conjuge.cep', descricao: 'CEP do conjuge cadastrado' },
  { chave: 'cliente.regime_bens', descricao: 'Regime de bens do comprador' },
  { chave: 'empreendimento.nome', descricao: 'Nome do empreendimento' },
  { chave: 'empreendimento.codigo', descricao: 'Codigo do empreendimento' },
  { chave: 'unidade.codigo', descricao: 'Codigo da unidade' },
  { chave: 'unidade.nome', descricao: 'Nome da unidade' },
  { chave: 'unidade.bloco', descricao: 'Bloco da unidade' },
  { chave: 'unidade.torre', descricao: 'Torre/predio da unidade' },
  { chave: 'unidade.pavimento', descricao: 'Pavimento da unidade' },
  { chave: 'unidade.tipologia', descricao: 'Tipologia da unidade' },
  { chave: 'unidade.metragem_privativa', descricao: 'Metragem privativa da unidade' },
  { chave: 'unidade.metragem_privativa_formatada', descricao: 'Metragem privativa formatada com m2' },
  { chave: 'unidade.fracao_ideal', descricao: 'Fracao ideal da unidade' },
  { chave: 'unidade.vagas_garagem', descricao: 'Resumo das vagas de garagem da unidade vendida' },
  { chave: 'corretor.nome', descricao: 'Nome do corretor' },
  { chave: 'corretor.cpf_cnpj', descricao: 'CPF/CNPJ do corretor' },
  { chave: 'corretor.cpf_cnpj_formatado', descricao: 'CPF/CNPJ do corretor com rotulo' },
  { chave: 'corretor.creci', descricao: 'CRECI do corretor' },
  { chave: 'corretor.creci_formatado', descricao: 'CRECI do corretor com rotulo' },
  { chave: 'corretor.dados_identificacao', descricao: 'Dados do corretor com CPF e CRECI rotulados' },
  { chave: 'corretor.percentual_comissao', descricao: 'Percentual de comissao do corretor' },
  { chave: 'parcelas.resumo', descricao: 'Resumo das parcelas do contrato' },
  { chave: 'parcelas.quadro_resumo_texto', descricao: 'Linhas agrupadas para o item VI do quadro resumo' },
  { chave: 'parcelas.quadro_resumo_itens', descricao: 'Lista de parcelas agrupadas para tabelas do quadro resumo' },
  { chave: 'quadro_resumo.item_iii_texto', descricao: 'Resumo do item III do Quadro Resumo' },
  { chave: 'quadro_resumo.preco_total_unidade', descricao: 'Preco total da unidade para o item VI.a' },
  { chave: 'quadro_resumo.valor_leilao', descricao: 'Valor do imovel para fins de publico leilao' },
  { chave: 'quadro_resumo.assinaturas_texto', descricao: 'Bloco automatico de assinaturas do item XII' },
  { chave: 'assinaturas.comprador', descricao: 'Linha de identificacao do comprador para assinatura' },
  { chave: 'assinaturas.conjuge', descricao: 'Linha de identificacao do conjuge para assinatura' },
  { chave: 'assinaturas.corretor', descricao: 'Linha de identificacao do corretor para assinatura' },
  { chave: 'assinaturas.vendedora', descricao: 'Linha de identificacao da vendedora/empreendimento para assinatura' },
  { chave: 'assinaturas.vendedora_dados', descricao: 'Dados completos da incorporadora/vendedora para o item XII' },
  { chave: 'assinaturas.testemunha_1', descricao: 'Linha de identificacao da primeira testemunha' },
  { chave: 'assinaturas.testemunha_2', descricao: 'Linha de identificacao da segunda testemunha' },
  { chave: 'testemunha_1.nome', descricao: 'Nome da primeira testemunha' },
  { chave: 'testemunha_1.cpf', descricao: 'CPF da primeira testemunha' },
  { chave: 'testemunha_2.nome', descricao: 'Nome da segunda testemunha' },
  { chave: 'testemunha_2.cpf', descricao: 'CPF da segunda testemunha' },
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
  '[Nº do CPF do Corretor]': '{{corretor.cpf_cnpj_formatado}}',
  '[Nº do CRECI do Corretor]': '{{corretor.creci_formatado}}',
  '[Percentual]': '{{corretor.percentual_comissao}}',
  '[Valor em Reais]': '{{contrato.valor_total_formatado}}',
  '[Torre]': '{{unidade.torre}}',
  '[Unidade Autônoma]': '{{unidade.codigo}}',
  '[Area privativa]': '{{unidade.metragem_privativa}}',
  '[Área privativa]': '{{unidade.metragem_privativa}}',
  '[Fração Ideal]': '{{unidade.fracao_ideal}}',
  '[Vagas de Garagem]': '{{unidade.vagas_garagem}}',
  '[Local de Assinatura]': '{{contrato.local_assinatura}}',
  '[Data de Assinatura]': '{{contrato.data_assinatura_extenso}}',
  '[Forma de Pagamento]': '{{parcelas.quadro_resumo_texto}}',
  '[XXXX]': '{{contrato.numero}}',
  'Balneário de Iriri, Anchieta-ES, xx de xxx de xxxx.': '{{contrato.local_data_assinatura}}',
  'Balneário de Iriri, Anchieta -ES, xx de xxx de xxxx.': '{{contrato.local_data_assinatura}}',
  'Anchieta-ES, xx de xxx de xxxx.': '{{contrato.local_data_assinatura}}',
  'Anchieta -ES, xx de xxx de xxxx.': '{{contrato.local_data_assinatura}}'
};

Object.assign(LEGACY_BRACKET_ALIASES, {
  '[Nº do CPF]': '{{cliente.cpf_cnpj}}',
  '[nº do RG]': '{{cliente.rg}}',
  '[profissão]': '{{cliente.profissao}}',
  '[Nº]': '{{cliente.numero}}',
  '[Nº do CPF do Corretor]': '{{corretor.cpf_cnpj_formatado}}',
  '[Nº do CRECI do Corretor]': '{{corretor.creci_formatado}}',
  '[Unidade Autônoma]': '{{unidade.codigo}}',
  '[Área privativa]': '{{unidade.metragem_privativa}}',
  '[Fração Ideal]': '{{unidade.fracao_ideal}}',
  'Balneário de Iriri, Anchieta-ES, xx de xxx de xxxx.': '{{contrato.local_data_assinatura}}',
  'Balneário de Iriri, Anchieta -ES, xx de xxx de xxxx.': '{{contrato.local_data_assinatura}}'
});

function normalizeLegacyAlias(value) {
  return String(value || '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const LEGACY_BRACKET_ALIAS_BY_NORMALIZED = Object.entries(LEGACY_BRACKET_ALIASES).reduce((acc, [legacy, modern]) => {
  if (legacy.startsWith('[') && legacy.endsWith(']')) {
    acc.set(normalizeLegacyAlias(legacy), modern);
  }
  return acc;
}, new Map());

function createHttpError(statusCode, message, code = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  return error;
}

function isSuperadminUser(user) {
  return String(user?.perfil || '').trim().toUpperCase() === 'SUPERADMIN';
}

function documentoEstaAssinado(documento) {
  const status = String(documento?.status || '').trim().toUpperCase();
  const d4signStatus = String(documento?.d4sign_status || '').trim().toUpperCase();
  return status === 'ASSINADO'
    || d4signStatus === 'ASSINADO'
    || d4signStatus === 'FINALIZADO'
    || d4signStatus === 'CONCLUIDO'
    || Boolean(documento?.d4sign_finalizado_em);
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

function formatDateLongBr(value) {
  if (!value) return '';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function formatLocalDataAssinatura(local, value) {
  const partes = [
    safeString(local).trim(),
    formatDateLongBr(value)
  ].filter(Boolean);
  return partes.join(', ');
}

function formatCurrency(value) {
  const numeric = Number(value || 0);
  return numeric.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDecimalBr(value, fractionDigits = 2) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  return numeric.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
}

function formatArea(value) {
  const formatted = formatDecimalBr(value, 2);
  return formatted ? `${formatted} m²` : '';
}

function formatFracaoIdeal(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return safeString(value);
  return numeric.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6
  });
}

const EXTENSO_UNIDADES = ['', 'um', 'dois', 'tres', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
const EXTENSO_DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const EXTENSO_DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const EXTENSO_CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function joinExtenso(parts = []) {
  return parts.filter(Boolean).join(' e ');
}

function extensoAte999(value) {
  const numero = Number(value || 0);
  if (numero === 0) return '';
  if (numero === 100) return 'cem';

  const centenas = Math.floor(numero / 100);
  const dezenasUnidades = numero % 100;
  const dezenas = Math.floor(dezenasUnidades / 10);
  const unidades = dezenasUnidades % 10;

  const partes = [];
  if (centenas) partes.push(EXTENSO_CENTENAS[centenas]);
  if (dezenasUnidades >= 10 && dezenasUnidades <= 19) {
    partes.push(EXTENSO_DEZ_A_DEZENOVE[dezenasUnidades - 10]);
  } else {
    if (dezenas) partes.push(EXTENSO_DEZENAS[dezenas]);
    if (unidades) partes.push(EXTENSO_UNIDADES[unidades]);
  }

  return joinExtenso(partes);
}

function numeroInteiroPorExtenso(value) {
  const numero = Math.floor(Math.abs(Number(value || 0)));
  if (numero === 0) return 'zero';

  const milhoes = Math.floor(numero / 1000000);
  const milhares = Math.floor((numero % 1000000) / 1000);
  const resto = numero % 1000;
  const partes = [];

  if (milhoes) {
    partes.push(`${extensoAte999(milhoes)} ${milhoes === 1 ? 'milhão' : 'milhões'}`);
  }
  if (milhares) {
    partes.push(milhares === 1 ? 'mil' : `${extensoAte999(milhares)} mil`);
  }
  if (resto) {
    partes.push(extensoAte999(resto));
  }

  return partes.join(resto && (milhoes || milhares) && resto < 100 ? ' e ' : ', ');
}

function formatCurrencyExtenso(value) {
  const numeric = Number(value || 0);
  const reais = Math.floor(Math.abs(numeric));
  const centavos = Math.round((Math.abs(numeric) - reais) * 100);
  const partes = [
    `${numeroInteiroPorExtenso(reais)} ${reais === 1 ? 'real' : 'reais'}`
  ];
  if (centavos > 0) {
    partes.push(`${numeroInteiroPorExtenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  }
  return partes.join(' e ');
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

function escapeXml(value) {
  return safeString(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getXmlText(xml) {
  return safeString(xml)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeXmlText(xml) {
  return getXmlText(xml)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function buildRunXml(text, options = {}) {
  const {
    bold = false,
    font = 'Gadugi',
    size = '20'
  } = options;

  return `<w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}"/>${bold ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function buildParagraphXml(parts = [], options = {}) {
  const {
    align = 'left',
    font = 'Gadugi',
    size = '20'
  } = options;
  const normalizedParts = Array.isArray(parts) ? parts : [{ text: parts }];

  return `<w:p><w:pPr><w:jc w:val="${align}"/><w:spacing w:line="240" w:lineRule="auto"/></w:pPr>${normalizedParts.map((part) => (
    buildRunXml(part?.text ?? part, {
      bold: Boolean(part?.bold),
      font,
      size
    })
  )).join('')}</w:p>`;
}

function extractTableRows(tableXml) {
  return tableXml.match(/<w:tr[\s\S]*?<\/w:tr>/g) || [];
}

function extractTableCells(rowXml) {
  return rowXml.match(/<w:tc[\s\S]*?<\/w:tc>/g) || [];
}

function extractTableCellPr(cellXml) {
  const match = safeString(cellXml).match(/<w:tcPr[\s\S]*?<\/w:tcPr>/);
  return match ? match[0] : '<w:tcPr><w:tcW w:w="1200" w:type="dxa"/></w:tcPr>';
}

function extractTableRowPr(rowXml) {
  const match = safeString(rowXml).match(/<w:trPr[\s\S]*?<\/w:trPr>/);
  return match ? match[0] : '';
}

function buildTableCellXml(tcPr, paragraphs, options = {}) {
  if (
    Array.isArray(paragraphs)
    && paragraphs.length
    && paragraphs.every((paragraph) => paragraph && typeof paragraph === 'object' && ('text' in paragraph || 'bold' in paragraph))
  ) {
    return `<w:tc>${tcPr}${buildParagraphXml(paragraphs, options)}</w:tc>`;
  }

  const normalizedParagraphs = Array.isArray(paragraphs) ? paragraphs : [paragraphs];
  return `<w:tc>${tcPr}${normalizedParagraphs.map((paragraph) => (
    Array.isArray(paragraph)
      ? buildParagraphXml(paragraph, options)
      : buildParagraphXml([{ text: paragraph }], options)
  )).join('')}</w:tc>`;
}

function buildTableRowXml(sampleRow, cellParagraphs, options = {}) {
  const cells = extractTableCells(sampleRow);
  const cellPrs = cells.map(extractTableCellPr);
  const fallbackCellPr = cellPrs[cellPrs.length - 1] || '<w:tcPr><w:tcW w:w="1200" w:type="dxa"/></w:tcPr>';
  const rowPr = extractTableRowPr(sampleRow);

  return `<w:tr>${rowPr}${cellParagraphs.map((paragraphs, index) => (
    buildTableCellXml(cellPrs[index] || fallbackCellPr, paragraphs, options)
  )).join('')}</w:tr>`;
}

function buildSingleCellRowXml(sampleRow, paragraphs, options = {}) {
  const firstCell = extractTableCells(sampleRow)[0];
  const tcPr = firstCell ? extractTableCellPr(firstCell) : '<w:tcPr><w:tcW w:w="10507" w:type="dxa"/><w:gridSpan w:val="12"/></w:tcPr>';
  const rowPr = extractTableRowPr(sampleRow);
  return `<w:tr>${rowPr}${buildTableCellXml(tcPr, paragraphs, options)}</w:tr>`;
}

function decodeXmlEntities(value) {
  return safeString(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function buildParagraphLines(lines = [], options = {}) {
  return lines
    .map((line) => safeString(line).trim())
    .filter(Boolean)
    .map((line) => buildParagraphXml([{ text: line }], options))
    .join('');
}

function formatCpfAssinatura(value) {
  const cpf = safeString(value).trim();
  return cpf ? `CPF n\u00ba ${cpf}` : '';
}

function formatDocumentoRotulado(value) {
  const documento = safeString(value).trim();
  if (!documento) return '';
  const digits = documento.replace(/\D/g, '');
  const label = digits.length > 11 ? 'CNPJ' : 'CPF';
  return `${label}: ${documento}`;
}

function formatCreciRotulado(value) {
  const creci = safeString(value).trim();
  return creci ? `CRECI: ${creci}` : '';
}

function normalizeTextForMatch(value) {
  return safeString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function replaceKnownEmpreendimentoTitle(tableXml, dados = {}) {
  const nome = safeString(dados?.empreendimento?.nome).trim();
  if (!nome) return tableXml;

  const labels = [
    'EDIFÍCIO AREIA PRETA',
    'EDIFÍCIO PEDRA MENINA',
    'EDIFÍCIO PIEMONT',
    'EDIFÍCIO PIEMONTE',
    'RESIDENCIAL COSTA DO MAR',
    'RESIDENCIAL COSTA MAR'
  ];
  const normalizedLabels = new Set(labels.map(normalizeTextForMatch));
  const escapedNome = escapeXml(nome);
  const withDirectReplace = labels.reduce((currentXml, label) => replaceAll(currentXml, label, escapedNome), tableXml);

  const withTextNodeReplace = withDirectReplace.replace(/(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g, (full, open, text, close) => {
    const decodedText = decodeXmlEntities(text);
    return normalizedLabels.has(normalizeTextForMatch(decodedText))
      ? `${open}${escapedNome}${close}`
      : full;
  });

  return withTextNodeReplace
    .replace(
      /(<w:t\b[^>]*>)EDIF[ÍI]CIO\s*(<\/w:t>)([\s\S]{0,700}?<w:t\b[^>]*>)(AREIA PRETA|PEDRA MENINA|PIEMONT|PIEMONTE)(<\/w:t>)/gi,
      (_full, open, close, middleOpen, _suffix, suffixClose) => `${open}${escapedNome}${close}${middleOpen}${suffixClose}`
    )
    .replace(
      /(<w:t\b[^>]*>)RESIDENCIAL\s*(<\/w:t>)([\s\S]{0,700}?<w:t\b[^>]*>)(COSTA DO MAR|COSTA MAR)(<\/w:t>)/gi,
      (_full, open, close, middleOpen, _suffix, suffixClose) => `${open}${escapedNome}${close}${middleOpen}${suffixClose}`
    );
}

function extractRepresentanteLegalIncorporadora(bodyText = '') {
  const text = safeString(bodyText).replace(/\s+/g, ' ').trim();
  if (!text) return [];

  const representedMatch = text.match(/representad[ao]\s+por(?:\s+(?:seu|sua)\s+(?:diretor|diretora|socio administrador|sócio administrador|administrador|administradora|procurador|procuradora|representante legal))?\s+([^,.;]+)/i);
  if (!representedMatch) return [];

  const startIndex = representedMatch.index || 0;
  const afterRepresented = text.slice(startIndex);
  const nome = representedMatch[1].trim();
  const cpfMatch = afterRepresented.match(/CPF(?:\/MF)?\s*(?:n[ºo]\.?\s*)?([\d.-]{11,14})/i);
  const rgMatch = afterRepresented.match(/RG\s*(?:n[ºo]\.?\s*)?([A-Za-z0-9./-]+(?:\s?[A-Za-z0-9./-]+)*?)(?=,?\s*(?:CPF|e\s+CPF|residente|domiciliad[ao]|$))/i);

  return [
    nome ? `Representante legal: ${nome}` : '',
    cpfMatch ? `CPF nº ${cpfMatch[1]}` : '',
    rgMatch ? `RG nº ${rgMatch[1].trim()}` : ''
  ].filter(Boolean);
}

function extractIncorporadoraAssinaturaFromRows(rows = []) {
  const labelIndex = rows.findIndex((row) => {
    const text = normalizeXmlText(row);
    return text.includes('I.A') && text.includes('INCORPORADORA');
  });
  if (labelIndex < 0) return '';

  const bodyRow = rows.slice(labelIndex + 1).find((row) => {
    const text = normalizeXmlText(row);
    return text && !text.includes('I.B') && !text.includes('DO(S) COMPRADOR');
  });
  const bodyText = decodeXmlEntities(getXmlText(bodyRow));
  if (!bodyText) return '';

  const cnpjMatch = bodyText.match(/CNPJ(?:\/MF)?\s*(?:n[ºo]\.?\s*)?([\d./-]{14,18})/i);
  const cnpj = cnpjMatch ? cnpjMatch[1] : '';
  const nome = bodyText
    .split(/\s*,\s*pessoa|\s+inscrita\s+no\s+CNPJ|\s+CNPJ(?:\/MF)?/i)[0]
    .trim();

  return [
    nome,
    cnpj ? `CNPJ n\u00ba ${cnpj}` : '',
    ...extractRepresentanteLegalIncorporadora(bodyText)
  ].filter(Boolean).join('\n');
}

function applyLegacyBracketAliases(zip) {
  zip.file(/word\/.*\.xml$/).forEach((entry) => {
    let xml = entry.asText();
    Object.entries(LEGACY_BRACKET_ALIASES).forEach(([legacy, modern]) => {
      xml = replaceAll(xml, legacy, modern);
    });
    xml = xml.replace(/\[[^\]]{1,140}\]/g, (legacy) => (
      LEGACY_BRACKET_ALIAS_BY_NORMALIZED.get(normalizeLegacyAlias(legacy)) || legacy
    ));
    zip.file(entry.name, xml);
  });
}

function applyContratoHeaderAutomation(zip, dados = {}) {
  const numeroContrato = safeString(dados?.contrato?.numero_identificador || dados?.contrato?.numero).trim();
  if (!numeroContrato) return;

  zip.file(/word\/.*\.xml$/).forEach((entry) => {
    let xml = entry.asText();
    xml = xml.replace(
      /(<w:t(?:\s[^>]*)? xml:space="preserve">CONTRATO Nº:\s*<\/w:t><\/w:r>)(?:<w:r[\s\S]*?<\/w:r>){1,6}(?=<\/w:p>)/g,
      `$1${buildRunXml(numeroContrato, { bold: true, font: 'Verdana', size: '20' })}`
    );
    zip.file(entry.name, xml);
  });
}

function buildObjetoQuadroResumoCells(dados = {}) {
  return [
    [
      { text: 'Torre:', bold: true },
      { text: ` ${safeString(dados?.unidade?.torre || dados?.empreendimento?.nome || '-')}` }
    ],
    [
      { text: 'Unidade Autônoma:', bold: true },
      { text: ` ${safeString(dados?.unidade?.nome || dados?.unidade?.codigo || '-')}` }
    ],
    [
      { text: 'Área privativa da unidade:', bold: true },
      { text: ` ${safeString(dados?.unidade?.metragem_privativa_formatada || dados?.unidade?.metragem_privativa || '-')}` }
    ],
    [
      { text: 'Fração Ideal:', bold: true },
      { text: ` ${safeString(dados?.unidade?.fracao_ideal || '-')}` }
    ],
    [
      { text: 'Vagas de Garagem:', bold: true },
      { text: ` ${safeString(dados?.unidade?.vagas_garagem || dados?.contrato?.vagas_garagem_resumo || '-')}` }
    ]
  ];
}

function buildQuadroResumoPagamentoRows(sampleRow, dados = {}) {
  const itens = Array.isArray(dados?.parcelas?.quadro_resumo_itens)
    ? dados.parcelas.quadro_resumo_itens
    : [];

  if (!itens.length) {
    return [
      buildTableRowXml(sampleRow, [
        '01',
        'A DEFINIR',
        '00',
        'F',
        '-',
        formatCurrency(dados?.contrato?.valor_total || 0),
        '-'
      ], { align: 'center' })
    ];
  }

  return itens.map((item) => buildTableRowXml(sampleRow, [
    item.item,
    item.elemento,
    item.quantidade,
    item.reajuste_codigo,
    item.primeiro_vencimento || '-',
    item.total_formatado || formatCurrency(item.total || 0),
    item.ultimo_vencimento || '-'
  ], { align: 'center' }));
}

function buildAssinaturasQuadroResumo(dados = {}) {
  const linhas = [];
  const assinaturaLinha = '__________________________________________________________________';
  const addAssinatura = (titulo, partes = []) => {
    const conteudo = partes
      .flatMap((parte) => safeString(parte).split(/\r?\n/))
      .map((parte) => parte.trim())
      .filter(Boolean);
    if (!conteudo.length) return;
    if (linhas.length) linhas.push('');
    linhas.push(assinaturaLinha);
    linhas.push(...conteudo);
    if (titulo) linhas.push(titulo);
  };

  addAssinatura('INCORPORADORA', [
    dados?.assinaturas?.vendedora_dados || dados?.assinaturas?.vendedora || dados?.empreendimento?.nome || 'INCORPORADORA'
  ]);
  addAssinatura('COMPRADOR(A)', [
    dados?.cliente?.nome,
    dados?.cliente?.cpf_cnpj ? `CPF/CNPJ: ${dados.cliente.cpf_cnpj}` : ''
  ]);
  addAssinatura('CONJUGE', [
    dados?.conjuge?.nome,
    dados?.conjuge?.cpf_cnpj ? `CPF/CNPJ: ${dados.conjuge.cpf_cnpj}` : ''
  ]);
  addAssinatura('TESTEMUNHA 1', [
    dados?.testemunha_1?.nome,
    dados?.testemunha_1?.cpf ? formatCpfAssinatura(dados.testemunha_1.cpf) : ''
  ]);
  addAssinatura('TESTEMUNHA 2', [
    dados?.testemunha_2?.nome,
    dados?.testemunha_2?.cpf ? formatCpfAssinatura(dados.testemunha_2.cpf) : ''
  ]);

  return linhas.length ? linhas : [assinaturaLinha, 'Assinaturas'];
}

function replaceRowsInTable(tableXml, replacer) {
  const rows = extractTableRows(tableXml);
  if (!rows.length) return tableXml;
  const firstRowIndex = tableXml.indexOf(rows[0]);
  const lastRow = rows[rows.length - 1];
  const lastRowEnd = tableXml.lastIndexOf(lastRow) + lastRow.length;
  const nextRows = replacer(rows);
  return `${tableXml.slice(0, firstRowIndex)}${nextRows.join('')}${tableXml.slice(lastRowEnd)}`;
}

function applyQuadroResumoAutomation(zip, dados = {}) {
  zip.file(/word\/document\.xml$/).forEach((entry) => {
    let xml = entry.asText();

    xml = xml.replace(/<w:tbl[\s\S]*?<\/w:tbl>/g, (tableXml) => {
      if (!/QUADRO RESUMO|DO PRECO E DA FORMA DE PAGAMENTO|DO PREÇO E DA FORMA DE PAGAMENTO/i.test(getXmlText(tableXml))) {
        return tableXml;
      }

      tableXml = replaceKnownEmpreendimentoTitle(tableXml, dados);

      return replaceRowsInTable(tableXml, (rows) => {
        const nextRows = [...rows];
        const incorporadoraAssinatura = extractIncorporadoraAssinaturaFromRows(nextRows);
        const quadroResumoIndex = nextRows.findIndex((row) => normalizeXmlText(row).includes('QUADRO RESUMO'));
        if (quadroResumoIndex > 0) {
          nextRows[quadroResumoIndex - 1] = replaceKnownEmpreendimentoTitle(nextRows[quadroResumoIndex - 1], dados);
        }

        const objetoIndex = nextRows.findIndex((row) => {
          const text = normalizeXmlText(row);
          return text.includes('TORRE:') && text.includes('UNIDADE AUTONOMA') && text.includes('VAGAS');
        });
        if (objetoIndex >= 0) {
          nextRows[objetoIndex] = buildTableRowXml(
            nextRows[objetoIndex],
            buildObjetoQuadroResumoCells(dados),
            { align: 'center' }
          );
        }

        const pagamentoHeaderIndex = nextRows.findIndex((row) => {
          const text = normalizeXmlText(row);
          return text.includes('ITEM') && text.includes('ELEMENTO') && text.includes('VENCIMENTO') && text.includes('TOTAL');
        });
        if (pagamentoHeaderIndex >= 0) {
          const fimLinhasFixasIndex = nextRows.findIndex((row, index) => (
            index > pagamentoHeaderIndex
              && (normalizeXmlText(row).includes('INCIDENCIA DE JUROS') || normalizeXmlText(row).includes('PRECO TOTAL DA UNIDADE'))
          ));
          const sampleRow = nextRows[pagamentoHeaderIndex + 1] || nextRows[pagamentoHeaderIndex];
          const linhasPagamento = buildQuadroResumoPagamentoRows(sampleRow, dados);
          if (fimLinhasFixasIndex > pagamentoHeaderIndex) {
            nextRows.splice(
              pagamentoHeaderIndex + 1,
              fimLinhasFixasIndex - pagamentoHeaderIndex - 1,
              ...linhasPagamento
            );
          }
        }

        const precoIndex = nextRows.findIndex((row) => normalizeXmlText(row).includes('PRECO TOTAL DA UNIDADE'));
        if (precoIndex >= 0) {
          nextRows[precoIndex] = buildSingleCellRowXml(nextRows[precoIndex], [
            '*Incidência de juros e correção monetária conforme itens "VI.c"; "VI.d" e "VI.e".',
            `VI.a) PREÇO TOTAL DA UNIDADE: ${dados?.contrato?.valor_total_com_extenso || dados?.contrato?.valor_total_formatado || formatCurrency(0)}.`
          ]);
        }

        const leilaoIndex = nextRows.findIndex((row) => normalizeXmlText(row).includes('VALOR DO IMOVEL PARA FINS DE PUBLICO LEILAO'));
        if (leilaoIndex >= 0) {
          nextRows[leilaoIndex] = buildSingleCellRowXml(nextRows[leilaoIndex], [
            `VALOR DO IMÓVEL PARA FINS DE PÚBLICO LEILÃO: ${dados?.contrato?.valor_total_com_extenso || dados?.contrato?.valor_total_formatado || formatCurrency(0)}. O valor constante deste campo está posicionado na data de assinatura do presente Contrato, devendo ser atualizado pelo índice contratualmente previsto, para se obter o valor correspondente em qualquer outra data.`
          ]);
        }

        const dataLocalIndex = nextRows.findIndex((row) => {
          const text = normalizeXmlText(row);
          return text.includes('XX DE XXX') || text.includes('XX DE XXXX') || text.includes('ANCHIETA -ES, XX');
        });
        if (dataLocalIndex >= 0) {
          nextRows[dataLocalIndex] = buildSingleCellRowXml(nextRows[dataLocalIndex], [
            dados?.contrato?.local_data_assinatura || dados?.contrato?.data_assinatura_extenso || ''
          ], { align: 'center' });
        }

        const assinaturasIndex = nextRows.findIndex((row) => normalizeXmlText(row).includes('XII- ASSINATURAS'));
        if (assinaturasIndex >= 0 && nextRows[assinaturasIndex + 1]) {
          const dadosAssinaturas = {
            ...dados,
            assinaturas: {
              ...(dados.assinaturas || {}),
              vendedora_dados: dados?.assinaturas?.vendedora_dados || incorporadoraAssinatura
            }
          };
          nextRows[assinaturasIndex + 1] = buildSingleCellRowXml(
            nextRows[assinaturasIndex + 1],
            buildAssinaturasQuadroResumo(dadosAssinaturas),
            { align: 'center' }
          );
        }

        return nextRows;
      });
    });

    zip.file(entry.name, xml);
  });
}

function isLocalDataContratoParagraph(text) {
  const normalized = safeString(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  return /XX DE X{3,}/.test(normalized)
    && (
      normalized.includes('ANCHIETA')
      || normalized.includes('GUACUI')
      || normalized.includes('IRIRI')
      || normalized.includes(' ES')
      || normalized.includes('-ES')
    );
}

function applyContratoAssinaturasAutomation(zip, dados = {}) {
  const testemunha1 = dados?.testemunha_1 || {};
  const testemunha2 = dados?.testemunha_2 || {};
  const localDataAssinatura = safeString(dados?.contrato?.local_data_assinatura).trim();

  zip.file(/word\/document\.xml$/).forEach((entry) => {
    let xml = entry.asText();

    xml = xml.replace(/<w:p[\s\S]*?<\/w:p>/g, (paragraphXml) => {
      const text = decodeXmlEntities(getXmlText(paragraphXml));
      const normalized = text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();

      if (localDataAssinatura && isLocalDataContratoParagraph(text)) {
        return buildParagraphLines([localDataAssinatura], { align: 'center' });
      }

      if (testemunha1.nome && normalized.includes('DALVINA DE OLIVEIRA LIMA')) {
        return buildParagraphLines([testemunha1.nome], { align: 'center' });
      }

      if (testemunha1.cpf && normalized.includes('123.100.157')) {
        return buildParagraphLines([formatCpfAssinatura(testemunha1.cpf)], { align: 'center' });
      }

      if (testemunha2.nome && normalized.includes('OTAVIO TEIXEIRA DE AZEVEDO')) {
        return buildParagraphLines([testemunha2.nome], { align: 'center' });
      }

      if (testemunha2.cpf && normalized.includes('178.544.147')) {
        return buildParagraphLines([formatCpfAssinatura(testemunha2.cpf), 'TESTEMUNHA'], { align: 'center' });
      }

      return paragraphXml;
    });

    zip.file(entry.name, xml);
  });
}

function applyComercialDocumentAutomation(zip, dados = {}) {
  applyContratoHeaderAutomation(zip, dados);
  applyQuadroResumoAutomation(zip, dados);
  applyContratoAssinaturasAutomation(zip, dados);
}

function buildParcelasResumo(parcelas = []) {
  if (!Array.isArray(parcelas) || !parcelas.length) return '';

  return parcelas
    .map((parcela) => {
      const partes = [
        parcela.descricao || `Parcela ${parcela.sequencia || ''}`.trim(),
        parcela.data_vencimento ? `venc. ${formatDateBr(parcela.data_vencimento)}` : '',
        formatCurrency(parcela.valor_original || parcela.valor || 0)
      ].filter(Boolean);
      return partes.join(' - ');
    })
    .join('\n');
}

function getParcelaElemento(parcela = {}) {
  const tipo = String(parcela.tipo_parcela || '').trim().toUpperCase();
  if (tipo === 'ENTRADA') return 'SINAL';
  if (tipo === 'PARCELA') return 'PARCELAS';
  if (tipo === 'INTERMEDIARIA') return 'INTERMEDIARIAS';
  if (tipo === 'CHAVES') return 'CHAVES';
  if (tipo === 'BALAO') return 'BALOES';
  return String(parcela.descricao || 'OUTRAS').trim().toUpperCase() || 'OUTRAS';
}

function buildQuadroResumoParcelas(parcelas = []) {
  if (!Array.isArray(parcelas) || !parcelas.length) {
    return {
      itens: [],
      texto: ''
    };
  }

  const grupos = new Map();
  parcelas.forEach((parcela) => {
    const elemento = getParcelaElemento(parcela);
    const reajusteTipo = String(parcela.reajuste_tipo || 'FIXA').trim().toUpperCase() === 'REAJUSTAVEL' ? 'R' : 'F';
    const key = `${elemento}-${reajusteTipo}`;
    if (!grupos.has(key)) {
      grupos.set(key, {
        elemento,
        reajuste_codigo: reajusteTipo,
        parcelas: []
      });
    }
    grupos.get(key).parcelas.push(parcela);
  });

  const itens = Array.from(grupos.values()).map((grupo, index) => {
    const parcelasGrupo = grupo.parcelas
      .slice()
      .sort((a, b) => String(a.data_vencimento || '').localeCompare(String(b.data_vencimento || '')));
    const total = parcelasGrupo.reduce((acc, item) => acc + Number(item.valor_original || item.valor || 0), 0);
    const primeiroVencimento = parcelasGrupo[0]?.data_vencimento;
    const ultimoVencimento = parcelasGrupo[parcelasGrupo.length - 1]?.data_vencimento;

    return {
      item: String(index + 1).padStart(2, '0'),
      elemento: grupo.elemento,
      quantidade: String(parcelasGrupo.length).padStart(2, '0'),
      reajuste_codigo: grupo.reajuste_codigo,
      primeiro_vencimento: formatDateBr(primeiroVencimento),
      total: safeString(total.toFixed(2)),
      total_formatado: formatCurrency(total),
      ultimo_vencimento: formatDateBr(ultimoVencimento)
    };
  });

  return {
    itens,
    texto: itens
      .map((item) =>
        `${item.item} ${item.elemento} ${item.quantidade} ${item.reajuste_codigo} ${item.primeiro_vencimento} ${item.total_formatado} ${item.ultimo_vencimento}`
      )
      .join('\n')
  };
}

function buildVagasGaragemResumo(contrato = {}) {
  if (!contrato.possui_vaga_garagem) return 'Não possui';
  const quantidade = Number(contrato.quantidade_vagas_garagem || 0);
  const quantidadeTexto = quantidade > 0 ? String(quantidade).padStart(2, '0') : '';
  const posicao = safeString(contrato.vagas_garagem_posicao).trim();
  return [quantidadeTexto, posicao ? `Posição: ${posicao}` : 'Sem posição específica'].filter(Boolean).join(' - ');
}

function buildAssinaturaPessoa(nome, documento) {
  const partes = [
    safeString(nome).trim(),
    safeString(documento).trim() ? `CPF/CNPJ: ${safeString(documento).trim()}` : ''
  ].filter(Boolean);
  return partes.join(' - ');
}

function buildNumeroContrato(raw = {}, empreendimento = {}, unidade = {}) {
  const numeroSalvo = safeString(raw.numero).trim();
  if (numeroSalvo) return numeroSalvo;

  return [
    safeString(empreendimento.codigo).trim(),
    safeString(unidade.torre || unidade.bloco).trim(),
    safeString(unidade.codigo).trim()
  ].filter(Boolean).join(' - ');
}

function buildItemIIITexto(contrato = {}, empreendimento = {}, unidade = {}) {
  return [
    `Torre: ${safeString(unidade.torre || empreendimento.nome || '-')}`,
    `Unidade Autônoma: ${safeString(unidade.nome || unidade.codigo || '-')}`,
    `Área privativa da unidade: ${formatArea(unidade.metragem_privativa) || safeString(unidade.metragem_privativa) || '-'}`,
    `Fração Ideal: ${formatFracaoIdeal(unidade.fracao_ideal) || '-'}`,
    `Vagas de Garagem: ${buildVagasGaragemResumo(contrato)}`
  ].join('\n');
}

function buildDadosContrato(contrato, customVariables = {}) {
  const raw = contrato?.toJSON ? contrato.toJSON() : contrato;
  const cliente = raw.cliente || {};
  const conjuge = cliente.conjuge || {};
  const unidade = raw.unidadeComercial || {};
  const corretor = raw.corretorParceiro || {};
  const empreendimento = raw.empreendimento || {};
  const obra = raw.obra || {};
  const quadroResumoParcelas = buildQuadroResumoParcelas(raw.parcelas || []);
  const vagasGaragemResumo = buildVagasGaragemResumo(raw);
  const dataAssinaturaBase = raw.data_assinatura || raw.data_contrato;
  const localAssinatura = safeString(raw.local_assinatura);
  const numeroContrato = buildNumeroContrato(raw, empreendimento, unidade);
  const valorTotalFormatado = formatCurrency(raw.valor_total);
  const valorTotalExtenso = formatCurrencyExtenso(raw.valor_total);
  const valorTotalComExtenso = `${valorTotalFormatado} (${valorTotalExtenso})`;
  const itemIIITexto = buildItemIIITexto(raw, empreendimento, unidade);
  const corretorNome = safeString(corretor.nome || raw.corretor_nome);
  const corretorCpfCnpj = safeString(corretor.cpf_cnpj);
  const corretorCreci = safeString(corretor.creci);
  const corretorCpfCnpjFormatado = formatDocumentoRotulado(corretorCpfCnpj);
  const corretorCreciFormatado = formatCreciRotulado(corretorCreci);
  const corretorDadosIdentificacao = [
    corretorNome,
    corretorCpfCnpjFormatado,
    corretorCreciFormatado
  ].filter(Boolean).join(', ');

  const dados = {
    contrato: {
      id: raw.id,
      numero: numeroContrato,
      numero_identificador: numeroContrato,
      data: formatDateBr(raw.data_contrato),
      data_iso: safeString(raw.data_contrato),
      status: safeString(raw.status),
      valor_total: safeString(raw.valor_total),
      valor_total_formatado: valorTotalFormatado,
      valor_total_extenso: valorTotalExtenso,
      valor_total_com_extenso: valorTotalComExtenso,
      valor_entrada: safeString(raw.valor_entrada),
      valor_entrada_formatado: formatCurrency(raw.valor_entrada),
      desconto: safeString(raw.desconto_concedido),
      desconto_formatado: formatCurrency(raw.desconto_concedido),
      indice_reajuste: safeString(raw.indice_reajuste),
      possui_vaga_garagem: raw.possui_vaga_garagem ? 'Sim' : 'Nao',
      quantidade_vagas_garagem: raw.possui_vaga_garagem ? safeString(raw.quantidade_vagas_garagem) : '',
      vagas_garagem_posicao: raw.possui_vaga_garagem ? safeString(raw.vagas_garagem_posicao) : '',
      vagas_garagem_resumo: vagasGaragemResumo,
      local_assinatura: localAssinatura,
      data_assinatura: formatDateBr(dataAssinaturaBase),
      data_assinatura_extenso: formatDateLongBr(dataAssinaturaBase),
      data_assinatura_iso: safeString(dataAssinaturaBase),
      local_data_assinatura: formatLocalDataAssinatura(localAssinatura, dataAssinaturaBase),
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
      rg: safeString(cliente.rg),
      data_nascimento: formatDateBr(cliente.data_nascimento),
      data_nascimento_iso: safeString(cliente.data_nascimento),
      nacionalidade: safeString(cliente.nacionalidade),
      profissao: safeString(cliente.profissao),
      estado_civil: safeString(cliente.estado_civil),
      complemento: safeString(cliente.complemento),
      conjuge_nome: safeString(cliente.conjuge_nome),
      regime_bens: safeString(cliente.regime_bens)
    },
    conjuge: {
      nome: safeString(conjuge.nome || cliente.conjuge_nome),
      cpf_cnpj: safeString(conjuge.cpf_cnpj),
      telefone: safeString(conjuge.telefone),
      email: safeString(conjuge.email),
      endereco: safeString(conjuge.endereco),
      numero: safeString(conjuge.numero),
      bairro: safeString(conjuge.bairro),
      cep: safeString(conjuge.cep),
      municipio: safeString(conjuge.municipio),
      estado: safeString(conjuge.estado),
      cidade_uf: [conjuge.municipio, conjuge.estado].filter(Boolean).join('-'),
      data_nascimento: formatDateBr(conjuge.data_nascimento),
      data_nascimento_iso: safeString(conjuge.data_nascimento),
      nacionalidade: safeString(conjuge.nacionalidade),
      profissao: safeString(conjuge.profissao),
      estado_civil: safeString(conjuge.estado_civil),
      complemento: safeString(conjuge.complemento)
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
      metragem_privativa_formatada: formatArea(unidade.metragem_privativa),
      fracao_ideal: formatFracaoIdeal(unidade.fracao_ideal) || safeString(unidade.fracao_ideal),
      vagas_garagem: vagasGaragemResumo,
      valor_tabela: safeString(unidade.valor_tabela),
      valor_tabela_formatado: formatCurrency(unidade.valor_tabela),
      valor_base_venda: safeString(unidade.valor_base_venda),
      valor_base_venda_formatado: formatCurrency(unidade.valor_base_venda)
    },
    corretor: {
      nome: corretorNome,
      cpf_cnpj: corretorCpfCnpj,
      cpf_cnpj_formatado: corretorCpfCnpjFormatado,
      telefone: safeString(corretor.telefone),
      email: safeString(corretor.email),
      creci: corretorCreci,
      creci_formatado: corretorCreciFormatado,
      dados_identificacao: corretorDadosIdentificacao,
      percentual_comissao: raw.comissao_percentual ? `${safeString(raw.comissao_percentual)}%` : ''
    },
    testemunha_1: {
      nome: safeString(raw.testemunha_1_nome),
      cpf: safeString(raw.testemunha_1_cpf)
    },
    testemunha_2: {
      nome: safeString(raw.testemunha_2_nome),
      cpf: safeString(raw.testemunha_2_cpf)
    },
    obra: {
      nome: safeString(obra.nome),
      codigo: safeString(obra.codigo)
    },
    parcelas: {
      resumo: buildParcelasResumo(raw.parcelas || []),
      quadro_resumo_texto: quadroResumoParcelas.texto,
      quadro_resumo_itens: quadroResumoParcelas.itens,
      itens: (raw.parcelas || []).map((parcela) => ({
        sequencia: safeString(parcela.sequencia),
        descricao: safeString(parcela.descricao),
        tipo_parcela: safeString(parcela.tipo_parcela),
        forma_recebimento_prevista: safeString(parcela.forma_recebimento_prevista),
        reajuste_tipo: safeString(parcela.reajuste_tipo || 'FIXA'),
        reajuste_codigo: String(parcela.reajuste_tipo || 'FIXA').toUpperCase() === 'REAJUSTAVEL' ? 'R' : 'F',
        data_vencimento: formatDateBr(parcela.data_vencimento),
        valor: safeString(parcela.valor_original || parcela.valor),
        valor_formatado: formatCurrency(parcela.valor_original || parcela.valor || 0),
        observacoes: safeString(parcela.observacoes)
      }))
    },
    assinaturas: {
      comprador: buildAssinaturaPessoa(cliente.nome, cliente.cpf_cnpj),
      conjuge: buildAssinaturaPessoa(conjuge.nome || cliente.conjuge_nome, conjuge.cpf_cnpj),
      corretor: corretorDadosIdentificacao,
      vendedora: safeString(empreendimento.nome),
      testemunha_1: buildAssinaturaPessoa(raw.testemunha_1_nome, raw.testemunha_1_cpf),
      testemunha_2: buildAssinaturaPessoa(raw.testemunha_2_nome, raw.testemunha_2_cpf)
    },
    quadro_resumo: {
      item_iii_texto: itemIIITexto,
      preco_total_unidade: valorTotalComExtenso,
      valor_leilao: valorTotalComExtenso,
      assinaturas_texto: buildAssinaturasQuadroResumo({
        empreendimento: { nome: safeString(empreendimento.nome) },
        assinaturas: { vendedora: safeString(empreendimento.nome) },
        cliente,
        conjuge,
        testemunha_1: { nome: raw.testemunha_1_nome, cpf: raw.testemunha_1_cpf },
        testemunha_2: { nome: raw.testemunha_2_nome, cpf: raw.testemunha_2_cpf }
      }).join('\n')
    },
    custom: customVariables || {}
  };

  return deepMerge(dados, customVariables);
}

function assertDadosObrigatoriosDocumentoContrato(dados = {}) {
  const faltando = [];

  if (!safeString(dados?.contrato?.local_assinatura).trim()) faltando.push('local de assinatura');
  if (!safeString(dados?.contrato?.data_assinatura_iso).trim()) faltando.push('data de assinatura');
  if (!safeString(dados?.testemunha_1?.nome).trim()) faltando.push('nome da testemunha 1');
  if (!safeString(dados?.testemunha_1?.cpf).trim()) faltando.push('CPF da testemunha 1');
  if (!safeString(dados?.testemunha_2?.nome).trim()) faltando.push('nome da testemunha 2');
  if (!safeString(dados?.testemunha_2?.cpf).trim()) faltando.push('CPF da testemunha 2');

  if (faltando.length) {
    throw createHttpError(
      400,
      `Antes de gerar o contrato completo, preencha ${faltando.join(', ')} no cadastro do contrato.`
    );
  }
}

async function carregarContratoParaDocumento(id) {
  const contrato = await ContratoComercial.findByPk(id, {
    include: [
      { model: Empreendimento, as: 'empreendimento' },
      { model: UnidadeComercial, as: 'unidadeComercial' },
      { model: Parceiro, as: 'cliente', include: [{ model: Parceiro, as: 'conjuge' }] },
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
  applyComercialDocumentAutomation(zip, data);

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

async function mergePdfBuffers(pdfBuffers = []) {
  const merged = await PDFDocument.create();

  for (const pdfBuffer of pdfBuffers.filter(Boolean)) {
    const source = await PDFDocument.load(pdfBuffer);
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
  }

  return Buffer.from(await merged.save());
}

async function getPdfPageCount(pdfBuffer) {
  if (!pdfBuffer) return 0;
  const pdf = await PDFDocument.load(pdfBuffer);
  return pdf.getPageCount();
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

    if (normalizeTipoDocumento(modelo.tipo_documento) === 'QUADRO_RESUMO') {
      throw createHttpError(400, 'O Quadro Resumo agora e gerado junto ao Contrato Padrao. Selecione um modelo de Contrato Padrao.');
    }

    return modelo;
  }

  const tipoDocumento = 'CONTRATO';
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

async function resolveModeloQuadroResumoParaContrato(contrato, modeloContrato) {
  const modelo = await ContratoComercialModelo.findOne({
    where: {
      empreendimento_id: contrato.empreendimento_id,
      tipo_documento: 'QUADRO_RESUMO',
      ativo: true
    },
    order: [['updatedAt', 'DESC'], ['id', 'DESC']]
  });

  if (!modelo) {
    throw createHttpError(
      404,
      `Cadastre um modelo ativo de Quadro Resumo para gerar o PDF completo do contrato ${modeloContrato?.nome ? `(${modeloContrato.nome})` : ''}.`
    );
  }

  return modelo;
}

async function renderModeloDocumento(modelo, dados, baseName) {
  const templateBuffer = await readStoredFileBuffer(modelo.arquivo_url);
  const docxBuffer = renderDocx(templateBuffer, dados);
  const pdfBuffer = await convertDocxToPdf(docxBuffer, baseName);
  return { docxBuffer, pdfBuffer };
}

async function gerarDocumentoContratoComercial(req, contratoId, payload = {}) {
  const contrato = await carregarContratoParaDocumento(contratoId);
  const documentoAssinado = await ContratoComercialDocumento.findOne({
    where: {
      contrato_comercial_id: contrato.id,
      tipo_documento: 'CONTRATO',
      status: 'ASSINADO'
    }
  });

  if (documentoAssinado) {
    throw createHttpError(400, 'Este contrato ja possui documento assinado digitalmente e nao pode ser gerado novamente.');
  }

  const modelo = await resolveModeloParaContrato(contrato, payload);
  const customVariables = deepMerge(
    parseJson(modelo.variaveis_json, {}),
    parseJson(payload.variaveis, {})
  );
  const dados = buildDadosContrato(contrato, customVariables);
  const tipoDocumento = normalizeTipoDocumento(modelo.tipo_documento);
  if (tipoDocumento === 'CONTRATO') {
    assertDadosObrigatoriosDocumentoContrato(dados);
  }
  const numeroContrato = sanitizeFileNameForStorage(contrato.numero || `contrato-${contrato.id}`);
  const baseName = `${tipoDocumento.toLowerCase()}-${numeroContrato || contrato.id}`;
  const renderContrato = await renderModeloDocumento(modelo, dados, baseName);
  let docxBuffer = renderContrato.docxBuffer;
  let pdfBuffer = renderContrato.pdfBuffer;
  let modeloDocumentoId = modelo.id;
  let nomeDocumento = String(payload.nome || modelo.nome || `${baseName}.pdf`).trim();

  if (tipoDocumento === 'CONTRATO') {
    const modeloQuadroResumo = await resolveModeloQuadroResumoParaContrato(contrato, modelo);
    const customQuadroResumo = deepMerge(
      parseJson(modeloQuadroResumo.variaveis_json, {}),
      parseJson(payload.variaveis, {})
    );
    const dadosQuadroResumo = buildDadosContrato(contrato, customQuadroResumo);
    const renderQuadroResumo = await renderModeloDocumento(
      modeloQuadroResumo,
      dadosQuadroResumo,
      `quadro-resumo-${numeroContrato || contrato.id}`
    );

    const quadroResumoPages = await getPdfPageCount(renderQuadroResumo.pdfBuffer);
    const contratoPages = await getPdfPageCount(renderContrato.pdfBuffer);

    if (quadroResumoPages < 1) {
      throw createHttpError(500, 'O Quadro Resumo foi convertido sem paginas. Revise o modelo DOCX antes de gerar o contrato completo.');
    }

    if (contratoPages < 1) {
      throw createHttpError(500, 'O Contrato Padrao foi convertido sem paginas. Revise o modelo DOCX antes de gerar o contrato completo.');
    }

    pdfBuffer = await mergePdfBuffers([renderQuadroResumo.pdfBuffer, renderContrato.pdfBuffer]);
    const pdfCompletoPages = await getPdfPageCount(pdfBuffer);

    if (pdfCompletoPages < quadroResumoPages + contratoPages) {
      throw createHttpError(500, 'Nao foi possivel juntar Quadro Resumo e Contrato Padrao no PDF final.');
    }

    console.info(
      `[comercial-contratos] PDF completo gerado contrato=${contrato.id} modelo_contrato=${modelo.id} modelo_quadro_resumo=${modeloQuadroResumo.id} paginas=${pdfCompletoPages}`
    );

    modeloDocumentoId = modelo.id;
    nomeDocumento = String(payload.nome || `Contrato completo - ${modelo.nome || 'Contrato Padrao'}`).trim();
    docxBuffer = renderContrato.docxBuffer;
  }

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
    modelo_id: modeloDocumentoId,
    tipo_documento: tipoDocumento,
    nome: nomeDocumento,
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

async function excluirDocumentoContratoComercial(req, documentoId) {
  if (!isSuperadminUser(req.user)) {
    throw createHttpError(403, 'Apenas SUPERADMIN pode excluir documentos gerados de contratos.');
  }

  const documento = await ContratoComercialDocumento.findByPk(documentoId);
  if (!documento) {
    throw createHttpError(404, 'Documento nao encontrado.');
  }

  if (documentoEstaAssinado(documento)) {
    throw createHttpError(400, 'Nao e possivel excluir documento assinado digitalmente.');
  }

  const contratoId = documento.contrato_comercial_id;
  const metadata = {
    contrato_comercial_id: contratoId,
    tipo_documento: documento.tipo_documento,
    nome: documento.nome,
    status: documento.status,
    d4sign_status: documento.d4sign_status
  };

  await documento.destroy();

  await registrarEventoSeguranca({
    req,
    usuarioId: req.user?.id || null,
    tipoEvento: 'COMMERCIAL_CONTRACT_DOCUMENT_DELETED',
    recursoTipo: 'CONTRATO_COMERCIAL_DOCUMENTO',
    recursoId: Number(documentoId),
    status: 'SUCCESS',
    descricao: 'Documento gerado de contrato comercial excluido por SUPERADMIN antes da assinatura digital',
    metadata
  });

  return { ok: true, contrato_comercial_id: contratoId };
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
        include: [{ model: Parceiro, as: 'cliente', include: [{ model: Parceiro, as: 'conjuge' }] }]
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
  excluirDocumentoContratoComercial,
  gerarDocumentoContratoComercial,
  listarDocumentosContratoComercial,
  listarModelosContratoComercial,
  obterLinkDocumentoContratoComercial,
  processarWebhookD4Sign
};
