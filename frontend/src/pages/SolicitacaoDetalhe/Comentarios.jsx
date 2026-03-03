import { useState } from 'react';
import { API_URL, authHeaders } from '../../services/api';

export default function Comentarios({ solicitacaoId, onSucesso }) {
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(false);

  async function enviar() {
    if (!texto.trim()) return;

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/solicitacoes/${solicitacaoId}/comentarios`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ descricao: texto })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Erro ao enviar comentario');
      }

      setTexto('');
      onSucesso();
      alert('Comentario enviado com sucesso.');
    } catch (error) {
      alert(error?.message || 'Erro ao enviar comentario');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sol-detail-card">
      <h2 className="sol-detail-card-title">Novo comentario</h2>

      <textarea
        value={texto}
        onChange={e => setTexto(e.target.value)}
        rows={4}
        className="input w-full mb-3"
        placeholder="Escreva um comentario..."
      />

      <div className="flex justify-end">
        <button
          disabled={loading}
          onClick={enviar}
          className="btn btn-primary"
          type="button"
        >
          {loading ? 'Enviando...' : 'Enviar comentario'}
        </button>
      </div>
    </div>
  );
}
