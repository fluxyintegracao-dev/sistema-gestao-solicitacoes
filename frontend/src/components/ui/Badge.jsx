export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  style,
  ...props
}) {
  const base = 'badge';

  const sizeClass = {
    sm: 'badge-sm',
    md: 'badge-md'
  }[size] ?? 'badge-md';

  const variantClass = {
    default: 'badge-default',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    muted: 'badge-muted',
    custom: ''
  }[variant] ?? 'badge-default';

  return (
    <span
      className={[base, sizeClass, variantClass, className].filter(Boolean).join(' ')}
      style={style ? { ...style } : undefined}
      {...props}
    >
      {dot && (
        <span
          className="badge-dot"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
