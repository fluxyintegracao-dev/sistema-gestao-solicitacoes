/**
 * Spinner — indicador de carregamento.
 *
 * size  : 'sm' | 'md' | 'lg'
 * label : string — texto acessível (não visível por padrão)
 * full  : boolean — ocupa a tela toda (para loading de página)
 */
export default function Spinner({ size = 'md', label = 'Carregando...', full = false }) {
  const sizeClass = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-10 w-10 border-[3px]',
  }[size] ?? 'h-6 w-6 border-2';

  const spinner = (
    <div role="status" className="flex items-center gap-2">
      <span
        className={[
          sizeClass,
          'animate-spin rounded-full border-[var(--c-primary)] border-t-transparent',
        ].join(' ')}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );

  if (full) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
