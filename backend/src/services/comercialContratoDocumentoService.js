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
  { chave: 'unidade.fracao_ideal', descricao: 'Fracao ideal da unidade' },
  { chave: 'unidade.vagas_garagem', descricao: 'Resumo das vagas de garagem da unidade vendida' },
  { chave: 'corretor.nome', descricao: 'Nome do corretor' },
  { chave: 'corretor.cpf_cnpj', descricao: 'CPF/CNPJ do corretor' },
  { chave: 'corretor.creci', descricao: 'CRECI do corretor' },
  { chave: 'corretor.percentual_comissao', descricao: 'Percentual de comissao do corretor' },
  { chave: 'parcelas.resumo', descricao: 'Resumo das parcelas do contrato' },
  { chave: 'parcelas.quadro_resumo_texto', descricao: 'Linhas agrupadas para o item VI do quadro resumo' },
  { chave: 'parcelas.quadro_resumo_itens', descricao: 'Lista de parcelas agrupadas para tabelas do quadro resumo' },
  { chave: 'assinaturas.comprador', descricao: 'Linha de identificacao do comprador para assinatura' },
  { chave: 'assinaturas.conjuge', descricao: 'Linha de identificacao do conjuge para assinatura' },
  { chave: 'assinaturas.corretor', descricao: 'Linha de identificacao do corretor para assinatura' },
  { chave: 'assinaturas.vendedora', descricao: 'Linha de identificacao da vendedora/empreendimento para assinatura' },
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
  '[Nº do CPF do Corretor]': '{{corretor.cpf_cnpj}}',
  '[Nº do CRECI do Corretor]': '{{corretor.creci}}',
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
    xml = xml.replace(/\[[^\]]{1,140}\]/g, (legacy) => (
      LEGACY_BRACKET_ALIAS_BY_NORMALIZED.get(normalizeLegacyAlias(legacy)) || legacy
    ));
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
  if (!contrato.possui_vaga_garagem) return 'Nao possui';
  const quantidade = Number(contrato.quantidade_vagas_garagem || 0);
  const quantidadeTexto = quantidade > 0 ? String(quantidade).padStart(2, '0') : '';
  const posicao = safeString(contrato.vagas_garagem_posicao).trim();
  return [quantidadeTexto, posicao ? `Posicao: ${posicao}` : 'Sem posicao especifica'].filter(Boolean).join(' - ');
}

function buildAssinaturaPessoa(nome, documento) {
  const partes = [
    safeString(nome).trim(),
    safeString(documento).trim() ? `CPF/CNPJ: ${safeString(documento).trim()}` : ''
  ].filter(Boolean);
  return partes.join(' - ');
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
      fracao_ideal: safeString(unidade.fracao_ideal),
      vagas_garagem: vagasGaragemResumo,
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
      creci: safeString(corretor.creci),
      percentual_comissao: raw.comissao_percentual ? `${safeString(raw.comissao_percentual)}%` : ''
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
      corretor: buildAssinaturaPessoa(corretor.nome || raw.corretor_nome, corretor.cpf_cnpj),
      vendedora: safeString(empreendimento.nome)
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
  gerarDocumentoContratoComercial,
  listarDocumentosContratoComercial,
  listarModelosContratoComercial,
  obterLinkDocumentoContratoComercial,
  processarWebhookD4Sign
};
