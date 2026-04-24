import { useEffect, useState } from 'react';
import {
  getSetores,
  criarSetor,
  atualizarSetor,
  ativarSetor,
  desativarSetor
} from '../services/setores';

const CAPABILITY_FIELDS = [
  { key: 'eh_setor_obra', label: 'Setor de obra' },
  { key: 'eh_setor_financeiro', label: 'Setor financeiro' },
  { key: 'eh_setor_compras', label: 'Setor de compras' },
  { key: 'eh_setor_geo', label: 'Setor GEO / processos' },
  { key: 'eh_setor_administrativo', label: 'Setor administrativo' }
];

function emptyCapabilities() {
  return CAPABILITY_FIELDS.reduce((acc, item) => {
    acc[item.key] = false;
    return acc;
  }, {});
}

function formatarCapacidades(setor) {
  return CAPABILITY_FIELDS
    .filter(item => Boolean(setor?.[item.key]))
    .map(item => item.label);
}

export default function Setores() {
  const [setores, setSetores] = useState([]);
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [capabilities, setCapabilities] = useState(emptyCapabilities);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editCodigo, setEditCodigo] = useState('');
  const [editCapabilities, setEditCapabilities] = useState(emptyCapabilities);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    carregarSetores();
  }, []);

  async function carregarSetores() {
    try {
      setLoading(true);
      const data = await getSetores();
      setSetores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar setores', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    await criarSetor({
      nome,
      codigo,
      ...capabilities
    });

    setNome('');
    setCodigo('');
    setCapabilities(emptyCapabilities());
    carregarSetores();
  }

  function iniciarEdicao(item) {
    setEditId(item.id);
    setEditNome(item.nome);
    setEditCodigo(item.codigo);
    setEditCapabilities(CAPABILITY_FIELDS.reduce((acc, field) => {
      acc[field.key] = Boolean(item?.[field.key]);
      return acc;
    }, {}));
  }

  function cancelarEdicao() {
    setEditId(null);
    setEditNome('');
    setEditCodigo('');
    setEditCapabilities(emptyCapabilities());
  }

  async function salvarEdicao(id) {
    try {
      setSaving(true);
      await atualizarSetor(id, {
        nome: editNome,
        codigo: editCodigo,
        ...editCapabilities
      });
      cancelarEdicao();
      carregarSetores();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar edicao');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page solicitacoes-page">
        <p className="text-sm" style={{ color: 'var(--c-muted)' }}>Carregando setores...</p>
      </div>
    );
  }

  return (
    <div className="page solicitacoes-page">
      <div>
        <h1 className="page-title">Setores</h1>
        <p className="page-subtitle">Cadastro e manutencao de setores.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Novo setor</h2>
        </div>
        <form
          onSubmit={handleSubmit}
          className="grid gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)_auto] md:items-end"
        >
          <label className="grid gap-1 text-sm">
            Nome do setor
            <input
              className="input"
              placeholder="Ex: Geoprocessamento"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
            />
          </label>

          <label className="grid gap-1 text-sm">
            Codigo
            <input
              className="input"
              placeholder="Ex: GEO"
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              required
            />
          </label>

          <div className="grid gap-2 text-sm md:col-span-3">
            <span>Capacidades do setor</span>
            <div className="grid gap-2 md:grid-cols-3">
              {CAPABILITY_FIELDS.map(field => (
                <label key={field.key} className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2">
                  <input
                    type="checkbox"
                    checked={Boolean(capabilities[field.key])}
                    onChange={e => setCapabilities(prev => ({ ...prev, [field.key]: e.target.checked }))}
                  />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full md:w-auto md:px-5">
            Adicionar setor
          </button>
        </form>
      </div>

      <div className="card">
        <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Codigo</th>
              <th>Capacidades</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {setores.length === 0 && (
              <tr>
                <td colSpan="5" align="center">
                  Nenhum setor cadastrado
                </td>
              </tr>
            )}

            {setores.map(s => (
              <tr key={s.id}>
                <td>
                  {editId === s.id ? (
                    <input
                      className="input"
                      value={editNome}
                      onChange={e => setEditNome(e.target.value)}
                    />
                  ) : (
                    s.nome
                  )}
                </td>
                <td>
                  {editId === s.id ? (
                    <input
                      className="input"
                      value={editCodigo}
                      onChange={e => setEditCodigo(e.target.value.toUpperCase())}
                    />
                  ) : (
                    s.codigo
                  )}
                </td>
                <td>
                  {editId === s.id ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      {CAPABILITY_FIELDS.map(field => (
                        <label key={field.key} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={Boolean(editCapabilities[field.key])}
                            onChange={e => setEditCapabilities(prev => ({ ...prev, [field.key]: e.target.checked }))}
                          />
                          <span>{field.label}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {formatarCapacidades(s).length > 0 ? formatarCapacidades(s).map(label => (
                        <span key={label} className="rounded-full border border-[var(--c-border)] bg-[var(--c-surface)] px-2 py-1 text-xs">
                          {label}
                        </span>
                      )) : <span className="text-xs text-[var(--c-muted)]">Nenhuma</span>}
                    </div>
                  )}
                </td>
                <td>{s.ativo ? 'Ativo' : 'Inativo'}</td>
                <td>
                  {editId === s.id ? (
                    <>
                      <button className="btn btn-primary" onClick={() => salvarEdicao(s.id)} disabled={saving}>
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>{' '}
                      <button className="btn btn-outline" onClick={cancelarEdicao} disabled={saving}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-outline" onClick={() => iniciarEdicao(s)}>
                        Editar
                      </button>{' '}
                      {s.ativo ? (
                        <button className="btn btn-secondary" onClick={async () => { await desativarSetor(s.id); carregarSetores(); }}>
                          Desativar
                        </button>
                      ) : (
                        <button className="btn btn-success" onClick={async () => { await ativarSetor(s.id); carregarSetores(); }}>
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
    </div>
  );
}
