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
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.4)' }}>

      <div className="card w-full max-w-sm">

        <h2 className="font-semibold mb-4" style={{ color: 'var(--c-text)' }}>
          Alterar Status
        </h2>

        <div className="space-y-2">
          {loading && (
            <p className="text-sm" style={{ color: 'var(--c-muted)' }}>Carregando status...</p>
          )}
          {!loading && lista.map(s => (
            <button
              key={s}
              onClick={() => onSalvar(s)}
              className="w-full p-2 rounded border hover:opacity-80 transition-opacity text-left"
              style={{ borderColor: 'var(--ui-border)', color: 'var(--c-text)', background: 'var(--ui-canvas)' }}
            >
              {s}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 text-sm"
          style={{ color: 'var(--c-muted)' }}
        >
          Cancelar
        </button>

      </div>

    </div>
  );
}
