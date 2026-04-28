export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  iconOnly = false,
  ...props
}) {
  const base = 'btn';

  const variantClass = {
    primary: 'btn-primary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    success: 'btn-success',
    secondary: 'btn-secondary'
  }[variant] ?? 'btn-primary';

  const sizeClass = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg'
  }[size] ?? '';

  const widthClass = fullWidth ? 'w-full justify-center' : '';
  const iconOnlyClass = iconOnly ? 'btn-icon-only' : '';
  const disabledClass = disabled || loading ? 'opacity-70 pointer-events-none' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
      className={[base, variantClass, sizeClass, widthClass, iconOnlyClass, disabledClass, className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {loading && (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children ? <span className="btn-content">{children}</span> : null}
    </button>
  );
}
