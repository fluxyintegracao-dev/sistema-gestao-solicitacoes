import { useEffect, useState } from 'react';
import {
  ativarCategoriaMacroProvisionamento,
  atualizarCategoriaMacroProvisionamento,
  criarCategoriaMacroProvisionamento,
  desativarCategoriaMacroProvisionamento,
  listarCategoriasMacroProvisionamento
} from '../../../services/provisoesFinanceiras';

export default function GestaoCategoriasMacro() {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: '', descricao: '', ordem_exibicao: '' });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ nome: '', descricao: '', ordem_exibicao: '', ativo: true });

  async function carregar() {
    try {
      setLoading(true);
      const data = await listarCategoriasMacroProvisionamento({ incluir_inativas: 1 });
      setCategorias(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar categorias macro.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.nome.trim()) {
      alert('Informe o nome da categoria macro.');
      return;
    }

    try {
      setSaving(true);
      await criarCategoriaMacroProvisionamento(form);
      setForm({ nome: '', descricao: '', ordem_exibicao: '' });
      await carregar();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao criar categoria macro.');
    } finally {
      setSaving(false);
    }
  }

  function iniciarEdicao(categoria) {
    setEditId(categoria.id);
    setEditForm({
      nome: categoria.nome || '',
      descricao: categoria.descricao || '',
      ordem_exibicao: categoria.ordem_exibicao ?? '',
      ativo: categoria.ativo !== false
    });
  }

  function cancelarEdicao() {
    setEditId(null);
    setEditForm({ nome: '', descricao: '', ordem_exibicao: '', ativo: true });
  }

  async function salvarEdicao() {
    try {
      setSaving(true);
      await atualizarCategoriaMacroProvisionamento(editId, editForm);
      cancelarEdicao();
      await carregar();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao atualizar categoria macro.');
    } finally {
      setSaving(false);
    }
  }

  async function alternarStatus(categoria) {
    try {
      if (categoria.ativo === false) {
        await ativarCategoriaMacroProvisionamento(categoria.id);
      } else {
        await desativarCategoriaMacroProvisionamento(categoria.id);
      }
      await carregar();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao alterar status da categoria macro.');
    }
  }

  return (
    <div className="page space-y-6">
      <div>
        <h1 className="page-title">Categorias Macro do Provisionamento</h1>
        <p className="page-subtitle">Cadastro inicial das categorias macro do novo modulo.</p>
      </div>

      <form className="card space-y-4" onSubmit={handleSubmit}>
        <div className="card-header">
          <h2 className="font-semibold">Nova categoria macro</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Nome
            <input className="input" value={form.nome} onChange={(event) => setForm((atual) => ({ ...atual, nome: event.target.value }))} />
          </label>
          <label className="grid gap-1 text-sm">
            Ordem de exibicao
            <input className="input" type="number" value={form.ordem_exibicao} onChange={(event) => setForm((atual) => ({ ...atual, ordem_exibicao: event.target.value }))} />
          </label>
          <label className="grid gap-1 text-sm md:col-span-3">
            Descricao
            <textarea className="input min-h-[96px]" value={form.descricao} onChange={(event) => setForm((atual) => ({ ...atual, descricao: event.target.value }))} />
          </label>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Adicionar categoria'}</button>
        </div>
      </form>

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Categorias cadastradas</h2>
        </div>
        {loading ? (
          <div className="py-8 text-center text-sm text-[var(--c-muted)]">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Descricao</th>
                  <th>Ordem</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((categoria) => (
                  <tr key={categoria.id}>
                    <td>
                      {editId === categoria.id ? (
                        <input className="input" value={editForm.nome} onChange={(event) => setEditForm((atual) => ({ ...atual, nome: event.target.value }))} />
                      ) : categoria.nome}
                    </td>
                    <td>
                      {editId === categoria.id ? (
                        <textarea className="input min-h-[80px]" value={editForm.descricao} onChange={(event) => setEditForm((atual) => ({ ...atual, descricao: event.target.value }))} />
                      ) : (categoria.descricao || '-')}
                    </td>
                    <td>
                      {editId === categoria.id ? (
                        <input className="input" type="number" value={editForm.ordem_exibicao} onChange={(event) => setEditForm((atual) => ({ ...atual, ordem_exibicao: event.target.value }))} />
                      ) : (categoria.ordem_exibicao ?? '-')}
                    </td>
                    <td>{categoria.ativo === false ? 'Inativa' : 'Ativa'}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {editId === categoria.id ? (
                          <>
                            <button type="button" className="btn btn-primary" onClick={salvarEdicao} disabled={saving}>Salvar</button>
                            <button type="button" className="btn btn-outline" onClick={cancelarEdicao} disabled={saving}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="btn btn-outline" onClick={() => iniciarEdicao(categoria)}>Editar</button>
                            <button type="button" className="btn btn-outline" onClick={() => alternarStatus(categoria)}>
                              {categoria.ativo === false ? 'Ativar' : 'Desativar'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {categorias.length === 0 && (
                  <tr>
                    <td colSpan="5" align="center">Nenhuma categoria macro cadastrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
