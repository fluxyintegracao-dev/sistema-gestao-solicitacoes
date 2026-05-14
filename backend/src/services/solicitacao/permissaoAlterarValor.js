const { ConfiguracaoSistema } = require('../../models');

const CHAVE_USUARIOS_ALTERAR_VALOR_SOLICITACAO = 'USUARIOS_ALTERAR_VALOR_SOLICITACAO';

function parseJsonOrDefault(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizarUsuarioIds(lista) {
  return Array.from(
    new Set((Array.isArray(lista) ? lista : [])
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0))
  );
}

async function obterConfiguracaoUsuariosAlterarValorSolicitacao() {
  const item = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_USUARIOS_ALTERAR_VALOR_SOLICITACAO },
    order: [['id', 'DESC']]
  });

  const parsed = parseJsonOrDefault(item?.valor, {});
  return {
    usuario_ids: normalizarUsuarioIds(parsed?.usuario_ids)
  };
}

async function salvarUsuariosAlterarValorSolicitacao(usuarioIds) {
  const payload = {
    usuario_ids: normalizarUsuarioIds(usuarioIds)
  };
  const valor = JSON.stringify(payload);
  const item = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_USUARIOS_ALTERAR_VALOR_SOLICITACAO },
    order: [['id', 'DESC']]
  });

  if (item) {
    await item.update({ valor });
  } else {
    await ConfiguracaoSistema.create({
      chave: CHAVE_USUARIOS_ALTERAR_VALOR_SOLICITACAO,
      valor
    });
  }

  return payload;
}

async function usuarioPodeAlterarValorSolicitacao(usuarioId) {
  const id = Number(usuarioId);
  if (!Number.isInteger(id) || id <= 0) return false;

  const { usuario_ids } = await obterConfiguracaoUsuariosAlterarValorSolicitacao();
  return usuario_ids.includes(id);
}

module.exports = {
  CHAVE_USUARIOS_ALTERAR_VALOR_SOLICITACAO,
  normalizarUsuarioIds,
  obterConfiguracaoUsuariosAlterarValorSolicitacao,
  salvarUsuariosAlterarValorSolicitacao,
  usuarioPodeAlterarValorSolicitacao
};
