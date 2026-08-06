import { HiOutlineCalendarDays, HiOutlineChevronDown } from 'react-icons/hi2';

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
});

function normalizeMonth(value) {
  return /^\d{4}-\d{2}$/.test(String(value || '')) ? String(value) : null;
}

function shiftMonth(value, offset) {
  const normalized = normalizeMonth(value);
  if (!normalized) return null;
  const [year, month] = normalized.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(value) {
  const normalized = normalizeMonth(value);
  if (!normalized) return value || '—';
  const [year, month] = normalized.split('-').map(Number);
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

function availableMonths(reference, selected) {
  const months = Array.from({ length: 6 }, (_, index) => shiftMonth(reference, -index));
  return [...new Set([...months, ...selected].filter(Boolean))].sort().reverse();
}

function monthsBetween(startValue, endValue) {
  const start = normalizeMonth(startValue);
  const end = normalizeMonth(endValue);
  if (!start || !end || start > end) return [];
  const result = [];
  let cursor = start;
  while (cursor <= end && result.length < 12) {
    result.push(cursor);
    cursor = shiftMonth(cursor, 1);
  }
  return result;
}

export default function CrExecutiveFilters({
  obras,
  obraId,
  classificacao,
  competenciaReferencia,
  competencias,
  onObraChange,
  onClassificacaoChange,
  onCompetenciaReferenciaChange,
  onCompetenciasChange,
  operational = false,
  onPeriodChange
}) {
  const selectedMonths = [...new Set(competencias.filter(normalizeMonth))].sort().reverse();
  const monthOptions = availableMonths(competenciaReferencia, selectedMonths);
  const filteredWorks = obras.filter((obra) => (
    !classificacao || String(obra.classificacao || '').toUpperCase() === classificacao
  ));
  const selectedWork = obras.find((obra) => Number(obra.id) === Number(obraId)) || null;
  const competenceLabel = selectedMonths.length === 1
    ? monthLabel(selectedMonths[0])
    : `${selectedMonths.length} competências selecionadas`;
  const ascendingMonths = [...selectedMonths].sort();
  const periodStart = ascendingMonths[0] || competenciaReferencia;
  const periodEnd = ascendingMonths.at(-1) || competenciaReferencia;

  function toggleMonth(value) {
    const exists = selectedMonths.includes(value);
    if (exists && selectedMonths.length === 1) return;
    const next = exists
      ? selectedMonths.filter((item) => item !== value)
      : [...selectedMonths, value];
    onCompetenciasChange(next.sort().reverse());
  }

  function changeClassification(value) {
    onClassificacaoChange(value);
    if (
      selectedWork
      && value
      && String(selectedWork.classificacao || '').toUpperCase() !== value
    ) {
      onObraChange('');
    }
  }

  function changePeriod(start, end) {
    const values = monthsBetween(start, end);
    if (!values.length) return;
    if (onPeriodChange) onPeriodChange(values[0], values.at(-1), values);
    else onCompetenciasChange(values);
  }

  return (
    <section className="cr-context-bar cr-context-bar--executive" aria-label="Filtros do dashboard">
      <label className="cr-field">
        <span>{operational ? 'Obra' : 'Escopo executivo'}</span>
        <select value={obraId || ''} onChange={(event) => onObraChange(event.target.value)}>
          <option value="">{operational ? 'Todas as minhas obras' : 'Todas as obras do seu escopo'}</option>
          {filteredWorks.map((obra) => (
            <option key={obra.id} value={obra.id}>
              {obra.codigo || obra.id} · {obra.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="cr-field">
        <span>Classificação</span>
        <select value={classificacao} onChange={(event) => changeClassification(event.target.value)}>
          <option value="">Públicas e privadas</option>
          <option value="PUBLICA">Públicas</option>
          <option value="PRIVADA">Privadas</option>
        </select>
      </label>

      {operational ? (
        <div className="cr-operational-period" role="group" aria-label="Período do dashboard">
          <label className="cr-field">
            <span>Período inicial</span>
            <input
              type="month"
              value={periodStart}
              max={periodEnd}
              onChange={(event) => changePeriod(event.target.value, periodEnd)}
            />
          </label>
          <label className="cr-field">
            <span>Período final</span>
            <input
              type="month"
              value={periodEnd}
              min={periodStart}
              onChange={(event) => changePeriod(periodStart, event.target.value)}
            />
          </label>
        </div>
      ) : (
        <div className="cr-field">
          <span>Competências dos cards</span>
          <details className="cr-competence-filter">
            <summary>
              <HiOutlineCalendarDays className="h-4 w-4" />
              <strong>{competenceLabel}</strong>
              <HiOutlineChevronDown className="h-4 w-4" />
            </summary>
            <div className="cr-competence-filter__panel">
              <label className="cr-field">
                <span>Mês mais recente disponível</span>
                <input
                  type="month"
                  value={competenciaReferencia}
                  onChange={(event) => onCompetenciaReferenciaChange(event.target.value)}
                />
              </label>
              <div className="cr-competence-filter__actions">
                <button type="button" onClick={() => onCompetenciasChange(monthOptions)}>
                  Marcar seis meses
                </button>
                <button type="button" onClick={() => onCompetenciasChange([competenciaReferencia])}>
                  Somente referência
                </button>
              </div>
              <div className="cr-competence-filter__options">
                {monthOptions.map((item) => (
                  <label key={item}>
                    <input
                      type="checkbox"
                      checked={selectedMonths.includes(item)}
                      disabled={selectedMonths.length === 1 && selectedMonths.includes(item)}
                      onChange={() => toggleMonth(item)}
                    />
                    <span>{monthLabel(item)}</span>
                  </label>
                ))}
              </div>
            </div>
          </details>
        </div>
      )}

      <div className="cr-context-summary">
        <span>{operational ? 'Escopo do dashboard' : 'Cards em exibição'}</span>
        <strong>{selectedWork?.nome || `${filteredWorks.length} obra(s)`}</strong>
        <small>{selectedMonths.length} competência(s) selecionada(s)</small>
      </div>
    </section>
  );
}
