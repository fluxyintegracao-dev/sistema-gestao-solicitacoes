/**
 * Card — superfície elevada padrão do sistema.
 *
 * padding  : 'none' | 'sm' | 'md' | 'lg'  (default: 'md')
 * hoverable: boolean — adiciona hover state para cards clicáveis
 * onClick  : função — torna o card clicável
 */
export default function Card({
  children,
  padding = 'md',
  hoverable = false,
  onClick,
  className = '',
  ...props
}) {
  const paddingClass = {
    none: 'p-0',
    sm: 'p-3',
    md: '',       // usa o padding padrão do .card (~1.25rem)
    lg: 'p-6',
  }[padding] ?? '';

  const interactiveClass =
    hoverable || onClick
      ? 'cursor-pointer transition-shadow hover:shadow-lg'
      : '';

  return (
    <div
      className={['card', paddingClass, interactiveClass, className]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick(e);
            }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  );
}

/** Subcomponente opcional para cabeçalho padronizado */
export function CardHeader({ children, className = '' }) {
  return (
    <div className={['card-header', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
