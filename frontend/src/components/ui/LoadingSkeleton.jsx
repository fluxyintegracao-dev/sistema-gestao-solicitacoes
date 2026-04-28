export default function LoadingSkeleton({
  className = '',
  lines = 0,
  lastLineClassName = 'w-2/3',
  inline = false
}) {
  const Tag = inline ? 'span' : 'div';

  if (lines > 0) {
    return (
      <div className="grid gap-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={[
              'loading-skeleton h-3',
              index === lines - 1 ? lastLineClassName : 'w-full'
            ].join(' ')}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  return (
    <Tag
      className={['loading-skeleton', className].filter(Boolean).join(' ')}
      aria-hidden="true"
    />
  );
}
