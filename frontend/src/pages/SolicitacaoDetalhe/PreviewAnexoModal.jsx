import { fileUrl } from '../../services/api';

export default function PreviewAnexoModal({ anexo, onClose }) {
  const temUrlExplicita = Object.prototype.hasOwnProperty.call(anexo, 'url');
  const url = temUrlExplicita ? anexo.url : fileUrl(anexo.caminho);
  const downloadUrl = anexo.downloadUrl || url;
  const isPdf = /\.pdf$/i.test(anexo?.nome || '');

  function renderPreview() {
    if (!url) {
      return (
        <div className="text-center py-12" style={{ color: 'var(--c-text-muted)' }}>
          <p className="mb-2 font-semibold" style={{ color: 'var(--c-text)' }}>
            Pre-visualizacao indisponivel
          </p>
          <p>{anexo.erro || 'Nao foi possivel gerar um link seguro para este arquivo.'}</p>
        </div>
      );
    }

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
      return (
        <div className="space-y-3">
          <iframe
            src={url}
            className="w-full h-[80vh]"
            title={`Pre-visualizacao de ${anexo.nome || 'PDF'}`}
          />
          <div className="text-center text-sm">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: 'var(--c-primary)' }}
            >
              Abrir arquivo em nova aba
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center">
        <p className="mb-4">Pre-visualizacao nao disponivel</p>

        <a
          href={downloadUrl}
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
