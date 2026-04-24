const { ConfiguracaoSistema } = require('../models');

const CHAVE_USUARIOS_ACESSO_PRIORIDADE_DIRETORIA = 'USUARIOS_ACESSO_PRIORIDADE_DIRETORIA';

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

async function obterUsuariosAcessoPrioridadeDiretoria() {
  const item = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_USUARIOS_ACESSO_PRIORIDADE_DIRETORIA },
    order: [['id', 'DESC']]
  });

  const data = parseJsonOrDefault(item?.valor, { usuario_ids: [] });
  return {
    usuario_ids: normalizarUsuarioIds(data?.usuario_ids)
  };
}

async function salvarUsuariosAcessoPrioridadeDiretoria(usuarioIds) {
  const payload = {
    usuario_ids: normalizarUsuarioIds(usuarioIds)
  };
  const valor = JSON.stringify(payload);

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

  return payload;
}

async function usuarioTemAcessoPrioridadeDiretoria(usuarioId) {
  const id = Number(usuarioId);
  if (!Number.isInteger(id) || id <= 0) return false;

  const { usuario_ids } = await obterUsuariosAcessoPrioridadeDiretoria();
  return usuario_ids.includes(id);
}

module.exports = {
  CHAVE_USUARIOS_ACESSO_PRIORIDADE_DIRETORIA,
  normalizarUsuarioIds,
  obterUsuariosAcessoPrioridadeDiretoria,
  salvarUsuariosAcessoPrioridadeDiretoria,
  usuarioTemAcessoPrioridadeDiretoria
};
