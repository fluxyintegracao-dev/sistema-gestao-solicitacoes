const { ConfiguracaoSistema } = require('../models');

const CHAVE_SOLICITACOES_SLA_SETOR = 'SOLICITACOES_SLA_SETOR';

function normalizeSetorToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
}

function normalizeSlaRules(input = {}) {
  const source = input?.setores && typeof input.setores === 'object'
    ? input.setores
    : input;
  const setores = {};

  Object.entries(source || {}).forEach(([setor, regra]) => {
    const key = normalizeSetorToken(setor);
    if (!key) return;

    const rawDias = typeof regra === 'object' ? regra?.dias : regra;
    const dias = Number(rawDias);
    const ativo = typeof regra === 'object' && Object.prototype.hasOwnProperty.call(regra, 'ativo')
      ? Boolean(regra.ativo)
      : true;

    if (!Number.isFinite(dias) || dias <= 0) return;
    setores[key] = {
      dias: Number(dias.toFixed(1)),
      ativo
    };
  });

  return { setores };
}

function parseJsonOrDefault(value, fallback) {
  try {
    return JSON.parse(value || '');
  } catch (error) {
    return fallback;
  }
}

async function obterSlaSolicitacoesPorSetor() {
  const item = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_SOLICITACOES_SLA_SETOR },
    order: [['id', 'DESC']]
  });

  if (!item?.valor) return { setores: {} };
  return normalizeSlaRules(parseJsonOrDefault(item.valor, { setores: {} }));
}

async function salvarSlaSolicitacoesPorSetor(payload = {}) {
  const config = normalizeSlaRules(payload);
  const valor = JSON.stringify(config);
  const existente = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_SOLICITACOES_SLA_SETOR },
    order: [['id', 'DESC']]
  });

  if (existente) {
    await existente.update({ valor });
  } else {
    await ConfiguracaoSistema.create({ chave: CHAVE_SOLICITACOES_SLA_SETOR, valor });
  }

  return config;
}

module.exports = {
  CHAVE_SOLICITACOES_SLA_SETOR,
  normalizeSetorToken,
  normalizeSlaRules,
  obterSlaSolicitacoesPorSetor,
  salvarSlaSolicitacoesPorSetor
};
