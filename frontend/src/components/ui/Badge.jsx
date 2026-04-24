/**
 * Badge — etiqueta de status/categoria.
 *
 * variant : 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
 * size    : 'sm' | 'md'
 * dot     : boolean — exibe bolinha antes do texto
 *
 * Também aceita `style` customizado (usado pelo StatusBadge para cor dinâmica).
 */
export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  style,
  ...props
}) {
  const base = 'inline-flex items-center gap-1.5 font-semibold rounded-full';

  const sizeClass = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  }[size] ?? 'px-2.5 py-1 text-xs';

  const variantClass = {
    default: 'bg-[var(--ui-surface-soft)] text-[var(--c-text)] border border-[var(--ui-border)]',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger:  'bg-red-50 text-red-700 border border-red-200',
    info:    'bg-blue-50 text-blue-700 border border-blue-200',
    muted:   'bg-slate-100 text-slate-600 border border-slate-200',
    custom:  '',  // usa apenas style prop
  }[variant] ?? '';

  // Suporte para cor dinâmica (ex: StatusBadge com cores do tema)
  const resolvedStyle = style
    ? { ...style }
    : undefined;

  return (
    <span
      className={[base, sizeClass, variantClass, className].filter(Boolean).join(' ')}
      style={resolvedStyle}
      {...props}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
