export function normalizeTipoToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getDefaultTipoSolicitacaoBehavior() {
  return {
    mostrar_valor: true,
    exige_valor: true,
    mostrar_descricao: true,
    exige_descricao: true,
    mostrar_apropriacao_principal: true,
    exige_apropriacao_principal: true,
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

export function applyTipoSolicitacaoModuleAvailability(behavior, availability = {}) {
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

export function inferLegacyTipoSolicitacaoBehavior(tipo) {
  const token = normalizeTipoToken(tipo?.codigo_interno || tipo?.nome);
  const behavior = getDefaultTipoSolicitacaoBehavior();

  if (['SOLICITACAO_DE_COMPRA', 'OUTROS_ASSUNTOS', 'PEDIDO_DE_CONTRATACAO'].includes(token)) {
    behavior.mostrar_valor = false;
    behavior.exige_valor = false;
  }

  if (token === 'SOLICITACAO_DE_COMPRA') {
    behavior.mostrar_apropriacao_principal = false;
    behavior.exige_apropriacao_principal = false;
  }

  if (token === 'MEDICAO') {
    behavior.exige_descricao = false;
    behavior.mostrar_contrato = true;
    behavior.exige_contrato = true;
    behavior.mostrar_periodo_medicao = true;
    behavior.exige_periodo_medicao = true;
  }

  if (token === 'ADM_LOCAL_DE_OBRA') {
    behavior.mostrar_contrato = true;
    behavior.exige_contrato = true;
    behavior.mostrar_subtipo = true;
    behavior.exige_subtipo = true;
  }

  if (token === 'LOCACAO_DE_MAQ_EQ') {
    behavior.mostrar_contrato = true;
    behavior.exige_contrato = true;
  }

  if (token === 'ABERTURA_DE_CONTRATO') {
    behavior.mostrar_ref_contrato_abertura = true;
    behavior.exige_ref_contrato_abertura = true;
    behavior.mostrar_itens_apropriacao = true;
    behavior.exige_itens_apropriacao = true;
  }

  return behavior;
}

export function getTipoSolicitacaoBehavior(tipo) {
  const legacy = inferLegacyTipoSolicitacaoBehavior(tipo);
  let parsed = null;

  if (tipo?.comportamento && typeof tipo.comportamento === 'object') {
    parsed = tipo.comportamento;
  } else if (typeof tipo?.comportamento === 'string') {
    try {
      parsed = JSON.parse(tipo.comportamento);
    } catch {
      parsed = null;
    }
  }

  return {
    ...getDefaultTipoSolicitacaoBehavior(),
    ...legacy,
    ...(parsed && typeof parsed === 'object' ? parsed : {})
  };
}
