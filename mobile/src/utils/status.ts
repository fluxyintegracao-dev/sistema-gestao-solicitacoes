import { colors } from '../theme';

export function normalizeStatus(value?: string | null) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isClosedStatus(value?: string | null) {
  const normalized = normalizeStatus(value);
  return ['CONCLUIDO', 'CONCLUIDA', 'FINALIZADO', 'FINALIZADA', 'ATENDIDO', 'ATENDIDA', 'ARQUIVADO', 'ARQUIVADA', 'CANCELADO', 'CANCELADA'].includes(normalized);
}

export function isPendingStatus(value?: string | null) {
  const normalized = normalizeStatus(value);
  return normalized.includes('PEND') || normalized.includes('AGUARD') || normalized.includes('AJUST');
}

export function getStatusTone(value?: string | null) {
  const normalized = normalizeStatus(value);

  if (isClosedStatus(normalized)) {
    return {
      backgroundColor: colors.successSoft,
      textColor: colors.success
    };
  }

  if (normalized.includes('CANCEL') || normalized.includes('REPROV')) {
    return {
      backgroundColor: colors.dangerSoft,
      textColor: colors.danger
    };
  }

  if (isPendingStatus(normalized)) {
    return {
      backgroundColor: colors.warningSoft,
      textColor: colors.warning
    };
  }

  return {
    backgroundColor: colors.infoSoft,
    textColor: colors.info
  };
}
