function numericResourceId(event) {
  const value = String(event?.recurso_id || '');
  return /^\d{1,18}$/.test(value) ? value : null;
}

function normalizedEventRoute(event) {
  return String(event?.rota_padrao || event?.metadata?.rota || '')
    .split('?')[0]
    .replace(/^\/api(?=\/|$)/i, '')
    .replace(/\/+$/, '')
    .toLowerCase() || '/';
}

function safePageLink(event, route, id) {
  if (event?.tipo_evento !== 'PAGE_VIEW') return null;
  if (!/^\/[a-z0-9/_:-]*$/i.test(route) || route.includes('..') || /:(?:uuid|token)/.test(route)) return null;
  const resolved = id ? route.replace(/:id(?=\/|$)/, id) : route;
  return resolved.includes(':') ? null : resolved;
}

export function buildAuditedRecordLink(event) {
  const id = numericResourceId(event);
  const route = normalizedEventRoute(event);
  const pageLink = safePageLink(event, route, id);
  if (pageLink) return pageLink;
  if (!id) return null;
  const resourceType = String(event?.recurso_tipo || '').toLowerCase();

  if (route.includes('/financeiro/titulos') || resourceType.includes('financeiro.titulos')) return `/financeiro/titulos/${id}`;
  if (route.includes('/solicitacoes-compra') || route.includes('/compras/solicitacoes') || resourceType.includes('solicitacoes-compra')) return `/solicitacoes-compra/${id}`;
  if (route.includes('/pedidos-compra') || route.includes('/compras/pedidos') || resourceType.includes('pedidos-compra')) return `/pedidos-compra/${id}`;
  if (/^\/solicitacoes(?:\/|$)/.test(route) || resourceType === 'solicitacoes') return `/solicitacoes/${id}`;
  if (/^\/usuarios(?:\/|$)/.test(route) || resourceType === 'usuarios') return `/usuarios/${id}`;
  if (/^\/obras(?:\/|$)/.test(route) || resourceType === 'obras') return `/obras/${id}`;
  if (/^\/provisoes-financeiras(?:\/|$)/.test(route)) return `/provisoes-financeiras/${id}`;
  if (/^\/fiscal\/documentos(?:\/|$)/.test(route)) return `/fiscal/documentos/${id}`;
  return null;
}
