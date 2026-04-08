export function normalizeProvisionamentoStatus(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

export function formatProvisionamentoStatus(value?: string | null) {
  return String(value || '-')
    .replace(/_/g, ' ')
    .toUpperCase();
}

export function formatProvisionamentoPrioridade(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '-';

  const labels: Record<string, string> = {
    baixa: 'Baixa',
    media: 'Media',
    alta: 'Alta',
    critica: 'Critica'
  };

  return labels[normalized] || value || '-';
}

export function canEditarProvisionamento({
  isSuperadmin,
  status
}: {
  isSuperadmin: boolean;
  status?: string | null;
}) {
  if (!isSuperadmin) return false;
  return !['aprovado', 'cancelado', 'realizado'].includes(normalizeProvisionamentoStatus(status));
}

export function canGerenciarStatusManualProvisionamento({
  canApprove,
  status
}: {
  canApprove: boolean;
  status?: string | null;
}) {
  if (!canApprove) return false;
  return !['aprovado', 'cancelado', 'realizado'].includes(normalizeProvisionamentoStatus(status));
}

export function canAprovarProvisionamento({
  canApprove,
  status
}: {
  canApprove: boolean;
  status?: string | null;
}) {
  return canApprove && normalizeProvisionamentoStatus(status) === 'em_analise';
}

export function canCancelarProvisionamento({
  canApprove,
  isSuperadmin,
  status
}: {
  canApprove: boolean;
  isSuperadmin: boolean;
  status?: string | null;
}) {
  const normalized = normalizeProvisionamentoStatus(status);
  if (!canApprove) return false;
  if (['previsto', 'em_analise'].includes(normalized)) return true;
  return isSuperadmin && normalized === 'aprovado';
}

export function canRealizarProvisionamento({
  canApprove,
  status
}: {
  canApprove: boolean;
  status?: string | null;
}) {
  return canApprove && normalizeProvisionamentoStatus(status) === 'aprovado';
}
