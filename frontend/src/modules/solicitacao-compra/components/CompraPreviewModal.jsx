import { useEffect } from 'react';
import { isImagePreview, isPdfPreview } from '../utils/preview';

export default function CompraPreviewModal({ preview, onClose }) {
  useEffect(() => {
    if (!preview) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;

      if (String(preview?.url || '').startsWith('blob:')) {
        window.URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview, onClose]);

  if (!preview) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--c-border)] px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">
              {preview.title || preview.name || 'Visualizacao de arquivo'}
            </h2>
            <p className="truncate text-sm text-[var(--c-muted)]">
              {preview.name || 'Arquivo anexado'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {preview.url && (
              <a
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                Abrir em nova aba
              </a>
            )}
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-100 p-3">
          {preview.srcDoc ? (
            <iframe
              title={preview.title || preview.name || 'Preview'}
              srcDoc={preview.srcDoc}
              className="h-full w-full rounded-lg border border-[var(--c-border)] bg-white"
            />
          ) : isImagePreview(preview?.name, preview?.url) ? (
            <div className="flex h-full items-center justify-center overflow-auto rounded-lg border border-[var(--c-border)] bg-white p-4">
              <img
                src={preview.url}
                alt={preview.name || 'Imagem anexada'}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : isPdfPreview(preview?.name, preview?.url) ? (
            <iframe
              title={preview.title || preview.name || 'Preview PDF'}
              src={preview.url}
              className="h-full w-full rounded-lg border border-[var(--c-border)] bg-white"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 rounded-lg border border-[var(--c-border)] bg-white p-6 text-center">
              <p className="text-sm text-[var(--c-muted)]">
                Este tipo de arquivo nao possui pre-visualizacao incorporada.
              </p>
              {preview.url && (
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  Abrir arquivo
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
