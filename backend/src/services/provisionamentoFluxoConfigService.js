const { ConfiguracaoSistema } = require('../models');

const CHAVE_PROVISIONAMENTO_FLUXO = 'PROVISIONAMENTO_FLUXO_CONFIG';

const MODOS_PROVISIONAMENTO = ['INFORMATIVO', 'CONTROLADO', 'INTEGRADO'];

const PROVISIONAMENTO_FLUXO_PADRAO = {
  modo_operacional: 'INFORMATIVO',
  aprovacao_ativa: false,
  controle_vencimento_ativo: false,
  integracao_solicitacoes_ativa: false,
  exigir_provisao_na_solicitacao: false,
  bloquear_solicitacao_sem_provisao: false,
  validar_saldo_provisao: false,
  somente_provisoes_aprovadas: false,
  permitir_multiplas_provisoes_por_solicitacao: true,
  tipos_solicitacao_exigem_provisao: []
};

function parseJson(value) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function normalizarBoolean(value, padrao = false) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return padrao;

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'sim', 's', 'ativo'].includes(normalized)) return true;
  if (['false', '0', 'nao', 'n', 'inativo'].includes(normalized)) return false;
  return padrao;
}

function normalizarIdList(lista) {
  if (!Array.isArray(lista)) return [];
  return [...new Set(
    lista
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0)
  )];
}

function normalizarModo(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return MODOS_PROVISIONAMENTO.includes(normalized)
    ? normalized
    : PROVISIONAMENTO_FLUXO_PADRAO.modo_operacional;
}

function normalizarProvisionamentoFluxoConfig(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const config = {
    modo_operacional: normalizarModo(source.modo_operacional),
    aprovacao_ativa: normalizarBoolean(source.aprovacao_ativa, PROVISIONAMENTO_FLUXO_PADRAO.aprovacao_ativa),
    controle_vencimento_ativo: normalizarBoolean(source.controle_vencimento_ativo, PROVISIONAMENTO_FLUXO_PADRAO.controle_vencimento_ativo),
    integracao_solicitacoes_ativa: normalizarBoolean(source.integracao_solicitacoes_ativa, PROVISIONAMENTO_FLUXO_PADRAO.integracao_solicitacoes_ativa),
    exigir_provisao_na_solicitacao: normalizarBoolean(source.exigir_provisao_na_solicitacao, PROVISIONAMENTO_FLUXO_PADRAO.exigir_provisao_na_solicitacao),
    bloquear_solicitacao_sem_provisao: normalizarBoolean(source.bloquear_solicitacao_sem_provisao, PROVISIONAMENTO_FLUXO_PADRAO.bloquear_solicitacao_sem_provisao),
    validar_saldo_provisao: normalizarBoolean(source.validar_saldo_provisao, PROVISIONAMENTO_FLUXO_PADRAO.validar_saldo_provisao),
    somente_provisoes_aprovadas: normalizarBoolean(source.somente_provisoes_aprovadas, PROVISIONAMENTO_FLUXO_PADRAO.somente_provisoes_aprovadas),
    permitir_multiplas_provisoes_por_solicitacao: normalizarBoolean(
      source.permitir_multiplas_provisoes_por_solicitacao,
      PROVISIONAMENTO_FLUXO_PADRAO.permitir_multiplas_provisoes_por_solicitacao
    ),
    tipos_solicitacao_exigem_provisao: normalizarIdList(source.tipos_solicitacao_exigem_provisao)
  };

  if (config.modo_operacional === 'INFORMATIVO') {
    config.aprovacao_ativa = false;
    config.controle_vencimento_ativo = false;
    config.integracao_solicitacoes_ativa = false;
    config.exigir_provisao_na_solicitacao = false;
    config.bloquear_solicitacao_sem_provisao = false;
    config.validar_saldo_provisao = false;
    config.somente_provisoes_aprovadas = false;
  }

  if (config.modo_operacional === 'CONTROLADO') {
    config.integracao_solicitacoes_ativa = false;
    config.exigir_provisao_na_solicitacao = false;
    config.bloquear_solicitacao_sem_provisao = false;
  }

  if (!config.integracao_solicitacoes_ativa) {
    config.exigir_provisao_na_solicitacao = false;
    config.bloquear_solicitacao_sem_provisao = false;
  }

  return config;
}

async function obterProvisionamentoFluxoConfig() {
  const item = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_PROVISIONAMENTO_FLUXO },
    order: [['id', 'DESC']]
  });

  return normalizarProvisionamentoFluxoConfig({
    ...PROVISIONAMENTO_FLUXO_PADRAO,
    ...parseJson(item?.valor)
  });
}

async function salvarProvisionamentoFluxoConfig(payload = {}) {
  const config = normalizarProvisionamentoFluxoConfig({
    ...PROVISIONAMENTO_FLUXO_PADRAO,
    ...payload
  });
  const valor = JSON.stringify(config);

  const existente = await ConfiguracaoSistema.findOne({
    where: { chave: CHAVE_PROVISIONAMENTO_FLUXO },
    order: [['id', 'DESC']]
  });

  if (existente) {
    await existente.update({ valor });
  } else {
    await ConfiguracaoSistema.create({ chave: CHAVE_PROVISIONAMENTO_FLUXO, valor });
  }

  return config;
}

module.exports = {
  CHAVE_PROVISIONAMENTO_FLUXO,
  MODOS_PROVISIONAMENTO,
  PROVISIONAMENTO_FLUXO_PADRAO,
  normalizarProvisionamentoFluxoConfig,
  obterProvisionamentoFluxoConfig,
  salvarProvisionamentoFluxoConfig
};
