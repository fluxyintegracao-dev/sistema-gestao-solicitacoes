import { useState } from 'react';
import { API_URL, authHeaders } from '../../services/api';

export default function Pedido({ solicitacaoId, numeroPedido, onSucesso }) {
  const [valor, setValor] = useState(numeroPedido || '');
  const [loading, setLoading] = useState(false);

  async function salvar() {
    if (!confirm('Confirmar envio do número do pedido?')) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/solicitacoes/${solicitacaoId}/pedido`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ numero_pedido: valor })
      });

      if (!res.ok) {
        throw new Error('Erro ao atualizar número do pedido da solicitacao');
      }

      onSucesso?.();
      alert('Número do pedido registrado com sucesso.');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar número do pedido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sol-detail-card space-y-3">
      <h2 className="sol-detail-card-title">Número do pedido</h2>
      <input
        className="input"
        placeholder="Informe o número do pedido"
        value={valor}
        onChange={e => setValor(e.target.value)}
      />
      <div className="flex justify-end">
        <button
          onClick={salvar}
          disabled={loading}
          className="btn btn-primary"
          type="button"
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
