import type {
  HistoricoItem,
  ResumoSolicitacoes,
  SolicitacaoDetalhe,
  SolicitacaoListItem
} from '../services/api/types';
import { normalizeCurrencyInput } from './format';
import { isClosedStatus, isPendingStatus } from './status';

const RESPONSAVEL_ACTIONS = new Set(['RESPONSAVEL_ATRIBUIDO', 'RESPONSAVEL_ASSUMIU']);

function normalizeAction(value?: string | null) {
  return String(value || '').trim().toUpperCase();
}

function normalizeTextValue(value?: string | null) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function resolveHistoricoTimestamp(item?: Pick<HistoricoItem, 'createdAt' | 'id'> | null) {
  const createdAt = item?.createdAt ? new Date(item.createdAt).getTime() : 0;
  if (Number.isFinite(createdAt) && createdAt > 0) return createdAt;

  const numericId = Number(item?.id || 0);
  return Number.isFinite(numericId) ? numericId : 0;
}

function findLatestHistorico(
  historicos: HistoricoItem[] | undefined,
  matcher: (item: HistoricoItem) => boolean
) {
  return (historicos || []).reduce<HistoricoItem | null>((latest, current) => {
    if (!matcher(current)) return latest;
    if (!latest) return current;

    return resolveHistoricoTimestamp(current) >= resolveHistoricoTimestamp(latest)
      ? current
      : latest;
  }, null);
}

export function safeParseMetadata(value?: string | null) {
  if (!value) return null;

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function extractAttachmentFromHistorico(item: HistoricoItem) {
  const metadata = safeParseMetadata(item.metadata);
  const path = String(metadata?.caminho || '');

  if (!path) return null;

  return {
    id: item.id,
    path,
    name: item.descricao || `Anexo ${item.id}`,
    createdAt: item.createdAt
  };
}

export function resolveSolicitacaoResponsavel(
  item?: Pick<SolicitacaoDetalhe, 'responsavel' | 'historicos'> | null
) {
  const responsavelAtual = normalizeTextValue(item?.responsavel);
  if (responsavelAtual) return responsavelAtual;

  const historicoResponsavel = findLatestHistorico(item?.historicos, (historico) => (
    RESPONSAVEL_ACTIONS.has(normalizeAction(historico.acao))
  ));

  const metadata = safeParseMetadata(historicoResponsavel?.metadata);
  return (
    normalizeTextValue(
      String(
        metadata?.responsavel_nome ||
        metadata?.ator_nome ||
        historicoResponsavel?.usuario?.nome ||
        ''
      )
    ) ||
    normalizeTextValue(historicoResponsavel?.usuario?.nome)
  );
}

export function resolveSolicitacaoSetorAtual(
  item?: Pick<SolicitacaoDetalhe, 'area_responsavel' | 'historicos' | 'setor_status_atual'> | null
) {
  const setorAtual = normalizeTextValue(item?.setor_status_atual);
  if (setorAtual) return setorAtual;

  const historicoStatus = findLatestHistorico(item?.historicos, (historico) => (
    normalizeAction(historico.acao) === 'STATUS_ALTERADO' &&
    Boolean(normalizeTextValue(historico.setor))
  ));

  return normalizeTextValue(historicoStatus?.setor) || normalizeTextValue(item?.area_responsavel);
}

export function normalizeSolicitacaoListItem<T extends SolicitacaoListItem>(item: T): T {
  const valor = normalizeCurrencyInput(item.valor as string | number | null | undefined);

  return {
    ...item,
    valor: valor ?? null,
    responsavel: resolveSolicitacaoResponsavel(item as T & SolicitacaoDetalhe) ?? null,
    setor_status_atual: resolveSolicitacaoSetorAtual(item as T & SolicitacaoDetalhe) ?? null
  };
}

export function normalizeSolicitacaoDetalhe<T extends SolicitacaoDetalhe>(item: T): T {
  const historicos = Array.isArray(item.historicos) ? item.historicos : [];

  return normalizeSolicitacaoListItem({
    ...item,
    historicos
  });
}

export function matchesSolicitacaoSearch(item: SolicitacaoListItem, term: string) {
  const normalized = String(term || '').trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    item.codigo,
    item.descricao,
    item.obra?.nome,
    item.obra?.codigo,
    item.setor_status_atual || item.area_responsavel,
    item.responsavel,
    item.tipo?.nome
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
}

export function summarizeResumo(data?: ResumoSolicitacoes | null) {
  let total = 0;
  let open = 0;
  let pending = 0;
  let closed = 0;

  Object.values(data || {}).forEach((statuses) => {
    Object.entries(statuses || {}).forEach(([status, amount]) => {
      const count = Number(amount || 0);
      total += count;

      if (isClosedStatus(status)) {
        closed += count;
        return;
      }

      open += count;

      if (isPendingStatus(status)) {
        pending += count;
      }
    });
  });

  return {
    total,
    open,
    pending,
    closed
  };
}
