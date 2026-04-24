const { ConfiguracaoSistema } = require('../../models');

const CHAVE_TIPOS_COMPARTILHADOS_ENTRE_SETORES = 'TIPOS_COMPARTILHADOS_ENTRE_SETORES';
const CHAVE_AUTOMACAO_STATUS_SETOR = 'AUTOMACAO_STATUS_SETOR';

function parseJsonOrDefault(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizarTokenSetor(valor) {
  const token = String(valor || '').trim().toUpperCase();
  return token || null;
}

function normalizarStatusAutomacao(valor) {
  const status = String(valor || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
  return status || null;
}

function normalizarIdPositivo(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function normalizarTiposCompartilhados(raw = {}) {
  const regras = {};
  Object.entries(raw || {}).forEach(([setorOrigem, tiposRaw]) => {
    const setorOrigemNormalizado = normalizarTokenSetor(setorOrigem);
    if (!setorOrigemNormalizado || !tiposRaw || typeof tiposRaw !== 'object') return;

    const tiposNormalizados = {};
    Object.entries(tiposRaw).forEach(([tipoId, setores]) => {
      const id = normalizarIdPositivo(tipoId);
      if (!id) return;
      const setoresNormalizados = Array.from(
        new Set((Array.isArray(setores) ? setores : []).map(normalizarTokenSetor).filter(Boolean))
      );
      if (setoresNormalizados.length > 0) {
        tiposNormalizados[String(id)] = setoresNormalizados;
      }
    });

    if (Object.keys(tiposNormalizados).length > 0) {
      regras[setorOrigemNormalizado] = tiposNormalizados;
    }
  });
  return regras;
}

function normalizarAutomacoesStatus(raw = []) {
  const regrasPorChave = new Map();
  (Array.isArray(raw) ? raw : []).forEach((item) => {
    const tipoSolicitacaoId = normalizarIdPositivo(item?.tipo_solicitacao_id);
    const status = normalizarStatusAutomacao(item?.status);
    const setorDestino = normalizarTokenSetor(item?.setor_destino);
    if (!tipoSolicitacaoId || !status || !setorDestino) return;
    regrasPorChave.set(`${tipoSolicitacaoId}:${status}`, {
      tipo_solicitacao_id: tipoSolicitacaoId,
      status,
      setor_destino: setorDestino
    });
  });
  return Array.from(regrasPorChave.values()).sort((a, b) => {
    if (a.tipo_solicitacao_id !== b.tipo_solicitacao_id) {
      return a.tipo_solicitacao_id - b.tipo_solicitacao_id;
    }
    return String(a.status).localeCompare(String(b.status), 'pt-BR');
  });
}

async function lerConfiguracaoJson(chave, fallback) {
  const item = await ConfiguracaoSistema.findOne({
    where: { chave },
    order: [['id', 'DESC']]
  });
  return parseJsonOrDefault(item?.valor, fallback);
}

async function obterConfiguracaoTiposCompartilhados() {
  const data = await lerConfiguracaoJson(CHAVE_TIPOS_COMPARTILHADOS_ENTRE_SETORES, { regras: {} });
  return normalizarTiposCompartilhados(data?.regras);
}

async function obterConfiguracaoAutomacaoStatusSetor() {
  const data = await lerConfiguracaoJson(CHAVE_AUTOMACAO_STATUS_SETOR, { regras: [] });
  return normalizarAutomacoesStatus(data?.regras);
}

function obterTiposCompartilhadosParaTokens(tokensSetor = [], regras = {}) {
  const tokens = Array.from(
    new Set((Array.isArray(tokensSetor) ? tokensSetor : []).map(normalizarTokenSetor).filter(Boolean))
  );
  if (tokens.length === 0) return [];

  const compartilhamentos = [];
  Object.entries(regras || {}).forEach(([setorOrigem, tipos]) => {
    const tipoIds = Object.entries(tipos || {})
      .filter(([, setores]) => {
        const lista = Array.isArray(setores) ? setores : [];
        return lista.some((setor) => tokens.includes(normalizarTokenSetor(setor)));
      })
      .map(([tipoId]) => Number(tipoId))
      .filter((tipoId) => Number.isInteger(tipoId) && tipoId > 0);
    if (tipoIds.length > 0) {
      compartilhamentos.push({
        setor_origem: normalizarTokenSetor(setorOrigem),
        tipos: tipoIds
      });
    }
  });
  return compartilhamentos;
}

function obterAutomacaoStatusCorrespondente({ tipoSolicitacaoId, status, regras = [] }) {
  const tipoId = normalizarIdPositivo(tipoSolicitacaoId);
  const statusNormalizado = normalizarStatusAutomacao(status);
  if (!tipoId || !statusNormalizado) return null;
  return (Array.isArray(regras) ? regras : []).find((regra) => (
    Number(regra?.tipo_solicitacao_id) === tipoId &&
    normalizarStatusAutomacao(regra?.status) === statusNormalizado
  )) || null;
}

module.exports = {
  CHAVE_TIPOS_COMPARTILHADOS_ENTRE_SETORES,
  CHAVE_AUTOMACAO_STATUS_SETOR,
  normalizarTokenSetor,
  normalizarStatusAutomacao,
  normalizarTiposCompartilhados,
  normalizarAutomacoesStatus,
  obterConfiguracaoTiposCompartilhados,
  obterConfiguracaoAutomacaoStatusSetor,
  obterTiposCompartilhadosParaTokens,
  obterAutomacaoStatusCorrespondente
};
