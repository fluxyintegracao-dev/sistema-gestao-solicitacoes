import {
  formatarDataAnexoPendente,
  formatarTamanhoAnexoPendente
} from '../../utils/pendingAttachments';

export default function PendingAttachmentsList({
  items = [],
  onRemove,
  className = '',
  itemClassName = '',
  removeButtonClassName = 'text-blue-600 font-semibold px-2'
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <div className={className || 'space-y-1'}>
      {items.map((item, index) => (
        <div
          key={item.id || `${item.nome || 'arquivo'}-${index}`}
          className={itemClassName || 'flex items-center justify-between gap-3 rounded border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm'}
        >
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{item.nome}</div>
            <div className="text-xs text-[var(--c-muted)]">
              {[item.tipo, formatarTamanhoAnexoPendente(item.tamanho), formatarDataAnexoPendente(item.data)]
                .filter(Boolean)
                .join(' • ')}
            </div>
          </div>
          {typeof onRemove === 'function' && (
            <button
              type="button"
              className={removeButtonClassName}
              onClick={() => onRemove(index)}
              aria-label={`Remover ${item.nome || 'arquivo'}`}
            >
              Remover
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
