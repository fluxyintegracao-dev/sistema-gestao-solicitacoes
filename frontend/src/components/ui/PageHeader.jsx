/**
 * PageHeader — cabeçalho padronizado de página.
 *
 * title    : string (obrigatório)
 * subtitle : string
 * actions  : ReactNode — botões/ações no lado direito
 * back     : string — path para botão "Voltar" automático
 */
import { useNavigate } from 'react-router-dom';

export default function PageHeader({ title, subtitle, actions, back }) {
  const navigate = useNavigate();

  return (
    <div className="app-component-page-header flex flex-wrap items-start justify-between gap-3">
      <div className="app-component-page-header__leading flex min-w-0 items-start gap-3">
        {back && (
          <button
            type="button"
            onClick={() => navigate(back)}
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--c-muted)] transition-colors hover:text-[var(--c-text)]"
            aria-label="Voltar"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>

      {actions && (
        <div className="app-component-page-header__actions flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
