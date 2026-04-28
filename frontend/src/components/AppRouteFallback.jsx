import LoadingSkeleton from './ui/LoadingSkeleton';

export default function AppRouteFallback({ fullScreen = false }) {
  const containerClass = fullScreen
    ? 'min-h-screen bg-[var(--c-bg)] px-4 py-6'
    : 'page';

  return (
    <div className={containerClass}>
      <section className="route-fallback-card">
        <div className="route-fallback-hero">
          <div className="route-fallback-badge">
            <span className="route-fallback-badge-dot" />
            Carregando tela
          </div>
          <LoadingSkeleton className="h-8 w-56 rounded-2xl" />
          <LoadingSkeleton lines={2} lastLineClassName="w-3/4" />
        </div>

        <div className="route-fallback-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="route-fallback-panel">
              <LoadingSkeleton className="h-5 w-24 rounded-xl" />
              <LoadingSkeleton className="mt-4 h-10 w-2/3 rounded-2xl" />
              <LoadingSkeleton lines={3} lastLineClassName="w-1/2" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
