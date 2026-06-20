export default function HistoricoTimeline({ historicos }) {
  const historicosVisiveis = Array.isArray(historicos)
    ? historicos.filter((h) => !['PENDENCIA_FINANCEIRA_MARCADA', 'PENDENCIA_FINANCEIRA_REGULARIZADA'].includes(h?.acao))
    : [];

  return (
    <div className="space-y-4">
      {historicosVisiveis.map(h => (
        <div key={h.id} className="border-l-2 pl-4">
          <p className="text-sm font-medium">{h.acao}</p>
          <p className="text-xs text-gray-500">{h.createdAt}</p>
          {h.descricao && <p className="sol-detail-timeline-text">{h.descricao}</p>}
        </div>
      ))}
    </div>
  );
}
