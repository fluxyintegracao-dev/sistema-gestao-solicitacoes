const { ConfiguracaoSistema } = require('../models');
const {
  NOTIFICACAO_CONFIG_CHAVE,
  NOTIFICACAO_EVENTOS,
  NOTIFICACAO_EVENTOS_FLAT,
  NOTIFICACAO_EVENTOS_MAP
} = require('../constants/notificacaoEventos');

let cacheConfig = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 30_000;

function parseJsonOrDefault(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizarEventosConfig(input = {}) {
  const origem = input && typeof input === 'object' ? input : {};
  const eventosOrigem = origem.eventos && typeof origem.eventos === 'object'
    ? origem.eventos
    : origem;

  const eventos = {};
  for (const evento of NOTIFICACAO_EVENTOS_FLAT) {
    const configuracao = eventosOrigem[evento.chave];
    const ativo = typeof configuracao === 'object'
      ? configuracao?.ativo
      : configuracao;
    eventos[evento.chave] = {
      ativo: ativo === undefined ? evento.ativo_padrao : Boolean(ativo)
    };
  }

  return { eventos };
}

async function obterConfigBruta() {
  const now = Date.now();
  if (cacheConfig && cacheExpiresAt > now) {
    return cacheConfig;
  }

  const registro = await ConfiguracaoSistema.findOne({
    where: { chave: NOTIFICACAO_CONFIG_CHAVE },
    order: [['id', 'DESC']]
  });
  cacheConfig = normalizarEventosConfig(parseJsonOrDefault(registro?.valor, {}));
  cacheExpiresAt = now + CACHE_TTL_MS;
  return cacheConfig;
}

function limparCacheNotificacoesSistema() {
  cacheConfig = null;
  cacheExpiresAt = 0;
}

function montarPayload(config) {
  const normalizada = normalizarEventosConfig(config);
  const grupos = NOTIFICACAO_EVENTOS.map((grupo) => ({
    modulo: grupo.modulo,
    modulo_label: grupo.modulo_label,
    eventos: grupo.eventos.map(([chave, nome, descricao]) => ({
      chave,
      nome,
      descricao,
      ativo: normalizada.eventos[chave]?.ativo !== false
    }))
  }));

  return {
    chave: NOTIFICACAO_CONFIG_CHAVE,
    grupos,
    eventos: normalizada.eventos
  };
}

async function obterConfiguracaoNotificacoesSistema() {
  const config = await obterConfigBruta();
  return montarPayload(config);
}

async function salvarConfiguracaoNotificacoesSistema(payload = {}) {
  const config = normalizarEventosConfig(payload);
  const valor = JSON.stringify(config);
  const existente = await ConfiguracaoSistema.findOne({
    where: { chave: NOTIFICACAO_CONFIG_CHAVE },
    order: [['id', 'DESC']]
  });

  if (existente) {
    await existente.update({ valor });
  } else {
    await ConfiguracaoSistema.create({ chave: NOTIFICACAO_CONFIG_CHAVE, valor });
  }

  limparCacheNotificacoesSistema();
  return montarPayload(config);
}

async function notificacaoEventoAtivo(tipo) {
  const chave = String(tipo || '').trim().toUpperCase();
  if (!chave) return false;

  const config = await obterConfigBruta();
  if (!NOTIFICACAO_EVENTOS_MAP.has(chave)) {
    return false;
  }

  return config.eventos[chave]?.ativo !== false;
}

async function listarTiposNotificacaoAtivos() {
  const config = await obterConfigBruta();
  return NOTIFICACAO_EVENTOS_FLAT
    .filter((evento) => config.eventos[evento.chave]?.ativo !== false)
    .map((evento) => evento.chave);
}

module.exports = {
  limparCacheNotificacoesSistema,
  listarTiposNotificacaoAtivos,
  notificacaoEventoAtivo,
  obterConfiguracaoNotificacoesSistema,
  salvarConfiguracaoNotificacoesSistema
};
