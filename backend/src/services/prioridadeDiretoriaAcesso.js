const { ConfiguracaoSistema } = require('../models');
const { normalizarClassificacaoObra } = require('./aprovacaoDiretoriaConfig');

const CHAVE_USUARIOS_ACESSO_PRIORIDADE_DIRETORIA = 'USUARIOS_ACESSO_PRIORIDADE_DIRETORIA';
const MODO_ACESSO_TODOS = 'TODOS';
const MODO_ACESSO_DIRETORIAS = 'DIRETORIAS';

function parseJsonOrDefault(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizarUsuarioIds(lista) {
  if (!Array.isArray(lista)) return [];
  return [...new Set(
    lista
      .map((item) => Number(item))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];
}

function normalizarDiretorias(lista) {
  if (!Array.isArray(lista)) return [];
  return [...new Set(
    lista
      .map(normalizarClassificacaoObra)
      .filter(Boolean)
  )];
}

function normalizarAcessoPrioridadeDiretoria(input) {
  if (!input) return null;
  if (input === true) {
    return { modo: MODO_ACESSO_TODOS, diretorias: [] };
  }

  const modo = String(input?.modo || input?.scope || '').trim().toUpperCase();
  if (modo === MODO_ACESSO_TODOS || modo === 'TODAS' || modo === 'ALL') {
    return { modo: MODO_ACESSO_TODOS, diretorias: [] };
  }

  const diretorias = normalizarDiretorias(
    input?.diretorias || input?.classificacoes || input?.classificacoes_operaveis || []
  );
  if (!diretorias.length) return null;

  return {
    modo: MODO_ACESSO_DIRETORIAS,
    diretorias
  };
}

function normalizarMapaUsuariosAcesso(input) {
  const source = input && typeof input === 'object' ? input : {};

  if (source.usuarios && typeof source.usuarios === 'object' && !Array.isArray(source.usuarios)) {
    return Object.entries(source.usuarios).reduce((acc, [usuarioId, acesso]) => {
      const id = Number(usuarioId);
      if (!Number.isInteger(id) || id <= 0) return acc;

      const normalizado = normalizarAcessoPrioridadeDiretoria(acesso);
      if (normalizado) acc[id] = normalizado;
      return acc;
    }, {});
  }

  return normalizarUsuarioIds(source.usuario_ids || input).reduce((acc, usuarioId) => {
    acc[usuarioId] = { modo: MODO_ACESSO_TODOS, diretorias: [] };
    return acc;
  }, {});
}

async function obterUsuariosAcessoPrioridadeDiretoria() {
  const item = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_USUARIOS_ACESSO_PRIORIDADE_DIRETORIA },
    order: [['id', 'DESC']]
  });

  const data = parseJsonOrDefault(item?.valor, { usuarios: {} });
  const usuarios = normalizarMapaUsuariosAcesso(data);
  return {
    usuarios,
    usuario_ids: Object.keys(usuarios).map(Number)
  };
}

async function salvarUsuariosAcessoPrioridadeDiretoria(payload) {
  const usuarios = normalizarMapaUsuariosAcesso(payload);
  const valor = JSON.stringify({ usuarios });

  const existente = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_USUARIOS_ACESSO_PRIORIDADE_DIRETORIA },
    order: [['id', 'DESC']]
  });

  if (existente) {
    await existente.update({ valor });
  } else {
    await ConfiguracaoSistema.create({
      chave: CHAVE_USUARIOS_ACESSO_PRIORIDADE_DIRETORIA,
      valor
    });
  }

  return {
    usuarios,
    usuario_ids: Object.keys(usuarios).map(Number)
  };
}

async function obterAcessoPrioridadeDiretoriaPorUsuario(usuarioId) {
  const id = Number(usuarioId);
  if (!Number.isInteger(id) || id <= 0) return null;

  const { usuarios } = await obterUsuariosAcessoPrioridadeDiretoria();
  return usuarios[id] || null;
}

async function usuarioTemAcessoPrioridadeDiretoria(usuarioId) {
  return Boolean(await obterAcessoPrioridadeDiretoriaPorUsuario(usuarioId));
}

module.exports = {
  CHAVE_USUARIOS_ACESSO_PRIORIDADE_DIRETORIA,
  MODO_ACESSO_DIRETORIAS,
  MODO_ACESSO_TODOS,
  normalizarAcessoPrioridadeDiretoria,
  normalizarDiretorias,
  normalizarMapaUsuariosAcesso,
  normalizarUsuarioIds,
  obterAcessoPrioridadeDiretoriaPorUsuario,
  obterUsuariosAcessoPrioridadeDiretoria,
  salvarUsuariosAcessoPrioridadeDiretoria,
  usuarioTemAcessoPrioridadeDiretoria
};
