import { PLANO_SITUACAO_LABELS } from '../constants/custosRecebiveis';

export default function CrStatusPill({ status, fallback = 'Sem plano' }) {
  const normalized = String(status || '').toUpperCase();
  const label = PLANO_SITUACAO_LABELS[normalized] || fallback;
  return (
    <span className="cr-status-pill" data-status={normalized || 'VAZIO'}>
      {label}
    </span>
  );
}
