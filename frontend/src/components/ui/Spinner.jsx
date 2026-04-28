export default function Spinner({ size = 'md', label = 'Carregando...', full = false }) {
  const sizeClass = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-10 w-10 border-[3px]'
  }[size] ?? 'h-6 w-6 border-2';

  const spinner = (
    <div role="status" className="spinner-shell">
      <span
        className={[
          sizeClass,
          'spinner-core'
        ].join(' ')}
        aria-hidden="true"
      />
      {label ? <span className="sr-only">{label}</span> : null}
      {!full && label ? <span className="spinner-label">{label}</span> : null}
    </div>
  );

  if (full) {
    return (
      <div className="spinner-fullscreen">
        <div className="spinner-panel">
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
}
