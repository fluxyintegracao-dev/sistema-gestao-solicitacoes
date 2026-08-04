const DRAFT_PREFIX = 'fluxy_cr_planning_draft_v1';
export const PLANNING_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function buildPlanningDraftKey(userId, obraId, competencia, section) {
  const usuario = Number(userId || 0);
  const obra = Number(obraId || 0);
  const period = String(competencia || '').trim();
  const scope = String(section || '').trim().toLowerCase();
  if (!usuario || !obra || !/^\d{4}-\d{2}$/.test(period) || !scope) return '';
  return `${DRAFT_PREFIX}:${usuario}:${obra}:${period}:${scope}`;
}

export function readPlanningDraft(key, planVersion) {
  if (typeof window === 'undefined' || !key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    const expiresAt = Number(draft?.meta?.expira_em || 0);
    const savedPlanVersion = Number(draft?.meta?.plano_versao || 0);
    if (
      (expiresAt > 0 && expiresAt <= Date.now())
      || (Number(planVersion || 0) > 0 && savedPlanVersion !== Number(planVersion))
    ) {
      window.localStorage.removeItem(key);
      return null;
    }
    return draft;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function writePlanningDraft(key, payload, metadata = {}) {
  if (typeof window === 'undefined' || !key || !payload) return false;
  try {
    const now = Date.now();
    window.localStorage.setItem(key, JSON.stringify({
      ...payload,
      meta: {
        usuario_id: Number(metadata.userId || 0) || null,
        obra_id: Number(metadata.obraId || 0) || null,
        competencia: metadata.competencia || null,
        plano_versao: Number(metadata.planVersion || 0) || null,
        etapa: Number(metadata.step || 1),
        salvo_em: now,
        expira_em: now + PLANNING_DRAFT_TTL_MS
      }
    }));
    return true;
  } catch {
    return false;
  }
}

export function removePlanningDraft(key) {
  if (typeof window === 'undefined' || !key) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // O navegador pode bloquear armazenamento local em perfis corporativos restritos.
  }
}

export function hasPlanningDraft(keys = []) {
  if (typeof window === 'undefined') return false;
  try {
    return keys.some((key) => key && window.localStorage.getItem(key));
  } catch {
    return false;
  }
}
