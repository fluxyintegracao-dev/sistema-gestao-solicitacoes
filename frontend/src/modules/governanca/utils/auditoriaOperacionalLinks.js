function numericResourceId(event) {
  const value = String(event?.recurso_id || '');
  return /^\d{1,18}$/.test(value) ? value : null;
}

export function buildAuditedRecordLink(event) {
  const id = numericResourceId(event);
  if (!id) return null;

  const route = String(event?.rota_padrao || event?.metadata?.rota || '')
    .replace(/^\/api(?=\/|$)/i, '')
    .toLowerCase();

  if (route.includes('/financeiro/titulos')) return `/financeiro/titulos/${id}`;
  if (route.includes('/solicitacoes-compra') || route.includes('/compras/solicitacoes')) return `/solicitacoes-compra/${id}`;
  if (route.includes('/pedidos-compra') || route.includes('/compras/pedidos')) return `/pedidos-compra/${id}`;
  if (/^\/solicitacoes(?:\/|$)/.test(route)) return `/solicitacoes/${id}`;
  if (/^\/usuarios(?:\/|$)/.test(route)) return `/usuarios/${id}`;
  if (/^\/obras(?:\/|$)/.test(route)) return `/obras/${id}`;
  if (/^\/provisoes-financeiras(?:\/|$)/.test(route)) return `/provisoes-financeiras/${id}`;
  if (/^\/fiscal\/documentos(?:\/|$)/.test(route)) return `/fiscal/documentos/${id}`;
  return null;
}
