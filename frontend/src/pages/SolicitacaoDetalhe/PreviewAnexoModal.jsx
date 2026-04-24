import { useEffect, useState } from 'react';
import { fileUrl } from '../../services/api';

export default function PreviewAnexoModal({ anexo, onClose }) {
  const url = anexo.url || fileUrl(anexo.caminho);
  const isPdf = /\.pdf$/i.test(anexo?.nome || '');
  const [pdfUrl, setPdfUrl] = useState('');
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  useEffect(() => {
    if (!isPdf || !url) {
      setPdfUrl('');
      setLoadingPdf(false);
      setPdfError('');
      return undefined;
    }

    let active = true;
    let objectUrl = '';
    const controller = new AbortController();

    setLoadingPdf(true);
    setPdfError('');

    fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Falha ao carregar PDF');
        }
        return response.blob();
      })
      .then((blob) => {
        if (!active) return;
        objectUrl = window.URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      })
      .catch((error) => {
        if (!active || error?.name === 'AbortError') return;
        console.error(error);
        setPdfError('Nao foi possivel carregar a pre-visualizacao do PDF.');
      })
      .finally(() => {
        if (active) {
          setLoadingPdf(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isPdf, url]);

  function renderPreview() {
    if (anexo.nome.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return (
        <img
          src={url}
          alt={anexo.nome}
          className="max-h-[80vh] mx-auto"
        />
      );
    }

    if (isPdf) {
      if (loadingPdf) {
        return (
          <div className="flex h-[80vh] items-center justify-center text-sm" style={{ color: 'var(--c-muted)' }}>
            Carregando PDF...
          </div>
        );
      }

      if (pdfError) {
        return (
          <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm" style={{ color: 'var(--c-muted)' }}>{pdfError}</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline" style={{ color: 'var(--c-primary)' }}
            >
              Abrir arquivo em nova aba
            </a>
          </div>
        );
      }

      return (
        <iframe
          src={pdfUrl}
          className="w-full h-[80vh]"
          title="preview"
        />
      );
    }

    return (
      <div className="text-center">
        <p className="mb-4">Pre-visualizacao nao disponivel</p>

        <a
          href={url}
          download
          className="underline" style={{ color: 'var(--c-primary)' }}
        >
          Baixar arquivo
        </a>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card w-11/12 md:w-3/4 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-2 text-xl"
        >
          ×
        </button>

        <h2 className="font-semibold mb-3">{anexo.nome}</h2>

        {renderPreview()}
      </div>
    </div>
  );
}
