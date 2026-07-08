const { ConfiguracaoSistema, Setor } = require('../models');

const CHAVE_SETORES_VISIVEIS_POR_USUARIO = 'SETORES_VISIVEIS_POR_USUARIO';

function normalizarToken(valor) {
  return String(valor || '').trim().toUpperCase();
}

function parseJsonOrDefault(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function extrairRegrasRaw(config) {
  if (!config || typeof config !== 'object') return {};
  if (Array.isArray(config.regras)) {
    return extrairRegrasRaw(config.regras);
  }
  if (config.regras && typeof config.regras === 'object' && !Array.isArray(config.regras)) {
    return config.regras;
  }
  if (Array.isArray(config.usuarios)) {
    return extrairRegrasRaw(config.usuarios);
  }
  if (config.usuarios && typeof config.usuarios === 'object' && !Array.isArray(config.usuarios)) {
    return config.usuarios;
  }
  if (Array.isArray(config)) {
    return config.reduce((acc, item) => {
      const usuarioId = item?.usuario_id ?? item?.usuarioId ?? item?.user_id ?? item?.id;
      const setores = item?.setores ?? item?.setores_visiveis ?? item?.codigos ?? item?.areas;
      const key = String(usuarioId || '').trim();
      if (key) acc[key] = setores;
      return acc;
    }, {});
  }
  return config;
}

async function carregarMapaSetores() {
  const setores = await Setor.findAll({
    attributes: ['id', 'nome', 'codigo'],
    raw: true
  });

  const mapa = new Map();
  setores.forEach((setor) => {
    const codigo = normalizarToken(setor.codigo || setor.nome || setor.id);
    if (!codigo) return;

    [
      setor.codigo,
      setor.nome,
      setor.id,
      normalizarToken(setor.nome).replace(/\s+/g, '_'),
      normalizarToken(setor.nome).replace(/\s+/g, '')
    ].forEach((alias) => {
      const token = normalizarToken(alias);
      if (token) mapa.set(token, codigo);
    });
  });

  return mapa;
}

function normalizarListaSetores(lista, mapaSetores = new Map()) {
  if (!Array.isArray(lista)) return [];
  return [...new Set(
    lista
      .map((item) => {
        const token = normalizarToken(item);
        return mapaSetores.get(token) || token;
      })
      .filter(Boolean)
  )];
}

function normalizarRegrasSetoresVisiveis(config, mapaSetores = new Map()) {
  const regrasRaw = extrairRegrasRaw(config);
  const regras = {};

  Object.entries(regrasRaw || {}).forEach(([usuarioId, setores]) => {
    const key = String(usuarioId || '').trim();
    if (!key) return;
    regras[key] = normalizarListaSetores(setores, mapaSetores);
  });

  return regras;
}

async function obterRegrasSetoresVisiveisPorUsuario() {
  const item = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_SETORES_VISIVEIS_POR_USUARIO },
    order: [['id', 'DESC']]
  });

  const mapaSetores = await carregarMapaSetores();
  const config = parseJsonOrDefault(item?.valor, { regras: {} });
  return normalizarRegrasSetoresVisiveis(config, mapaSetores);
}

async function obterSetoresVisiveisUsuario(usuarioId) {
  const regras = await obterRegrasSetoresVisiveisPorUsuario();
  return regras[String(usuarioId || '').trim()] || [];
}

async function normalizarPayloadSetoresVisiveis(payload) {
  const mapaSetores = await carregarMapaSetores();
  return normalizarRegrasSetoresVisiveis(payload, mapaSetores);
}

module.exports = {
  CHAVE_SETORES_VISIVEIS_POR_USUARIO,
  obterRegrasSetoresVisiveisPorUsuario,
  obterSetoresVisiveisUsuario,
  normalizarPayloadSetoresVisiveis
};
