import { useEffect, useState } from 'react';
import {
  getObras,
  criarObra,
  atualizarObra,
  ativarObra,
  desativarObra
} from '../services/obras';

const CLASSIFICACOES_OBRA = [
  { value: '', label: 'Nao classificada' },
  { value: 'PUBLICA', label: 'Publica' },
  { value: 'PRIVADA', label: 'Privada' }
];

export default function Obras() {
  const [obras, setObras] = useState([]);
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [cidade, setCidade] = useState('');
  const [classificacaoObra, setClassificacaoObra] = useState('');
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editCodigo, setEditCodigo] = useState('');
  const [editCidade, setEditCidade] = useState('');
  const [editClassificacaoObra, setEditClassificacaoObra] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    carregarObras();
  }, []);

  async function carregarObras() {
    try {
      setLoading(true);
      const data = await getObras();
      setObras(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar obras', error);
      alert('Erro ao carregar obras');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      await criarObra({
        nome,
        codigo,
        cidade,
        classificacao_obra: classificacaoObra || null
      });
      setNome('');
      setCodigo('');
      setCidade('');
      setClassificacaoObra('');
      alert('Obra cadastrada com sucesso');
      carregarObras();
    } catch (error) {
      console.error('Erro ao criar obra', error);
      alert('Erro ao criar obra');
    }
  }

  function iniciarEdicao(item) {
    setEditId(item.id);
    setEditNome(item.nome);
    setEditCodigo(item.codigo || '');
    setEditCidade(item.cidade || '');
    setEditClassificacaoObra(item.classificacao_obra || '');
  }

  function cancelarEdicao() {
    setEditId(null);
    setEditNome('');
    setEditCodigo('');
    setEditCidade('');
    setEditClassificacaoObra('');
  }

  async function salvarEdicao(id) {
    try {
      setSaving(true);
      if (!editCodigo.trim()) {
        alert('Informe o codigo da obra');
        return;
      }
      await atualizarObra(id, {
        nome: editNome,
        codigo: editCodigo,
        cidade: editCidade,
        classificacao_obra: editClassificacaoObra || null
      });
      cancelarEdicao();
      carregarObras();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar edicao');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p>Carregando obras...</p>;
  }

  return (
    <div className="page">
      <div>
        <h1 className="page-title">Obras</h1>
        <p className="page-subtitle">Cadastro e manutencao de obras.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Nova obra</h2>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm">
            Codigo da obra
            <input
              type="text"
              className="input"
              placeholder="Ex: OBRA123"
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            Nome da obra
            <input
              type="text"
              className="input"
              placeholder="Ex: Obra Centro"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
            />
          </label>
          <label className="grid gap-1 text-sm">
            Cidade
            <input
              type="text"
              className="input"
              placeholder="Ex: Campinas"
              value={cidade}
              onChange={e => setCidade(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Classificacao
            <select
              className="input"
              value={classificacaoObra}
              onChange={e => setClassificacaoObra(e.target.value)}
            >
              {CLASSIFICACOES_OBRA.map(opcao => (
                <option key={opcao.value || 'SEM_CLASSIFICACAO'} value={opcao.value}>
                  {opcao.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary md:col-span-4">
            Adicionar
          </button>
        </form>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Nome</th>
              <th>Cidade</th>
              <th>Classificacao</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {obras.length === 0 && (
              <tr>
                <td colSpan="6" align="center">
                  Nenhuma obra cadastrada
                </td>
              </tr>
            )}
            {obras.map(obra => (
              <tr key={obra.id}>
                <td>
                  {editId === obra.id ? (
                    <input
                      className="input"
                      value={editCodigo}
                      onChange={e => setEditCodigo(e.target.value.toUpperCase())}
                    />
                  ) : (
                    obra.codigo || '-'
                  )}
                </td>
                <td>
                  {editId === obra.id ? (
                    <input
                      className="input"
                      value={editNome}
                      onChange={e => setEditNome(e.target.value)}
                    />
                  ) : (
                    obra.nome
                  )}
                </td>
                <td>
                  {editId === obra.id ? (
                    <input
                      className="input"
                      value={editCidade}
                      onChange={e => setEditCidade(e.target.value)}
                    />
                  ) : (
                    obra.cidade || '-'
                  )}
                </td>
                <td>
                  {editId === obra.id ? (
                    <select
                      className="input"
                      value={editClassificacaoObra}
                      onChange={e => setEditClassificacaoObra(e.target.value)}
                    >
                      {CLASSIFICACOES_OBRA.map(opcao => (
                        <option key={opcao.value || 'SEM_CLASSIFICACAO'} value={opcao.value}>
                          {opcao.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    CLASSIFICACOES_OBRA.find(opcao => opcao.value === obra.classificacao_obra)?.label || 'Nao classificada'
                  )}
                </td>
                <td>{obra.ativo ? 'Ativa' : 'Inativa'}</td>
                <td>
                  {editId === obra.id ? (
                    <>
                      <button className="btn btn-primary" onClick={() => salvarEdicao(obra.id)} disabled={saving}>
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>{' '}
                      <button className="btn btn-outline" onClick={cancelarEdicao} disabled={saving}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-outline" onClick={() => iniciarEdicao(obra)}>
                        Editar
                      </button>{' '}
                      {obra.ativo ? (
                        <button className="btn btn-secondary" onClick={async () => { await desativarObra(obra.id); carregarObras(); }}>
                          Desativar
                        </button>
                      ) : (
                        <button className="btn btn-success" onClick={async () => { await ativarObra(obra.id); carregarObras(); }}>
                          Ativar
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
