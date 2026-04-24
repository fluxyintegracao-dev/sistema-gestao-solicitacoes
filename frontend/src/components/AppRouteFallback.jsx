export default function AppRouteFallback({ fullScreen = false }) {
  const containerClass = fullScreen
    ? 'min-h-screen bg-[var(--c-bg)] px-4 py-6'
    : 'page';

  return (
    <div className={containerClass}>
      <section className="card">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-3 w-3 rounded-full bg-[var(--c-primary)] animate-pulse" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--c-text)] m-0">
              Carregando tela
            </p>
            <p className="text-xs text-[var(--c-muted)] mt-1 mb-0">
              Preparando o conteudo da aplicacao.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
