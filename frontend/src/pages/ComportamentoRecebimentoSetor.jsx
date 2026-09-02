import { useEffect, useState } from 'react';
import { TabelaPadrao } from '../components/padrao';
import { getSetorPermissoes, salvarSetorPermissao } from '../services/setorPermissoes';

const MODOS = [
  { value: 'ADMIN_PRIMEIRO', label: 'Admin primeiro (admin atribui)' },
  { value: 'TODOS_VISIVEIS', label: 'Todos visiveis (usuarios podem assumir/atribuir)' }
];

export default function ComportamentoRecebimentoSetor() {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      setLoading(true);
      const data = await getSetorPermissoes();
      setLista(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar configuracoes de recebimento.');
    } finally {
      setLoading(false);
    }
  }

  function atualizarLocal(setorId, modo) {
    setLista(prev =>
      prev.map(item =>
        item.setor_id === setorId ? { ...item, modo_recebimento: modo } : item
      )
    );
  }

  async function salvar(item) {
    try {
      setSalvando(item.setor_id);
      await salvarSetorPermissao({
        setor_id: item.setor_id,
        usuario_pode_assumir: !!item.usuario_pode_assumir,
        usuario_pode_atribuir: !!item.usuario_pode_atribuir,
        modo_recebimento: item.modo_recebimento || 'TODOS_VISIVEIS'
      });
      alert('Comportamento salvo.');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar comportamento.');
    } finally {
      setSalvando(null);
    }
  }

  if (loading) return <p>Carregando configuracoes...</p>;

  return (
    <div className="page solicitacoes-page">
      <h1 className="page-title">Comportamento de Recebimento por Setor</h1>

      <div className="card">
        <TabelaPadrao
          colunas={[
            {
              id: 'setor',
              titulo: 'Setor',
              // R17: o setor é o registro desta lista.
              tipo: 'identidade',
              noCard: 'titulo',
              render: item => item.nome || item.codigo || item.setor_id
            },
            {
              id: 'comportamento',
              titulo: 'Comportamento no recebimento',
              tipo: 'texto',
              flex: true,
              render: item => (
                <select
                  className="input"
                  value={item.modo_recebimento || 'TODOS_VISIVEIS'}
                  onChange={e => atualizarLocal(item.setor_id, e.target.value)}
                >
                  {MODOS.map(modo => (
                    <option key={modo.value} value={modo.value}>
                      {modo.label}
                    </option>
                  ))}
                </select>
              )
            }
          ]}
          itens={lista}
          getId={item => item.setor_id}
          storageKey="tabela:comportamento-recebimento-setor"
          rotuloRolagem="Comportamento de recebimento por setor"
          vazio="Nenhum setor encontrado"
          acoesLinha={item => (
            <button
              className="text-blue-600"
              onClick={() => salvar(item)}
              disabled={salvando === item.setor_id}
            >
              {salvando === item.setor_id ? 'Salvando...' : 'Salvar'}
            </button>
          )}
          larguraAcoes={120}
        />
      </div>
    </div>
  );
}
