const { ConfiguracaoSistema } = require('../models');

const CHAVE_NOVA_SOLICITACAO_AUTOMACAO_DESTINO = 'NOVA_SOLICITACAO_AUTOMACAO_DESTINO';

const DESTINOS_NOVA_SOLICITACAO = [
  {
    id: 'SOLICITACAO_COMPRA',
    label: 'Nova Solicitacao de Compra',
    rota: '/solicitacoes-compra/nova',
    descricao: 'Redireciona para o modulo de compras mantendo a obra e o solicitante logado.'
  }
];

function parseJsonOrDefault(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function boolOrDefault(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return Boolean(fallback);
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'sim', 's', 'ativo'].includes(normalized)) return true;
  if (['false', '0', 'nao', 'n', 'inativo'].includes(normalized)) return false;
  return Boolean(fallback);
}

function normalizarAreaKey(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function normalizarTipoKey(value) {
  return String(value || '').trim();
}

function obterDestinoPadrao(destinoId) {
  return DESTINOS_NOVA_SOLICITACAO.find((destino) => destino.id === destinoId) || null;
}

function normalizarRegraDestino(raw) {
  const destinoId = String(raw?.destino || raw?.destino_id || '').trim().toUpperCase();
  const destinoPadrao = obterDestinoPadrao(destinoId);
  if (!destinoPadrao) return null;

  return {
    ativo: boolOrDefault(raw?.ativo, true),
    destino: destinoPadrao.id,
    rota: destinoPadrao.rota,
    preservar_obra: boolOrDefault(raw?.preservar_obra, true),
    preservar_solicitante: boolOrDefault(raw?.preservar_solicitante, true)
  };
}

function normalizarConfigAutomacaoDestino(raw) {
  const regrasRaw = raw?.regras && typeof raw.regras === 'object' ? raw.regras : {};
  const regras = {};

  Object.entries(regrasRaw).forEach(([area, regraArea]) => {
    const areaKey = normalizarAreaKey(area);
    if (!areaKey || !regraArea?.tipos || typeof regraArea.tipos !== 'object') return;

    const tipos = {};
    Object.entries(regraArea.tipos).forEach(([tipoId, regraTipo]) => {
      const tipoKey = normalizarTipoKey(tipoId);
      if (!tipoKey) return;
      const regra = normalizarRegraDestino(regraTipo);
      if (regra) {
        tipos[tipoKey] = regra;
      }
    });

    if (Object.keys(tipos).length > 0) {
      regras[areaKey] = { tipos };
    }
  });

  return { regras };
}

function obterRegraAutomacaoDestino(config, areaResponsavel, tipoId) {
  const areaKey = normalizarAreaKey(areaResponsavel);
  const tipoKey = normalizarTipoKey(tipoId);
  return config?.regras?.[areaKey]?.tipos?.[tipoKey] || null;
}

async function obterConfigAutomacaoDestinoNovaSolicitacao() {
  const item = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_NOVA_SOLICITACAO_AUTOMACAO_DESTINO },
    order: [['id', 'DESC']]
  });

  return normalizarConfigAutomacaoDestino(parseJsonOrDefault(item?.valor, { regras: {} }));
}

async function salvarConfigAutomacaoDestinoNovaSolicitacao(payload) {
  const config = normalizarConfigAutomacaoDestino(payload);
  const valor = JSON.stringify(config);
  const existente = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_NOVA_SOLICITACAO_AUTOMACAO_DESTINO },
    order: [['id', 'DESC']]
  });

  if (existente) {
    await existente.update({ valor });
  } else {
    await ConfiguracaoSistema.create({
      chave: CHAVE_NOVA_SOLICITACAO_AUTOMACAO_DESTINO,
      valor
    });
  }

  return config;
}

function montarPayloadAutomacaoDestino(config) {
  return {
    destinos_disponiveis: DESTINOS_NOVA_SOLICITACAO,
    regras: normalizarConfigAutomacaoDestino(config).regras
  };
}

module.exports = {
  CHAVE_NOVA_SOLICITACAO_AUTOMACAO_DESTINO,
  DESTINOS_NOVA_SOLICITACAO,
  montarPayloadAutomacaoDestino,
  obterConfigAutomacaoDestinoNovaSolicitacao,
  obterRegraAutomacaoDestino,
  salvarConfigAutomacaoDestinoNovaSolicitacao
};
