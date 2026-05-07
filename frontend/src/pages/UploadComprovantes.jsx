import { useRef, useState } from 'react';
import { HiPaperClip } from 'react-icons/hi2';
import { uploadComprovantes } from '../services/comprovantes';
import PendingAttachmentsList from '../components/attachments/PendingAttachmentsList';
import {
  UPLOAD_MAX_FILE_SIZE_MB_PADRAO,
  concatenarAnexosPendentes,
  extrairFilesAnexosPendentes,
  montarMensagemArquivosAcimaDoLimite
} from '../utils/pendingAttachments';

export default function UploadComprovantes() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  function handleFileChange(event) {
    const { arquivos: proximoEstado, rejeitados } = concatenarAnexosPendentes(files, event.target.files, {
      maxFileSizeMb: UPLOAD_MAX_FILE_SIZE_MB_PADRAO
    });
    setFiles(proximoEstado);
    setMessage(null);
    setError(rejeitados.length > 0
      ? montarMensagemArquivosAcimaDoLimite(rejeitados, UPLOAD_MAX_FILE_SIZE_MB_PADRAO)
      : null);
    event.target.value = '';
  }

  async function handleUpload(event) {
    event.preventDefault();

    if (!files.length) {
      setError('Selecione ao menos um arquivo');
      return;
    }

    try {
      setLoading(true);
      const result = await uploadComprovantes(extrairFilesAnexosPendentes(files));

      if (result.message) {
        setMessage(result.message);
      } else if (result.error) {
        setMessage(result.error);
      } else {
        setMessage('Upload realizado com sucesso.');
      }

      setFiles([]);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      event.target.reset();
    } catch (err) {
      setError(err.message || 'Erro ao enviar comprovantes');
    } finally {
      setLoading(false);
    }
  }

  function removerArquivo(index) {
    setFiles((atual) => atual.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="page solicitacoes-page max-w-3xl mx-auto">
      <div className="card space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Upload de comprovantes</p>
          <h1 className="page-title mt-1">Envio em massa</h1>
          <p className="page-subtitle">
            Anexe PDFs ou imagens. O nome do arquivo deve conter o codigo da solicitacao.
          </p>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          <label className="grid gap-1 text-sm">
            Arquivos
            <div className="flex items-center gap-2 flex-wrap">
              <label className={`btn btn-outline inline-flex items-center gap-2 cursor-pointer ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
                <HiPaperClip className="w-4 h-4" />
                <span>Anexar arquivos</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.html,.rar"
                  className="hidden"
                  disabled={loading}
                  ref={inputRef}
                  onChange={handleFileChange}
                />
              </label>
              <span className="text-xs text-[var(--c-muted)]">
                {files.length > 0
                  ? `${files.length} arquivo(s) selecionado(s)`
                  : 'Nenhum arquivo selecionado'}
              </span>
            </div>
            <p className="text-xs text-[var(--c-muted)]">
              Limite atual: ate {UPLOAD_MAX_FILE_SIZE_MB_PADRAO} MB por arquivo.
            </p>
          </label>

          <PendingAttachmentsList
            items={files}
            onRemove={(index) => removerArquivo(index)}
            className="space-y-2"
            itemClassName="flex items-center justify-between gap-3 rounded border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm"
            removeButtonClassName="text-blue-600 font-semibold px-2"
          />

          <div className="flex gap-3">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar arquivos'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setFiles([]);
                setMessage(null);
                setError(null);
                if (inputRef.current) {
                  inputRef.current.value = '';
                }
              }}
            >
              Limpar
            </button>
          </div>
        </form>

        {message && <p className="text-sm" style={{ color: '#1d4ed8' }}>{message}</p>}
        {error && <p className="text-sm" style={{ color: '#1e40af' }}>{error}</p>}

        <div style={{ borderTop: '1px solid var(--c-border)' }} />

        <p className="text-sm">
          <strong>Regra:</strong> o nome do arquivo deve conter o codigo da solicitacao.
          <br />
          Exemplo: <code className="px-2 py-1 rounded bg-[var(--c-border)]/40 text-[var(--c-text)]">SOL-12.pdf</code>
        </p>
      </div>
    </div>
  );
}
