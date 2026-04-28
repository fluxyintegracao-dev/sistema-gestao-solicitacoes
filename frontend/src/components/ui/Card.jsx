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
    sm: 'p-4',
    md: '',
    lg: 'p-7'
  }[padding] ?? '';

  const interactiveClass =
    hoverable || onClick
      ? 'card-interactive cursor-pointer'
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
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') onClick(event);
            }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={['card-header', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
