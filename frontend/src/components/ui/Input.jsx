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
    <div className="input-field" data-error={hasError ? 'true' : 'false'}>
      {label && (
        <label
          htmlFor={inputId}
          className="input-label"
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <Tag
        id={inputId}
        className={[
          'input',
          hasError ? 'input-error' : '',
          className
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
          className="input-message input-message-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {!hasError && hint && (
        <p
          id={`${inputId}-hint`}
          className="input-message"
        >
          {hint}
        </p>
      )}
    </div>
  );
}
