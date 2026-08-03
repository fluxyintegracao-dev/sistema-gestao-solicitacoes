const DRAFT_PREFIX = 'fluxy_compras_draft_v2';
export const COMPRAS_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function buildComprasDraftKey(userId, tipo = 'solicitacao') {
  const usuario = Number(userId || 0) > 0 ? Number(userId) : 'anonimo';
  const escopo = String(tipo || 'solicitacao').trim().toLowerCase();
  return `${DRAFT_PREFIX}:${usuario}:${escopo}`;
}

export function readComprasDraft(key) {
  if (typeof window === 'undefined' || !key) return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;

  try {
    const draft = JSON.parse(raw);
    const expiraEm = Number(draft?.meta?.expira_em || 0);
    if (expiraEm > 0 && expiraEm <= Date.now()) {
      window.localStorage.removeItem(key);
      return null;
    }
    return draft;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

export function writeComprasDraft(key, draft, userId) {
  if (typeof window === 'undefined' || !key || !draft) return;
  const agora = Date.now();
  window.localStorage.setItem(key, JSON.stringify({
    ...draft,
    meta: {
      ...(draft.meta || {}),
      usuario_id: Number(userId || 0) || null,
      salvo_em: agora,
      expira_em: agora + COMPRAS_DRAFT_TTL_MS
    }
  }));
}

export function removeComprasDraft(key) {
  if (typeof window !== 'undefined' && key) {
    window.localStorage.removeItem(key);
  }
}
