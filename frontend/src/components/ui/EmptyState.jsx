/**
 * EmptyState — estado vazio padronizado.
 *
 * title   : string
 * message : string
 * icon    : ReactNode (opcional)
 * action  : ReactNode (opcional) — botão de ação
 */
export default function EmptyState({ title = 'Nenhum resultado', message, icon, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      {icon && (
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: 'var(--ui-surface-soft)', color: 'var(--c-muted)' }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <div className="grid gap-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
          {title}
        </p>
        {message && (
          <p className="text-sm" style={{ color: 'var(--c-muted)' }}>
            {message}
          </p>
        )}
      </div>

      {action && <div>{action}</div>}
    </div>
  );
}
