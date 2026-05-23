import { useEffect, useState } from 'react';
import { getStatusSetor } from '../../services/statusSetor';

export default function ModalAlterarStatus({
  aberto,
  setor,
  onClose,
  onSalvar
}) {
  const [status, setStatus] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    carregarStatus();
  }, [aberto, setor]);

  async function carregarStatus() {
    try {
      setLoading(true);
      if (setor) {
        const data = await getStatusSetor({ setor });
        const ativos = (Array.isArray(data) ? data : [])
          .filter(s => s.ativo)
          .sort((a, b) => a.ordem - b.ordem)
          .map(s => s.nome);
        setStatus(ativos);
        return;
      }
      const data = await getStatusSetor();
      const ativos = (Array.isArray(data) ? data : [])
        .filter(s => s.ativo)
        .map(s => s.nome);
      const unicos = Array.from(new Set(ativos));
      unicos.sort((a, b) => a.localeCompare(b));
      setStatus(unicos);
    } catch (error) {
      console.error(error);
      setStatus([]);
    } finally {
      setLoading(false);
    }
  }

  const fallback = [
    'EM_ANALISE',
    'AGUARDANDO_AJUSTE',
    'APROVADA',
    'REJEITADA',
    'CONCLUIDA'
  ];
  const lista = status.length > 0 ? status : fallback;

  if (!aberto) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog modal-dialog--sm">

        <div className="modal-header">
          <h2 className="modal-title">Alterar Status</h2>
          <button
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Fechar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <div className="loading-spinner" />
              <p className="empty-state__description">Carregando status...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {lista.map(s => (
                <button
                  key={s}
                  onClick={() => onSalvar(s)}
                  className="btn btn-secondary"
                  style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
}
