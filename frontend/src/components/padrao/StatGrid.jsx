/**
 * STATGRID / STATTILE — o ladrilho de dado único, unificando os quatro
 * dialetos que existiam (InfoItem do detalhe, .app-summary-card, StatsCard
 * de paleta própria e o cartão da Home). Tom SEMPRE semântico via token;
 * nenhuma cor à mão (regra 1 do DESIGN-SYSTEM.md).
 */
/*
  `icone` (05/09) — slot de verdade para o ícone do ladrilho.

  Sem ele, quem tinha ícone no cartão antigo enfiava um fragmento dentro do
  `label` para não perder o desenho na migração. Funciona e é errado: o
  rótulo passa a carregar markup, o leitor de tela lê o ícone junto do texto,
  e o CSS do rótulo não tem como posicionar o que não sabe que existe.
  O ícone é decorativo — `aria-hidden`, e o significado fica no rótulo.
*/
export function StatTile({ label, valor, sub, tom, span, full, vazio = false, title, icone }) {
  const classes = [
    'app-stat',
    tom && `app-stat--${tom}`,
    full && 'app-stat--full',
    vazio && 'app-stat--vazio'
  ].filter(Boolean).join(' ');
  return (
    <div
      className={classes}
      style={span > 1 ? { gridColumn: `span ${span}` } : undefined}
      title={title}
    >
      <span className="app-stat-label">
        {icone ? <span className="app-stat-icone" aria-hidden="true">{icone}</span> : null}
        {label}
      </span>
      <span className="app-stat-valor">{vazio ? '—' : valor}</span>
      {sub ? <span className="app-stat-sub">{sub}</span> : null}
    </div>
  );
}

export default function StatGrid({ colunas = 4, className = '', children }) {
  return (
    <div
      className={`app-stat-grid ${className}`.trim()}
      style={colunas !== 4 ? { '--stat-colunas': colunas } : undefined}
    >
      {children}
    </div>
  );
}
