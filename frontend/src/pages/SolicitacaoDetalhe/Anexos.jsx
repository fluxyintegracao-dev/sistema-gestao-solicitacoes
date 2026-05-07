import { useRef, useState } from 'react';
import { API_URL, authHeaders } from '../../services/api';
import { HiPaperClip } from 'react-icons/hi2';
import PendingAttachmentsList from '../../components/attachments/PendingAttachmentsList';
import {
  UPLOAD_MAX_FILE_SIZE_MB_PADRAO,
  concatenarAnexosPendentes,
  extrairFilesAnexosPendentes,
  montarMensagemArquivosAcimaDoLimite
} from '../../utils/pendingAttachments';

export default function Anexos({ solicitacaoId, onSucesso }) {
  const [arquivos, setArquivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  async function enviar() {
    if (arquivos.length === 0) return;

    const formData = new FormData();
    formData.append('solicitacao_id', solicitacaoId);
    formData.append('tipo', 'ANEXO');

    extrairFilesAnexosPendentes(arquivos).forEach(file => {
      formData.append('files', file);
    });

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/anexos/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Erro no upload');
      }

      setArquivos([]);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      onSucesso();
    } catch (err) {
      console.error(err);
      alert(err?.message || 'Erro ao enviar arquivos');
    } finally {
      setLoading(false);
    }
  }

  function removerArquivo(index) {
    setArquivos(prev => prev.filter((_, i) => i !== index));
  }

  function adicionarArquivos(files) {
    const { arquivos: proximoEstado, rejeitados } = concatenarAnexosPendentes(arquivos, files, {
      maxFileSizeMb: UPLOAD_MAX_FILE_SIZE_MB_PADRAO
    });
    setArquivos(proximoEstado);
    if (rejeitados.length > 0) {
      alert(montarMensagemArquivosAcimaDoLimite(rejeitados, UPLOAD_MAX_FILE_SIZE_MB_PADRAO));
    }
  }

  return (
    <div className="sol-detail-card">
      <h2 className="sol-detail-card-title">Anexar arquivos</h2>

      <div className="flex items-center gap-2 flex-wrap mb-2">
        <label className={`btn btn-outline inline-flex items-center gap-2 cursor-pointer ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
          <HiPaperClip className="w-4 h-4" />
          <span>Anexar arquivos</span>
          <input
            type="file"
            multiple
            ref={inputRef}
            className="hidden"
            disabled={loading}
            onChange={e => {
              adicionarArquivos(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        <span className="text-xs text-[var(--c-muted)]">
          {arquivos.length > 0
            ? `${arquivos.length} arquivo(s) selecionado(s)`
            : 'Nenhum arquivo selecionado'}
        </span>
      </div>

      <PendingAttachmentsList
        items={arquivos}
        onRemove={(index) => removerArquivo(index)}
        className="space-y-1 mb-3"
        itemClassName="flex items-center justify-between gap-3 text-sm bg-[var(--c-surface)] border border-[var(--c-border)] rounded px-2 py-1"
        removeButtonClassName="text-blue-600 font-semibold px-2"
      />

      <div className="flex justify-end">
        <button
          disabled={loading}
          onClick={enviar}
          className="btn btn-primary disabled:opacity-50"
          type="button"
        >
          {loading ? 'Enviando...' : 'Enviar arquivos'}
        </button>
      </div>
    </div>
  );
}
