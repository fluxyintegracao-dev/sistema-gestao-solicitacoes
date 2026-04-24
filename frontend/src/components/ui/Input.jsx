/**
 * Input — campo de texto/select/textarea padronizado.
 *
 * label      : string
 * error      : string — mensagem de erro inline
 * hint       : string — texto de ajuda abaixo do campo
 * as         : 'input' | 'select' | 'textarea'
 */
export default function Input({
  label,
  error,
  hint,
  as: Tag = 'input',
  id,
  className = '',
  children,
  required,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const hasError = Boolean(error);

  return (
    <div className="grid gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium"
          style={{ color: 'var(--c-text)' }}
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <Tag
        id={inputId}
        className={[
          'input',
          hasError ? 'border-red-500 focus:border-red-500' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-invalid={hasError}
        aria-describedby={
          hasError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
        {...props}
      >
        {children}
      </Tag>

      {hasError && (
        <p
          id={`${inputId}-error`}
          className="text-xs text-red-500"
          role="alert"
        >
          {error}
        </p>
      )}

      {!hasError && hint && (
        <p
          id={`${inputId}-hint`}
          className="text-xs"
          style={{ color: 'var(--c-muted)' }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
