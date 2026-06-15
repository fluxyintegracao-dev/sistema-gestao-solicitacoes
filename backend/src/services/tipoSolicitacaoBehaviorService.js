function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getDefaultTipoSolicitacaoBehavior() {
  return {
    mostrar_valor: true,
    exige_valor: true,
    mostrar_descricao: true,
    exige_descricao: true,
    mostrar_apropriacao_principal: true,
    exige_apropriacao_principal: false,
    mostrar_contrato: false,
    exige_contrato: false,
    mostrar_subtipo: false,
    exige_subtipo: false,
    mostrar_periodo_medicao: false,
    exige_periodo_medicao: false,
    mostrar_ref_contrato_abertura: false,
    exige_ref_contrato_abertura: false,
    mostrar_itens_apropriacao: false,
    exige_itens_apropriacao: false
  };
}

function applyTipoSolicitacaoModuleAvailability(behavior, availability = {}) {
  const normalized = {
    ...getDefaultTipoSolicitacaoBehavior(),
    ...(behavior && typeof behavior === 'object' ? behavior : {})
  };

  const contratosDisponiveis = availability.contratos !== false;
  const apropriacoesDisponiveis = availability.apropriacoes !== false;

  if (!contratosDisponiveis) {
    normalized.mostrar_contrato = false;
    normalized.exige_contrato = false;
    normalized.mostrar_ref_contrato_abertura = false;
    normalized.exige_ref_contrato_abertura = false;
  }

  if (!apropriacoesDisponiveis) {
    normalized.mostrar_apropriacao_principal = false;
    normalized.exige_apropriacao_principal = false;
    normalized.mostrar_itens_apropriacao = false;
    normalized.exige_itens_apropriacao = false;
  }

  return normalized;
}

function inferLegacyTipoBehavior(tipo) {
  const nome = String(tipo?.nome || '').trim().toUpperCase();
  const nomeNormalizado = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const codigoInterno = normalizeToken(tipo?.codigo_interno || nomeNormalizado);
  const behavior = getDefaultTipoSolicitacaoBehavior();

  if (['SOLICITACAO_DE_COMPRA', 'OUTROS_ASSUNTOS', 'PEDIDO_DE_CONTRATACAO'].includes(codigoInterno)) {
    behavior.mostrar_valor = false;
    behavior.exige_valor = false;
  }

  if (codigoInterno === 'SOLICITACAO_DE_COMPRA') {
    behavior.mostrar_apropriacao_principal = false;
    behavior.exige_apropriacao_principal = false;
  }

  if (codigoInterno === 'MEDICAO') {
    behavior.exige_descricao = false;
    behavior.mostrar_contrato = true;
    behavior.exige_contrato = true;
    behavior.mostrar_periodo_medicao = true;
    behavior.exige_periodo_medicao = true;
  }

  if (codigoInterno === 'ADM_LOCAL_DE_OBRA') {
    behavior.mostrar_contrato = true;
    behavior.exige_contrato = true;
    behavior.mostrar_subtipo = true;
    behavior.exige_subtipo = true;
  }

  if (codigoInterno === 'LOCACAO_DE_MAQ_EQ') {
    behavior.mostrar_contrato = true;
    behavior.exige_contrato = true;
  }

  if (codigoInterno === 'ABERTURA_DE_CONTRATO') {
    behavior.mostrar_ref_contrato_abertura = true;
    behavior.exige_ref_contrato_abertura = true;
    behavior.mostrar_itens_apropriacao = true;
    behavior.exige_itens_apropriacao = true;
  }

  return behavior;
}

function parseTipoBehavior(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeTipoSolicitacaoBehavior(tipo) {
  const base = getDefaultTipoSolicitacaoBehavior();
  const legacy = inferLegacyTipoBehavior(tipo);
  const parsed = parseTipoBehavior(tipo?.comportamento);
  const merged = { ...base, ...legacy };

  if (parsed && typeof parsed === 'object') {
    Object.entries(parsed).forEach(([key, value]) => {
      if (Object.prototype.hasOwnProperty.call(base, key)) {
        merged[key] = Boolean(value);
      }
    });
  }

  return merged;
}

function normalizeTipoSolicitacaoCodigo(value, fallbackName = null) {
  return normalizeToken(value || fallbackName);
}

function serializeTipoSolicitacaoBehavior(value) {
  return JSON.stringify(normalizeTipoSolicitacaoBehavior({ comportamento: value }));
}

function enrichTipoSolicitacao(tipo) {
  if (!tipo) return tipo;
  const plain = typeof tipo.get === 'function' ? tipo.get({ plain: true }) : { ...tipo };
  plain.codigo_interno = normalizeTipoSolicitacaoCodigo(plain.codigo_interno, plain.nome);
  plain.comportamento = normalizeTipoSolicitacaoBehavior(plain);
  return plain;
}

module.exports = {
  applyTipoSolicitacaoModuleAvailability,
  enrichTipoSolicitacao,
  getDefaultTipoSolicitacaoBehavior,
  inferLegacyTipoBehavior,
  normalizeTipoSolicitacaoBehavior,
  normalizeTipoSolicitacaoCodigo,
  serializeTipoSolicitacaoBehavior
};
