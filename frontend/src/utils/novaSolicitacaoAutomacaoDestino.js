export const DESTINO_NOVA_SOLICITACAO_COMPRA = 'SOLICITACAO_COMPRA';

export function normalizarAreaAutomacaoDestino(value) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function normalizarTipoKey(value) {
  return String(value || '').trim();
}

function normalizarBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return Boolean(fallback);
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'sim', 's', 'ativo'].includes(normalized)) return true;
  if (['false', '0', 'nao', 'n', 'inativo'].includes(normalized)) return false;
  return Boolean(fallback);
}

function normalizarRegraDestino(raw, destinosDisponiveis = []) {
  const destinoId = String(raw?.destino || raw?.destino_id || '').trim().toUpperCase();
  const destino = destinosDisponiveis.find((item) => item.id === destinoId);
  if (!destino) return null;

  return {
    ativo: normalizarBoolean(raw?.ativo, true),
    destino: destino.id,
    rota: destino.rota || raw?.rota || '',
    preservar_obra: normalizarBoolean(raw?.preservar_obra, true),
    preservar_solicitante: normalizarBoolean(raw?.preservar_solicitante, true)
  };
}

export function normalizarConfigAutomacaoDestinoNovaSolicitacao(config) {
  const destinosDisponiveis = Array.isArray(config?.destinos_disponiveis)
    ? config.destinos_disponiveis
    : [];
  const regrasRaw = config?.regras && typeof config.regras === 'object' ? config.regras : {};
  const regras = {};

  Object.entries(regrasRaw).forEach(([area, regraArea]) => {
    const areaKey = normalizarAreaAutomacaoDestino(area);
    if (!areaKey || !regraArea?.tipos || typeof regraArea.tipos !== 'object') return;

    const tipos = {};
    Object.entries(regraArea.tipos).forEach(([tipoId, regraTipo]) => {
      const tipoKey = normalizarTipoKey(tipoId);
      if (!tipoKey) return;
      const regra = normalizarRegraDestino(regraTipo, destinosDisponiveis);
      if (regra) {
        tipos[tipoKey] = regra;
      }
    });

    if (Object.keys(tipos).length > 0) {
      regras[areaKey] = { tipos };
    }
  });

  return { destinos_disponiveis: destinosDisponiveis, regras };
}

export function obterRegraAutomacaoDestinoNovaSolicitacao(config, areaResponsavel, tipoId) {
  const areaKey = normalizarAreaAutomacaoDestino(areaResponsavel);
  const tipoKey = normalizarTipoKey(tipoId);
  const regra = config?.regras?.[areaKey]?.tipos?.[tipoKey] || null;
  if (!regra?.ativo || !regra?.rota) return null;
  return regra;
}
