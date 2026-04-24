const {
  CategoriaFinanceira,
  IntegracaoSiengeConfig,
  IntegracaoSiengeFila,
  IntegracaoSiengeLog,
  IntegracaoSiengeMapeamento,
  Obra,
  Parceiro,
  RhFechamentoTitulo,
  TituloFinanceiro,
  User
} = require('../models');
const { ValidationError } = require('../middlewares/validation');
const { env } = require('../config/env');

const ORIGENS_MODULO = ['FINANCEIRO', 'RH_DP', 'COMERCIAL', 'SOLICITACOES', 'COMPRAS', 'OUTROS'];
const ENTIDADE_MAPEAMENTO_TITULO = 'TITULO_FINANCEIRO';
const ENTIDADE_MAPEAMENTO_PARCEIRO = 'PARCEIRO';

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function buildConfigPadrao() {
  return {
    id: null,
    ativo: false,
    base_url_override: null,
    endpoint_titulos: null,
    documento_padrao_id: null,
    indexador_padrao_id: null,
    auto_vincular_credor_busca_exata: false,
    auto_cadastrar_credor_quando_ausente: false,
    timeout_ms: env.siengeRequestTimeoutMs,
    max_tentativas: 3,
    payload_defaults_json: null,
    observacoes: null,
    createdAt: null,
    updatedAt: null,
    criadoPor: null,
    atualizadoPor: null
  };
}

function parseMaybeJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function deepMergeObjects(base, override) {
  if (!isPlainObject(base)) {
    return isPlainObject(override) ? { ...override } : override;
  }
  if (!isPlainObject(override)) {
    return { ...base };
  }

  const result = { ...base };
  Object.entries(override).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMergeObjects(result[key], value);
      return;
    }
    result[key] = value;
  });
  return result;
}

function pruneEmptyValues(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => pruneEmptyValues(item))
      .filter((item) => item !== undefined && item !== null && item !== '');
  }

  if (isPlainObject(value)) {
    const normalized = Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, pruneEmptyValues(item)])
        .filter(([, item]) => item !== undefined && item !== null && item !== '' && (!Array.isArray(item) || item.length))
    );
    return Object.keys(normalized).length ? normalized : undefined;
  }

  return value;
}

function getAuthMode() {
  if (env.siengeToken) return 'BEARER';
  if (env.siengeUsername && env.siengePassword) return 'BASIC';
  return 'NONE';
}

function resolveBaseUrlSource(localOverride) {
  if (String(localOverride || '').trim()) {
    return 'OVERRIDE_LOCAL';
  }
  if (String(env.siengeApiBaseUrl || '').trim()) {
    return 'ENV_BASE_URL';
  }
  if (String(env.siengeResolvedBaseUrl || '').trim()) {
    return 'ENV_COMPOSTA';
  }
  return 'AUSENTE';
}

function resolveEndpointTitulosSource(localOverride) {
  if (String(localOverride || '').trim()) {
    return 'OVERRIDE_LOCAL';
  }
  if (String(env.siengeEndpointTitulos || '').trim()) {
    return 'ENV';
  }
  return 'AUSENTE';
}

function buildEffectiveConfig(row) {
  const safe = row ? row.toJSON() : buildConfigPadrao();
  const baseUrl = String(
    safe.base_url_override || env.siengeResolvedBaseUrl || env.siengeApiBaseUrl || ''
  ).trim();
  const endpointTitulos = String(safe.endpoint_titulos || env.siengeEndpointTitulos || '').trim();
  const authMode = getAuthMode();
  const missing = [];

  if (!baseUrl) {
    missing.push('SIENGE_API_BASE_URL ou combinacao SIENGE_API_HOST + SIENGE_API_SUBDOMAIN (+ SIENGE_API_BASE_PATH) ou base_url_override');
  }
  if (!endpointTitulos) missing.push('endpoint_titulos ou SIENGE_ENDPOINT_TITULOS');
  if (authMode === 'NONE') missing.push('SIENGE_USERNAME + SIENGE_PASSWORD ou SIENGE_TOKEN');

  return {
    ...safe,
    base_url_efetiva: baseUrl || null,
    base_url_origem: resolveBaseUrlSource(safe.base_url_override),
    endpoint_titulos_efetivo: endpointTitulos || null,
    endpoint_titulos_origem: resolveEndpointTitulosSource(safe.endpoint_titulos),
    auth_mode: authMode,
    credenciais_env_configuradas: authMode !== 'NONE',
    pronto_para_envio: Boolean(safe.ativo && !missing.length),
    automacoes_credor: {
      auto_vincular_credor_busca_exata: Boolean(safe.auto_vincular_credor_busca_exata),
      auto_cadastrar_credor_quando_ausente: Boolean(safe.auto_cadastrar_credor_quando_ausente)
    },
    pendencias_prontidao: missing
  };
}

function buildConfigResponse(row) {
  const effective = buildEffectiveConfig(row);
  return {
    ...effective,
    possui_base_url_env: Boolean(env.siengeApiBaseUrl),
    possui_base_url_composta_env: Boolean(env.siengeResolvedBaseUrl),
    possui_endpoint_titulos_env: Boolean(env.siengeEndpointTitulos),
    possui_token_env: Boolean(env.siengeToken),
    possui_usuario_env: Boolean(env.siengeUsername),
    possui_senha_env: Boolean(env.siengePassword)
  };
}

function buildSaudeResponse(row) {
  const config = buildConfigResponse(row);
  const endpointsCredor = buildCredorEndpointCatalog(config);
  return {
    ativo: Boolean(config.ativo),
    pronto_para_envio: Boolean(config.pronto_para_envio),
    base_url_efetiva: config.base_url_efetiva,
    base_url_origem: config.base_url_origem,
    endpoint_titulos_efetivo: config.endpoint_titulos_efetivo,
    endpoint_titulos_origem: config.endpoint_titulos_origem,
    endpoints_credor: endpointsCredor,
    automacoes_credor: config.automacoes_credor,
    auth_mode: config.auth_mode,
    credenciais_env_configuradas: config.credenciais_env_configuradas,
    pendencias_prontidao: config.pendencias_prontidao,
    timeout_ms: config.timeout_ms,
    max_tentativas: config.max_tentativas
  };
}

function buildAuthHeaders() {
  if (env.siengeToken) {
    return {
      Authorization: `Bearer ${env.siengeToken}`
    };
  }

  if (env.siengeUsername && env.siengePassword) {
    const encoded = Buffer.from(`${env.siengeUsername}:${env.siengePassword}`).toString('base64');
    return {
      Authorization: `Basic ${encoded}`
    };
  }

  return {};
}

function resolveEndpointTemplate(template, params = {}) {
  let resolved = String(template || '').trim();
  if (!resolved) {
    return '';
  }

  Object.entries(params || {}).forEach(([key, value]) => {
    const replacement = value == null ? '' : encodeURIComponent(String(value).trim());
    resolved = resolved.replace(new RegExp(`\\{${key}\\}`, 'g'), replacement);
  });

  return resolved;
}

function buildDispatchUrl(config) {
  const base = String(config.base_url_efetiva || '').trim().replace(/\/+$/g, '');
  const endpoint = String(config.endpoint_titulos_efetivo || '').trim();
  if (!base || !endpoint) return '';
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  return `${base}/${endpoint.replace(/^\/+/g, '')}`;
}

function getCredorEndpointTemplates() {
  const endpointCredores = String(env.siengeEndpointCredores || 'creditors').trim();
  const endpointCredorDetalhe = String(env.siengeEndpointCredorDetalhe || `${endpointCredores}/{creditorId}`).trim();
  const endpointCredorBankInformations = String(
    env.siengeEndpointCredorBankInformations || `${endpointCredores}/{creditorId}/bank-informations`
  ).trim();
  const endpointCredorPixInformations = String(
    env.siengeEndpointCredorPixInformations || `${endpointCredores}/{creditorId}/pix-informations`
  ).trim();

  return {
    endpoint_credores: endpointCredores,
    endpoint_credor_detalhe: endpointCredorDetalhe,
    endpoint_credor_bank_informations: endpointCredorBankInformations,
    endpoint_credor_pix_informations: endpointCredorPixInformations
  };
}

function buildCredorEndpointCatalog(config, creditorId = null) {
  const base = String(config?.base_url_efetiva || '').trim().replace(/\/+$/g, '');
  const templates = getCredorEndpointTemplates();
  const hasCreditorId = creditorId !== undefined && creditorId !== null && String(creditorId).trim() !== '';

  function buildUrl(template, params = {}) {
    const resolved = resolveEndpointTemplate(template, params);
    if (!resolved) return null;
    if (/^https?:\/\//i.test(resolved)) return resolved;
    if (!base) return null;
    return `${base}/${resolved.replace(/^\/+/g, '')}`;
  }

  return {
    templates,
    urls: {
      credores: buildUrl(templates.endpoint_credores),
      credor_detalhe: hasCreditorId ? buildUrl(templates.endpoint_credor_detalhe, { creditorId }) : null,
      credor_bank_informations: hasCreditorId
        ? buildUrl(templates.endpoint_credor_bank_informations, { creditorId })
        : null,
      credor_pix_informations: hasCreditorId
        ? buildUrl(templates.endpoint_credor_pix_informations, { creditorId })
        : null
    }
  };
}

function extractExternalCreditorId(responseSnapshot) {
  const candidates = [
    responseSnapshot?.creditorId,
    responseSnapshot?.id,
    responseSnapshot?.data?.creditorId,
    responseSnapshot?.data?.id,
    responseSnapshot?.result?.creditorId,
    responseSnapshot?.result?.id
  ];
  const found = candidates.find((item) => item !== undefined && item !== null && String(item).trim() !== '');
  return found == null ? null : String(found).trim().slice(0, 120);
}

function extractExternalTitleId(responseSnapshot) {
  const candidates = [
    responseSnapshot?.id,
    responseSnapshot?.titleId,
    responseSnapshot?.tituloId,
    responseSnapshot?.data?.id,
    responseSnapshot?.data?.titleId,
    responseSnapshot?.data?.tituloId,
    responseSnapshot?.result?.id
  ];
  const found = candidates.find((item) => item !== undefined && item !== null && String(item).trim() !== '');
  return found == null ? null : String(found).trim().slice(0, 120);
}

async function loadActiveMapeamento(entidadeTipo, entidadeId) {
  return IntegracaoSiengeMapeamento.findOne({
    where: {
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId,
      ativo: true
    }
  });
}

async function loadAnyMapeamento(entidadeTipo, entidadeId) {
  return IntegracaoSiengeMapeamento.findOne({
    where: {
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId
    }
  });
}

async function loadCurrentConfig() {
  return IntegracaoSiengeConfig.findOne({
    order: [['id', 'DESC']],
    include: [
      {
        model: User,
        as: 'criadoPor',
        attributes: ['id', 'nome', 'email']
      },
      {
        model: User,
        as: 'atualizadoPor',
        attributes: ['id', 'nome', 'email']
      }
    ]
  });
}

async function registrarLog({ filaId, acao, status, mensagem, requestSnapshot, responseSnapshot, userId }) {
  return IntegracaoSiengeLog.create({
    fila_id: filaId,
    acao,
    status,
    mensagem: mensagem || null,
    request_snapshot: requestSnapshot || null,
    response_snapshot: responseSnapshot || null,
    criado_por: userId || null
  });
}

async function loadTituloElegivel(tituloId) {
  const titulo = await TituloFinanceiro.findByPk(tituloId, {
    include: [
      {
        model: Obra,
        as: 'obra',
        attributes: ['id', 'codigo', 'nome']
      },
      {
        model: Parceiro,
        as: 'parceiro',
        attributes: ['id', 'nome', 'cpf_cnpj', 'telefone', 'email']
      },
      {
        model: CategoriaFinanceira,
        as: 'categoriaFinanceira',
        attributes: ['id', 'nome', 'tipo']
      },
      {
        model: RhFechamentoTitulo,
        as: 'fechamentoRh',
        attributes: ['id', 'fechamento_id', 'apuracao_evento_id', 'valor_gerado']
      }
    ]
  });

  if (!titulo) {
    throw new ValidationError('Titulo financeiro nao encontrado para a Integracao SIENGE.', 404);
  }

  if (normalizeToken(titulo.tipo) !== 'PAGAR') {
    throw new ValidationError('Nesta fase a Integracao SIENGE aceita apenas titulos financeiros a pagar.');
  }
  if (!['ABERTO', 'PARCIAL'].includes(normalizeToken(titulo.status))) {
    throw new ValidationError('Somente titulos financeiros abertos ou parciais podem entrar na fila SIENGE.');
  }
  if (!titulo.parceiro) {
    throw new ValidationError('O titulo financeiro informado nao possui parceiro vinculado.');
  }
  if (!titulo.obra) {
    throw new ValidationError('O titulo financeiro informado nao possui obra vinculada.');
  }

  return titulo;
}

function inferOrigemModulo(titulo, origemInformada) {
  const origem = normalizeToken(origemInformada);
  if (ORIGENS_MODULO.includes(origem)) {
    return origem;
  }
  if (titulo?.fechamentoRh) {
    return 'RH_DP';
  }
  return 'FINANCEIRO';
}

function buildPayloadSnapshot(titulo, configRow, origemModulo, options = {}) {
  const config = buildEffectiveConfig(configRow);
  const parceiro = titulo.parceiro || {};
  const obra = titulo.obra || {};
  const categoria = titulo.categoriaFinanceira || {};
  const externalCreditorId = options.externalCreditorId || null;

  return {
    versao_payload: 1,
    prepared_at: new Date().toISOString(),
    origem_modulo: origemModulo,
    defaults: {
      documento_padrao_id: config.documento_padrao_id || null,
      indexador_padrao_id: config.indexador_padrao_id || null,
      ...(config.payload_defaults_json || {})
    },
    titulo: {
      id: titulo.id,
      tipo: titulo.tipo,
      status: titulo.status,
      descricao: titulo.descricao,
      numero_documento: titulo.numero_documento,
      valor_original: roundCurrency(titulo.valor_original),
      valor_saldo: roundCurrency(titulo.valor_saldo),
      valor_baixado: roundCurrency(titulo.valor_baixado),
      data_emissao: titulo.data_emissao,
      data_vencimento: titulo.data_vencimento,
      observacoes: titulo.observacoes,
      forma_cobranca: titulo.forma_cobranca,
      identificador_externo: titulo.identificador_externo
    },
    parceiro: {
      id: parceiro.id || null,
      nome: parceiro.nome || null,
      documento: parceiro.cpf_cnpj || null,
      telefone: parceiro.telefone || null,
      email: parceiro.email || null,
      sienge_creditor_id: externalCreditorId
    },
    obra: {
      id: obra.id || null,
      codigo: obra.codigo || null,
      nome: obra.nome || null
    },
    categoria_financeira: {
      id: categoria.id || null,
      nome: categoria.nome || null,
      tipo: categoria.tipo || null
    },
    vinculos: {
      fechamento_rh_id: titulo.fechamentoRh?.fechamento_id || null,
      fechamento_rh_titulo_id: titulo.fechamentoRh?.id || null
    },
    integracao_sienge: {
      base_url_efetiva: config.base_url_efetiva,
      endpoint_titulos_efetivo: config.endpoint_titulos_efetivo,
      endpoints_credor: buildCredorEndpointCatalog(config, externalCreditorId)
    }
  };
}

function avaliarProntidaoParceiroParaCredor(parceiro) {
  const pendencias = [];
  if (!String(parceiro?.nome || '').trim()) pendencias.push('nome');
  if (!String(parceiro?.cpf_cnpj || '').trim()) pendencias.push('cpf_cnpj');

  return {
    pronto_para_busca_ou_vinculo: pendencias.length === 0,
    pendencias
  };
}

function buildParceiroTemplateContext(parceiro) {
  const documentoNumeros = normalizeDocumentValue(parceiro?.cpf_cnpj);
  const telefoneNumeros = normalizeDocumentValue(parceiro?.telefone);
  const cepNumeros = normalizeDocumentValue(parceiro?.cep);

  return {
    parceiro: {
      id: parceiro?.id || null,
      nome: parceiro?.nome || null,
      cpf_cnpj: parceiro?.cpf_cnpj || null,
      cpf_cnpj_numeros: documentoNumeros || null,
      telefone: parceiro?.telefone || null,
      telefone_numeros: telefoneNumeros || null,
      email: parceiro?.email || null,
      endereco: parceiro?.endereco || null,
      numero: parceiro?.numero || null,
      bairro: parceiro?.bairro || null,
      cep: parceiro?.cep || null,
      cep_numeros: cepNumeros || null,
      municipio: parceiro?.municipio || null,
      estado: parceiro?.estado || null,
      tipo_pessoa: parceiro?.tipo_pessoa || null,
      tipo_pessoa_normalizado: documentoNumeros.length === 14 ? 'JURIDICA' : documentoNumeros.length === 11 ? 'FISICA' : null
    }
  };
}

function resolveTemplatePath(context, path) {
  return String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), context);
}

function resolveTemplateValue(value, context) {
  if (Array.isArray(value)) {
    return value.map((item) => resolveTemplateValue(item, context));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveTemplateValue(item, context)])
    );
  }

  if (typeof value !== 'string') {
    return value;
  }

  const exactMatch = value.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
  if (exactMatch) {
    return resolveTemplatePath(context, exactMatch[1]);
  }

  return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path) => {
    const resolved = resolveTemplatePath(context, path);
    return resolved == null ? '' : String(resolved);
  });
}

function buildCredorCreatePayload(parceiro, configRow, options = {}) {
  const config = buildEffectiveConfig(configRow);
  const templateContext = buildParceiroTemplateContext(parceiro);
  const payloadDefaults = isPlainObject(config.payload_defaults_json) ? config.payload_defaults_json : {};
  const credorTemplate = payloadDefaults.siengeCredorTemplate || payloadDefaults.sienge_credor_template || null;
  const credorDefaults = payloadDefaults.siengeCredorDefaults || payloadDefaults.sienge_credor_defaults || {};
  const payloadOverride = isPlainObject(options.payload_override) ? options.payload_override : {};

  let payloadBase;
  if (isPlainObject(credorTemplate)) {
    payloadBase = resolveTemplateValue(credorTemplate, templateContext);
  } else {
    payloadBase = {
      name: parceiro?.nome || undefined,
      cpfCnpj: normalizeDocumentValue(parceiro?.cpf_cnpj) || undefined,
      municipalityId: credorDefaults.municipalityId,
      address: parceiro?.endereco || undefined,
      number: parceiro?.numero || undefined,
      district: parceiro?.bairro || undefined,
      zipCode: normalizeDocumentValue(parceiro?.cep) || undefined,
      email: parceiro?.email || undefined
    };

    const telefoneNumeros = normalizeDocumentValue(parceiro?.telefone);
    if (telefoneNumeros) {
      payloadBase.businessPhones = [{ number: telefoneNumeros }];
    }
  }

  const payload = pruneEmptyValues(
    deepMergeObjects(
      deepMergeObjects(isPlainObject(credorDefaults) ? credorDefaults : {}, payloadBase),
      payloadOverride
    )
  ) || {};

  const documentValue = String(
    payload.cpfCnpj || payload.documentNumber || payload.document || payload.taxNumber || ''
  ).trim();
  const pendencias = [];
  if (!String(payload.name || '').trim()) pendencias.push('name');
  if (!documentValue) pendencias.push('cpfCnpj/documentNumber');
  if (!(payload.municipalityId || payload.municipalityID || payload.cityId || payload.cityID)) {
    pendencias.push('municipalityId');
  }

  return {
    payload,
    pendencias
  };
}

async function loadParceiroParaCredor(parceiroId) {
  const parceiro = await Parceiro.findByPk(parceiroId, {
    attributes: [
      'id',
      'nome',
      'cpf_cnpj',
      'telefone',
      'email',
      'endereco',
      'numero',
      'bairro',
      'cep',
      'municipio',
      'estado',
      'tipo_pessoa',
      'ativo'
    ]
  });

  if (!parceiro) {
    throw new ValidationError('Parceiro nao encontrado para a Integracao SIENGE.', 404);
  }

  return parceiro;
}

async function buildParceiroCredorContext(parceiroId) {
  const [configRow, parceiro, mapeamento] = await Promise.all([
    loadCurrentConfig(),
    loadParceiroParaCredor(parceiroId),
    loadActiveMapeamento(ENTIDADE_MAPEAMENTO_PARCEIRO, parceiroId)
  ]);

  const config = buildEffectiveConfig(configRow);
  const prontidao = avaliarProntidaoParceiroParaCredor(parceiro);
  const externalCreditorId = mapeamento?.external_id || null;
  const payloadCredorPreview = buildCredorCreatePayload(parceiro, configRow);

  return {
    parceiro,
    prontidao,
    mapeamento: mapeamento
      ? {
          id: mapeamento.id,
          external_creditor_id: mapeamento.external_id,
          ativo: Boolean(mapeamento.ativo),
          metadata_json: mapeamento.metadata_json || null,
          createdAt: mapeamento.createdAt,
          updatedAt: mapeamento.updatedAt
        }
      : null,
    credor_sienge: {
      vinculado: Boolean(externalCreditorId),
      external_creditor_id: externalCreditorId,
      endpoints: buildCredorEndpointCatalog(config, externalCreditorId)
    },
    rascunho_cadastro: {
      tipo_pessoa: parceiro.tipo_pessoa,
      nome: parceiro.nome,
      cpf_cnpj: parceiro.cpf_cnpj,
      telefone: parceiro.telefone,
      email: parceiro.email,
      endereco: parceiro.endereco,
      numero: parceiro.numero,
      bairro: parceiro.bairro,
      cep: parceiro.cep,
      municipio: parceiro.municipio,
      estado: parceiro.estado
    },
    rascunho_payload_credor_sienge: payloadCredorPreview.payload,
    pendencias_payload_credor_sienge: payloadCredorPreview.pendencias
  };
}

function normalizeDocumentValue(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeTextLookup(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function extractCredorCollection(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = [
    payload?.items,
    payload?.data,
    payload?.results,
    payload?.content,
    payload?._embedded?.items
  ];

  const found = candidates.find((item) => Array.isArray(item));
  return Array.isArray(found) ? found : [];
}

function normalizeCredorCandidate(raw = {}) {
  const externalId = raw.creditorId ?? raw.id ?? raw.code ?? raw.codigo ?? raw.creditorCode ?? null;
  const documento = normalizeDocumentValue(
    raw.cpfCnpj
    || raw.cpf_cnpj
    || raw.document
    || raw.documentNumber
    || raw.document_number
    || raw.taxNumber
    || raw.tax_number
  );
  const nome = String(
    raw.name
    || raw.nome
    || raw.creditorName
    || raw.creditor_name
    || raw.legalName
    || raw.legal_name
    || raw.businessName
    || raw.business_name
    || ''
  ).trim();
  const nomeFantasia = String(
    raw.tradeName
    || raw.trade_name
    || raw.fantasyName
    || raw.fantasy_name
    || raw.nomeFantasia
    || raw.nome_fantasia
    || ''
  ).trim();

  return {
    raw,
    external_creditor_id: externalId == null ? null : String(externalId).trim(),
    documento,
    nome,
    nome_fantasia: nomeFantasia,
    codigo: raw.code ?? raw.codigo ?? null
  };
}

function classifyCredorMatch(parceiro, candidate) {
  const documentoParceiro = normalizeDocumentValue(parceiro?.cpf_cnpj);
  const nomeParceiro = normalizeTextLookup(parceiro?.nome);
  const nomeCandidato = normalizeTextLookup(candidate?.nome);
  const nomeFantasiaCandidato = normalizeTextLookup(candidate?.nome_fantasia);

  const documentoExato = Boolean(documentoParceiro && candidate?.documento && documentoParceiro === candidate.documento);
  const nomeExato = Boolean(nomeParceiro && nomeCandidato && nomeParceiro === nomeCandidato);
  const nomeFantasiaExato = Boolean(nomeParceiro && nomeFantasiaCandidato && nomeParceiro === nomeFantasiaCandidato);

  let score = 0;
  if (documentoExato) score += 100;
  if (nomeExato) score += 40;
  if (nomeFantasiaExato) score += 20;

  return {
    documento_exato: documentoExato,
    nome_exato: nomeExato,
    nome_fantasia_exato: nomeFantasiaExato,
    score
  };
}

function buildCredorSearchUrl(config, { limit, offset }) {
  const catalog = buildCredorEndpointCatalog(config);
  const baseUrl = catalog?.urls?.credores;
  if (!baseUrl) {
    return '';
  }

  const url = new URL(baseUrl);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  return url.toString();
}

function assertSiengeCredorSearchReady(config) {
  if (!config.base_url_efetiva) {
    throw new ValidationError('Base URL da Integracao SIENGE nao configurada para consulta de credores.');
  }
  if (config.auth_mode === 'NONE') {
    throw new ValidationError('Credenciais da Integracao SIENGE nao configuradas para consulta de credores.');
  }

  const catalog = buildCredorEndpointCatalog(config);
  if (!catalog?.urls?.credores) {
    throw new ValidationError('Endpoint de credores nao configurado para a Integracao SIENGE.');
  }
}

function assertSiengeCredorCreateReady(config) {
  if (!config.ativo) {
    throw new ValidationError('A configuracao da Integracao SIENGE esta inativa para cadastro de credor.');
  }
  if (!config.base_url_efetiva) {
    throw new ValidationError('Base URL da Integracao SIENGE nao configurada para cadastro de credor.');
  }
  if (config.auth_mode === 'NONE') {
    throw new ValidationError('Credenciais da Integracao SIENGE nao configuradas para cadastro de credor.');
  }

  const catalog = buildCredorEndpointCatalog(config);
  if (!catalog?.urls?.credores) {
    throw new ValidationError('Endpoint de credores nao configurado para a Integracao SIENGE.');
  }
}

async function buscarCredorParceiroNoSienge(parceiroId, options = {}, user) {
  const [configRow, parceiro] = await Promise.all([
    loadCurrentConfig(),
    loadParceiroParaCredor(parceiroId)
  ]);
  const config = buildEffectiveConfig(configRow);
  assertSiengeCredorSearchReady(config);

  const limit = Math.min(Math.max(Number(options.limit) || 100, 1), 200);
  const maxPaginas = Math.min(Math.max(Number(options.max_paginas) || 3, 1), 20);
  const vincularAutomaticamente = Boolean(options.vincular_automaticamente);

  const candidatos = [];
  let paginasConsultadas = 0;

  for (let pagina = 0; pagina < maxPaginas; pagina += 1) {
    const offset = pagina * limit;
    const requestUrl = buildCredorSearchUrl(config, { limit, offset });
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: buildAuthHeaders(),
      signal: AbortSignal.timeout(Number(config.timeout_ms || env.siengeRequestTimeoutMs || 20000))
    });

    const responseText = await response.text();
    const responseSnapshot = parseMaybeJson(responseText);
    if (!response.ok) {
      const message = String(responseSnapshot?.message || responseSnapshot?.error || responseText || 'Erro ao consultar credores no SIENGE.')
        .trim()
        .slice(0, 4000);
      throw new ValidationError(message, response.status >= 400 && response.status < 500 ? response.status : 502);
    }

    const pageItems = extractCredorCollection(responseSnapshot);
    paginasConsultadas += 1;

    pageItems.forEach((raw) => {
      const candidate = normalizeCredorCandidate(raw);
      const match = classifyCredorMatch(parceiro, candidate);
      candidatos.push({
        ...candidate,
        ...match
      });
    });

    if (!pageItems.length || pageItems.length < limit) {
      break;
    }
  }

  const ordenados = candidatos
    .filter((item) => item.external_creditor_id)
    .sort((a, b) => b.score - a.score || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));

  const matchesDocumento = ordenados.filter((item) => item.documento_exato);
  const matchesDocumentoNome = ordenados.filter((item) => item.documento_exato && (item.nome_exato || item.nome_fantasia_exato));
  const matchExatoUnico = matchesDocumento.length === 1
    ? matchesDocumento[0]
    : matchesDocumentoNome.length === 1
      ? matchesDocumentoNome[0]
      : null;

  let contextoAtualizado = null;
  let vinculacaoAutomatica = false;

  if (vincularAutomaticamente && matchExatoUnico?.external_creditor_id) {
    contextoAtualizado = await salvarMapeamentoCredorParceiro(parceiroId, {
      external_creditor_id: matchExatoUnico.external_creditor_id,
      ativo: true,
      metadata_json: {
        origem: 'BUSCA_SIENGE',
        criterio: 'MATCH_EXATO_UNICO',
        documento_exato: matchExatoUnico.documento_exato,
        nome_exato: matchExatoUnico.nome_exato,
        nome_fantasia_exato: matchExatoUnico.nome_fantasia_exato
      }
    }, user);
    vinculacaoAutomatica = true;
  }

  return {
    parceiro: {
      id: parceiro.id,
      nome: parceiro.nome,
      cpf_cnpj: parceiro.cpf_cnpj
    },
    consulta: {
      limit,
      max_paginas: maxPaginas,
      paginas_consultadas: paginasConsultadas,
      total_avaliado: candidatos.length,
      vincular_automaticamente: vincularAutomaticamente
    },
    match_exato_unico: matchExatoUnico
      ? {
          external_creditor_id: matchExatoUnico.external_creditor_id,
          documento: matchExatoUnico.documento,
          nome: matchExatoUnico.nome,
          nome_fantasia: matchExatoUnico.nome_fantasia,
          score: matchExatoUnico.score
        }
      : null,
    vinculacao_automatica_realizada: vinculacaoAutomatica,
    candidatos: ordenados.slice(0, 20).map((item) => ({
      external_creditor_id: item.external_creditor_id,
      documento: item.documento,
      nome: item.nome,
      nome_fantasia: item.nome_fantasia,
      codigo: item.codigo,
      documento_exato: item.documento_exato,
      nome_exato: item.nome_exato,
      nome_fantasia_exato: item.nome_fantasia_exato,
      score: item.score
    })),
    contexto_atualizado: contextoAtualizado
  };
}

async function cadastrarCredorParceiroNoSienge(parceiroId, options = {}, user, internalOptions = {}) {
  const [configRow, parceiro] = await Promise.all([
    loadCurrentConfig(),
    loadParceiroParaCredor(parceiroId)
  ]);
  const config = buildEffectiveConfig(configRow);

  if (internalOptions.requireAutoPolicy && !config.auto_cadastrar_credor_quando_ausente) {
    return null;
  }

  const contextoExistente = await buildParceiroCredorContext(parceiroId);
  if (contextoExistente?.credor_sienge?.external_creditor_id) {
    return {
      acao: 'JA_VINCULADO',
      external_creditor_id: contextoExistente.credor_sienge.external_creditor_id,
      contexto_atualizado: contextoExistente,
      payload_enviado: null,
      response_snapshot: null
    };
  }

  assertSiengeCredorCreateReady(config);

  const buscarAntesDeCadastrar = options.buscar_antes_de_cadastrar !== false;
  const vincularSeMatchExato = options.vincular_se_match_exato !== false;

  if (buscarAntesDeCadastrar) {
    const busca = await buscarCredorParceiroNoSienge(
      parceiroId,
      {
        vincular_automaticamente: vincularSeMatchExato,
        limit: 100,
        max_paginas: 3
      },
      user
    );

    const externalMatchId = busca?.contexto_atualizado?.credor_sienge?.external_creditor_id
      || busca?.match_exato_unico?.external_creditor_id
      || null;

    if (externalMatchId && vincularSeMatchExato) {
      return {
        acao: 'VINCULO_EXISTENTE',
        external_creditor_id: externalMatchId,
        contexto_atualizado: busca.contexto_atualizado || (await buildParceiroCredorContext(parceiroId)),
        payload_enviado: null,
        response_snapshot: null
      };
    }
  }
  const payloadPreview = buildCredorCreatePayload(parceiro, configRow, {
    payload_override: options.payload_override
  });

  if (payloadPreview.pendencias.length) {
    throw new ValidationError(
      `Payload insuficiente para cadastrar credor no SIENGE. Pendencias: ${payloadPreview.pendencias.join(', ')}.`
    );
  }

  const requestUrl = buildCredorEndpointCatalog(config)?.urls?.credores;
  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders()
    },
    body: JSON.stringify(payloadPreview.payload),
    signal: AbortSignal.timeout(Number(config.timeout_ms || env.siengeRequestTimeoutMs || 20000))
  });

  const responseText = await response.text();
  const responseSnapshot = parseMaybeJson(responseText);

  if (!response.ok) {
    const message = String(
      responseSnapshot?.message || responseSnapshot?.error || responseText || 'Erro ao cadastrar credor no SIENGE.'
    )
      .trim()
      .slice(0, 4000);
    throw new ValidationError(message, response.status >= 400 && response.status < 500 ? response.status : 502);
  }

  const externalCreditorId = extractExternalCreditorId(responseSnapshot);
  if (!externalCreditorId) {
    throw new ValidationError('O SIENGE respondeu ao cadastro do credor sem retornar `creditorId` identificavel.');
  }

  const contextoAtualizado = await salvarMapeamentoCredorParceiro(parceiroId, {
    external_creditor_id: externalCreditorId,
    ativo: true,
    metadata_json: {
      origem: internalOptions.requireAutoPolicy ? 'AUTO_CREATE_SIENGE' : 'CREATE_SIENGE',
      criterio: 'POST_CREDITORS',
      response_snapshot: responseSnapshot
    }
  }, user);

  return {
    acao: 'CREDOR_CRIADO',
    external_creditor_id: externalCreditorId,
    contexto_atualizado: contextoAtualizado,
    payload_enviado: payloadPreview.payload,
    response_snapshot: responseSnapshot
  };
}

async function resolverExternalCreditorIdParaTitulo(titulo, configRow, user) {
  if (!titulo?.parceiro?.id) {
    return null;
  }

  const mapeamentoAtual = await loadActiveMapeamento(ENTIDADE_MAPEAMENTO_PARCEIRO, titulo.parceiro.id);
  if (mapeamentoAtual?.external_id) {
    return mapeamentoAtual.external_id;
  }

  const config = buildEffectiveConfig(configRow);
  try {
    if (config.auto_cadastrar_credor_quando_ausente) {
      const cadastro = await cadastrarCredorParceiroNoSienge(
        titulo.parceiro.id,
        {
          buscar_antes_de_cadastrar: true,
          vincular_se_match_exato: true
        },
        user,
        { requireAutoPolicy: true }
      );
      return cadastro?.external_creditor_id || null;
    }

    if (config.auto_vincular_credor_busca_exata) {
      const busca = await buscarCredorParceiroNoSienge(
        titulo.parceiro.id,
        {
          vincular_automaticamente: true,
          limit: 100,
          max_paginas: 2
        },
        user
      );

      return (
        busca?.contexto_atualizado?.credor_sienge?.external_creditor_id
        || busca?.match_exato_unico?.external_creditor_id
        || null
      );
    }
  } catch {
    return null;
  }

  return null;
}

async function detalharFilaIntegracaoSienge(id) {
  const fila = await IntegracaoSiengeFila.findByPk(id, {
    include: [
      {
        model: TituloFinanceiro,
        as: 'tituloFinanceiro',
        attributes: [
          'id',
          'tipo',
          'status',
          'descricao',
          'numero_documento',
          'valor_original',
          'valor_saldo',
          'data_emissao',
          'data_vencimento'
        ],
        include: [
          {
            model: Obra,
            as: 'obra',
            attributes: ['id', 'codigo', 'nome']
          },
          {
            model: Parceiro,
            as: 'parceiro',
            attributes: ['id', 'nome', 'cpf_cnpj', 'telefone', 'email']
          },
          {
            model: CategoriaFinanceira,
            as: 'categoriaFinanceira',
            attributes: ['id', 'nome', 'tipo']
          },
          {
            model: RhFechamentoTitulo,
            as: 'fechamentoRh',
            attributes: ['id', 'fechamento_id', 'apuracao_evento_id', 'valor_gerado']
          }
        ]
      },
      {
        model: User,
        as: 'criadoPor',
        attributes: ['id', 'nome', 'email']
      },
      {
        model: User,
        as: 'atualizadoPor',
        attributes: ['id', 'nome', 'email']
      }
    ]
  });

  if (!fila) {
    throw new ValidationError('Item da fila SIENGE nao encontrado.', 404);
  }

  return fila;
}

async function obterConfiguracaoSienge() {
  const row = await loadCurrentConfig();
  return buildConfigResponse(row);
}

async function obterSaudeIntegracaoSienge() {
  const row = await loadCurrentConfig();
  return buildSaudeResponse(row);
}

async function salvarConfiguracaoSienge(data, user) {
  const existing = await IntegracaoSiengeConfig.findOne({
    order: [['id', 'DESC']]
  });

  if (existing) {
    await existing.update({
      ...data,
      atualizado_por: user?.id || null
    });
  } else {
    await IntegracaoSiengeConfig.create({
      ...data,
      criado_por: user?.id || null,
      atualizado_por: user?.id || null
    });
  }

  return obterConfiguracaoSienge();
}

async function listarFilaIntegracaoSienge(filters = {}) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.titulo_financeiro_id) where.titulo_financeiro_id = filters.titulo_financeiro_id;
  if (filters.origem_modulo) where.origem_modulo = filters.origem_modulo;

  const items = await IntegracaoSiengeFila.findAll({
    where,
    limit: filters.limit || 60,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: TituloFinanceiro,
        as: 'tituloFinanceiro',
        attributes: [
          'id',
          'tipo',
          'status',
          'descricao',
          'numero_documento',
          'valor_original',
          'valor_saldo',
          'data_vencimento'
        ],
        include: [
          {
            model: Obra,
            as: 'obra',
            attributes: ['id', 'codigo', 'nome']
          },
          {
            model: Parceiro,
            as: 'parceiro',
            attributes: ['id', 'nome', 'cpf_cnpj']
          }
        ]
      }
    ]
  });

  const resumo = items.reduce((acc, item) => {
    acc.total += 1;
    const status = normalizeToken(item.status);
    if (status === 'PENDENTE') acc.pendentes += 1;
    if (status === 'PROCESSANDO') acc.processando += 1;
    if (status === 'SUCESSO') acc.sucesso += 1;
    if (status === 'ERRO') acc.erro += 1;
    return acc;
  }, {
    total: 0,
    pendentes: 0,
    processando: 0,
    sucesso: 0,
    erro: 0
  });

  return {
    items,
    resumo
  };
}

async function listarLogsIntegracaoSienge(filters = {}) {
  const where = {};
  if (filters.fila_id) where.fila_id = filters.fila_id;

  const items = await IntegracaoSiengeLog.findAll({
    where,
    limit: filters.limit || 120,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: IntegracaoSiengeFila,
        as: 'fila',
        attributes: ['id', 'status', 'titulo_financeiro_id', 'origem_modulo']
      },
      {
        model: User,
        as: 'criadoPor',
        attributes: ['id', 'nome', 'email']
      }
    ]
  });

  return {
    items
  };
}

async function upsertFilaBase({ titulo_financeiro_id, origem_modulo, forcar_recriar_payload }, user) {
  const [configRow, titulo] = await Promise.all([
    loadCurrentConfig(),
    loadTituloElegivel(titulo_financeiro_id)
  ]);

  const origemModulo = inferOrigemModulo(titulo, origem_modulo);
  const externalCreditorId = await resolverExternalCreditorIdParaTitulo(titulo, configRow, user);
  const payloadSnapshot = buildPayloadSnapshot(titulo, configRow, origemModulo, {
    externalCreditorId
  });
  const existente = await IntegracaoSiengeFila.findOne({
    where: { titulo_financeiro_id }
  });

  let filaId = existente?.id || null;

  if (existente) {
    await existente.update({
      origem_modulo: origemModulo,
      status: normalizeToken(existente.status) === 'SUCESSO' && !forcar_recriar_payload ? 'SUCESSO' : 'PENDENTE',
      payload_snapshot: payloadSnapshot,
      external_creditor_id: externalCreditorId,
      ultimo_erro: normalizeToken(existente.status) === 'SUCESSO' && !forcar_recriar_payload ? existente.ultimo_erro : null,
      atualizado_por: user?.id || null
    });

    await registrarLog({
      filaId: existente.id,
      acao: 'REFRESH_QUEUE',
      status: 'PENDENTE',
      mensagem: 'Payload da fila SIENGE atualizado a partir do titulo financeiro central.',
      requestSnapshot: payloadSnapshot,
      responseSnapshot: null,
      userId: user?.id || null
    });
  } else {
    const criada = await IntegracaoSiengeFila.create({
      titulo_financeiro_id,
      origem_modulo: origemModulo,
      status: 'PENDENTE',
      tentativas: 0,
      payload_snapshot: payloadSnapshot,
      external_creditor_id: externalCreditorId,
      criado_por: user?.id || null,
      atualizado_por: user?.id || null
    });

    filaId = criada.id;

    await registrarLog({
      filaId: criada.id,
      acao: 'QUEUE_CREATED',
      status: 'PENDENTE',
      mensagem: 'Titulo financeiro preparado para a fila SIENGE.',
      requestSnapshot: payloadSnapshot,
      responseSnapshot: null,
      userId: user?.id || null
    });
  }

  return detalharFilaIntegracaoSienge(filaId || existente.id);
}

async function processarFilaInterna(filaId, { forcar_recriar_payload = false } = {}, user) {
  const fila = await IntegracaoSiengeFila.findByPk(filaId);
  if (!fila) {
    throw new ValidationError('Item da fila SIENGE nao encontrado.', 404);
  }

  const configRow = await loadCurrentConfig();
  const config = buildEffectiveConfig(configRow);
  const titulo = await loadTituloElegivel(fila.titulo_financeiro_id);
  const externalCreditorId = (await resolverExternalCreditorIdParaTitulo(titulo, configRow, user)) || fila.external_creditor_id || null;
  const payloadSnapshot = (forcar_recriar_payload || !fila.payload_snapshot)
    ? buildPayloadSnapshot(titulo, configRow, inferOrigemModulo(titulo, fila.origem_modulo), {
        externalCreditorId
      })
    : fila.payload_snapshot;

  await fila.update({
    origem_modulo: inferOrigemModulo(titulo, fila.origem_modulo),
    status: 'PROCESSANDO',
    tentativas: Number(fila.tentativas || 0) + 1,
    payload_snapshot: payloadSnapshot,
    external_creditor_id: externalCreditorId,
    atualizado_por: user?.id || null
  });

  const requestUrl = buildDispatchUrl(config);
  if (!config.ativo) {
    const message = 'A configuracao da Integracao SIENGE esta inativa para envio.';
    await fila.update({ status: 'ERRO', ultimo_erro: message, atualizado_por: user?.id || null });
    await registrarLog({ filaId: fila.id, acao: 'SEND_TITLE', status: 'ERRO', mensagem: message, requestSnapshot: payloadSnapshot, responseSnapshot: null, userId: user?.id || null });
    throw new ValidationError(message);
  }

  if (!config.pronto_para_envio || !requestUrl) {
    const message = `Configuracao incompleta para envio ao SIENGE: ${config.pendencias_prontidao.join(', ')}`;
    await fila.update({ status: 'ERRO', ultimo_erro: message, atualizado_por: user?.id || null });
    await registrarLog({ filaId: fila.id, acao: 'SEND_TITLE', status: 'ERRO', mensagem: message, requestSnapshot: payloadSnapshot, responseSnapshot: null, userId: user?.id || null });
    throw new ValidationError(message);
  }

  try {
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders()
      },
      body: JSON.stringify(payloadSnapshot),
      signal: AbortSignal.timeout(Number(config.timeout_ms || env.siengeRequestTimeoutMs || 20000))
    });

    const responseText = await response.text();
    const responseSnapshot = parseMaybeJson(responseText);

    if (!response.ok) {
      const message = String(responseSnapshot?.message || responseSnapshot?.error || responseText || 'Erro ao enviar titulo ao SIENGE.')
        .trim()
        .slice(0, 4000);

      await fila.update({
        status: 'ERRO',
        ultimo_erro: message,
        response_snapshot: responseSnapshot,
        atualizado_por: user?.id || null
      });

      await registrarLog({
        filaId: fila.id,
        acao: 'SEND_TITLE',
        status: 'ERRO',
        mensagem: message,
        requestSnapshot: payloadSnapshot,
        responseSnapshot,
        userId: user?.id || null
      });

      throw new ValidationError(message, response.status >= 400 && response.status < 500 ? response.status : 502);
    }

    const externalTitleId = extractExternalTitleId(responseSnapshot);

    await fila.update({
      status: 'SUCESSO',
      enviado_em: new Date(),
      ultimo_erro: null,
      response_snapshot: responseSnapshot,
      external_title_id: externalTitleId,
      external_creditor_id: externalCreditorId,
      atualizado_por: user?.id || null
    });

    if (externalTitleId) {
      const mapping = await IntegracaoSiengeMapeamento.findOne({
        where: {
          entidade_tipo: ENTIDADE_MAPEAMENTO_TITULO,
          entidade_id: titulo.id
        }
      });

      if (mapping) {
        await mapping.update({
          external_id: externalTitleId,
          metadata_json: responseSnapshot || null,
          ativo: true,
          atualizado_por: user?.id || null
        });
      } else {
        await IntegracaoSiengeMapeamento.create({
          entidade_tipo: ENTIDADE_MAPEAMENTO_TITULO,
          entidade_id: titulo.id,
          external_id: externalTitleId,
          metadata_json: responseSnapshot || null,
          ativo: true,
          criado_por: user?.id || null,
          atualizado_por: user?.id || null
        });
      }
    }

    await registrarLog({
      filaId: fila.id,
      acao: 'SEND_TITLE',
      status: 'SUCESSO',
      mensagem: 'Titulo financeiro enviado ao SIENGE.',
      requestSnapshot: payloadSnapshot,
      responseSnapshot,
      userId: user?.id || null
    });

    return detalharFilaIntegracaoSienge(fila.id);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    const message = String(error?.message || 'Falha tecnica ao enviar titulo ao SIENGE.')
      .trim()
      .slice(0, 4000);

    await fila.update({
      status: 'ERRO',
      ultimo_erro: message,
      atualizado_por: user?.id || null
    });

    await registrarLog({
      filaId: fila.id,
      acao: 'SEND_TITLE',
      status: 'ERRO',
      mensagem: message,
      requestSnapshot: payloadSnapshot,
      responseSnapshot: null,
      userId: user?.id || null
    });

    const wrapped = new Error(message);
    wrapped.statusCode = 502;
    throw wrapped;
  }
}

async function enqueueTituloNaFilaSienge(data, user) {
  const fila = await upsertFilaBase(data, user);
  if (data.processar_agora) {
    return processarFilaInterna(fila.id, { forcar_recriar_payload: data.forcar_recriar_payload }, user);
  }
  return fila;
}

async function reprocessarFilaSienge(id, data, user) {
  return processarFilaInterna(id, { forcar_recriar_payload: data.forcar_recriar_payload }, user);
}

async function obterContextoCredorParceiro(parceiroId) {
  return buildParceiroCredorContext(parceiroId);
}

async function salvarMapeamentoCredorParceiro(parceiroId, data, user) {
  await loadParceiroParaCredor(parceiroId);

  const existente = await loadAnyMapeamento(ENTIDADE_MAPEAMENTO_PARCEIRO, parceiroId);

  if (data.ativo === false) {
    if (!existente) {
      throw new ValidationError('Nao existe mapeamento de credor SIENGE para este parceiro.', 404);
    }

    await existente.update({
      ativo: false,
      metadata_json: Object.prototype.hasOwnProperty.call(data, 'metadata_json')
        ? data.metadata_json
        : existente.metadata_json,
      atualizado_por: user?.id || null
    });

    return buildParceiroCredorContext(parceiroId);
  }

  if (existente) {
    await existente.update({
      external_id: data.external_creditor_id,
      metadata_json: Object.prototype.hasOwnProperty.call(data, 'metadata_json')
        ? data.metadata_json
        : existente.metadata_json,
      ativo: data.ativo === undefined ? true : Boolean(data.ativo),
      atualizado_por: user?.id || null
    });
  } else {
    await IntegracaoSiengeMapeamento.create({
      entidade_tipo: ENTIDADE_MAPEAMENTO_PARCEIRO,
      entidade_id: parceiroId,
      external_id: data.external_creditor_id,
      metadata_json: Object.prototype.hasOwnProperty.call(data, 'metadata_json') ? data.metadata_json : null,
      ativo: data.ativo === undefined ? true : Boolean(data.ativo),
      criado_por: user?.id || null,
      atualizado_por: user?.id || null
    });
  }

  return buildParceiroCredorContext(parceiroId);
}

module.exports = {
  buscarCredorParceiroNoSienge,
  cadastrarCredorParceiroNoSienge,
  detalharFilaIntegracaoSienge,
  enqueueTituloNaFilaSienge,
  listarFilaIntegracaoSienge,
  listarLogsIntegracaoSienge,
  obterConfiguracaoSienge,
  obterContextoCredorParceiro,
  obterSaudeIntegracaoSienge,
  reprocessarFilaSienge,
  salvarConfiguracaoSienge,
  salvarMapeamentoCredorParceiro
};
