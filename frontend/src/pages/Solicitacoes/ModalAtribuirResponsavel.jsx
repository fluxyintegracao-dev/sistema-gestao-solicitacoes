import { useEffect, useState } from 'react';
import { API_URL, authHeaders } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function ModalAtribuirResponsavel({
  solicitacaoId,
  obraId,
  isSetorObraSolicitacao,
  isUsuarioSetorObra,
  onClose,
  onSucesso
}) {

  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const { user } = useAuth();
  const isUsuario = user?.perfil === 'USUARIO';
  const setorUsuario = user?.setor_id ? String(user.setor_id) : '';

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function carregarUsuarios() {
    const res = await fetch(`${API_URL}/usuarios/opcoes-atribuicao`, {
      headers: authHeaders()
    });

    if (!res.ok) {
      setUsuarios([]);
      return;
    }

    const data = await res.json();
    const lista = Array.isArray(data) ? data : [];
    let filtrados = lista;

    if (setorUsuario) {
      filtrados = filtrados.filter(u => String(u.setor_id) === setorUsuario);
    }

    if ((isSetorObraSolicitacao || isUsuarioSetorObra) && obraId) {
      filtrados = filtrados.filter(u =>
        Array.isArray(u.vinculos) &&
        u.vinculos.some(v => String(v.obra_id) === String(obraId))
      );
    }

    setUsuarios(filtrados);
  }

  async function salvar() {
    if (!usuarioSelecionado) {
      alert('Selecione um usuário');
      return;
    }

    const res = await fetch(
      `${API_URL}/solicitacoes/${solicitacaoId}/atribuir`,
      {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          usuario_responsavel_id: usuarioSelecionado
        })
      }
    );

    if (!res.ok) {
      let mensagem = 'Erro ao atribuir responsável';
      try {
        const data = await res.json();
        mensagem = data?.error || mensagem;
      } catch (_) {}
      alert(mensagem);
      return;
    }

    alert('Responsável atribuído com sucesso.');
    onSucesso();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-md">

        <h2 className="text-lg font-semibold mb-4">
          Atribuir responsável
        </h2>

        <select
          className="input w-full mb-4"
          value={usuarioSelecionado}
          onChange={e => setUsuarioSelecionado(e.target.value)}
        >
          <option value="">Selecione um usuário</option>

          {usuarios.map(u => (
            <option key={u.id} value={u.id}>
              {u.nome}
            </option>
          ))}
        </select>

        {(isUsuario || isSetorObraSolicitacao || isUsuarioSetorObra) && (
          <p className="mb-3 text-xs text-[var(--c-muted)]">
            As atribuicoes devem ser para pessoas do mesmo setor.
            {(isSetorObraSolicitacao || isUsuarioSetorObra) && obraId && ' Para OBRA, somente usuarios vinculados a mesma obra.'}
          </p>
        )}

        <div className="flex justify-end gap-3">

          <button
            onClick={onClose}
            className="btn btn-outline"
          >
            Cancelar
          </button>

          <button
            onClick={salvar}
            className="btn btn-primary"
          >
            Salvar
          </button>

        </div>

      </div>

    </div>
  );
}
