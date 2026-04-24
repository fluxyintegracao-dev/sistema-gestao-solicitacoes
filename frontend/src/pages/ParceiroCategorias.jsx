import { useEffect, useMemo, useState } from 'react';
import {
  atualizarCategoriaParceiro,
  criarCategoriaParceiro,
  desativarCategoriaParceiro,
  listarCategoriasParceiro
} from '../services/parceiros';

function defaultCategoriaForm() {
  return {
    id: null,
    nome: '',
    ativo: true
  };
}

function pickCategoriaFormData(categoria = {}) {
  return {
    id: categoria.id || null,
    nome: categoria.nome || '',
    ativo: categoria.ativo !== false
  };
}

function statusClass(ativo) {
  return ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700';
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function ParceiroCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [categoriaForm, setCategoriaForm] = useState(defaultCategoriaForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');

  async function carregar() {
    try {
      setLoading(true);
      setError('');
      const data = await listarCategoriasParceiro({ incluir_inativos: 1 });
      setCategorias(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Erro ao carregar categorias de parceiro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const categoriasFiltradas = useMemo(() => {
    const search = normalizeSearchText(filtro);
    if (!search) {
      return categorias;
    }

    return categorias.filter((categoria) => {
      const nome = normalizeSearchText(categoria.nome);
      return nome.includes(search);
    });
  }, [categorias, filtro]);

  async function handleSalvarCategoria(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');
      const { id, ...payload } = pickCategoriaFormData(categoriaForm);
      if (categoriaForm.id) {
        await atualizarCategoriaParceiro(categoriaForm.id, payload);
      } else {
        await criarCategoriaParceiro(payload);
      }
      setCategoriaForm(defaultCategoriaForm());
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao salvar categoria de parceiro');
    } finally {
      setSaving(false);
    }
  }

  async function handleDesativar(categoria) {
    try {
      setSaving(true);
      setError('');
      await desativarCategoriaParceiro(categoria.id);
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao desativar categoria de parceiro');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div>
        <h1 className="page-title">Categorias de Parceiro</h1>
        <p className="text-sm text-[var(--c-muted)]">
          Use categorias para agrupar fornecedores e facilitar o envio de cotacoes.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-8 text-center text-sm text-[var(--c-muted)]">
          Carregando categorias de parceiro...
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
            <h2 className="text-lg font-semibold text-[var(--c-text)]">
              {categoriaForm.id ? 'Editar categoria' : 'Nova categoria'}
            </h2>
            <form className="mt-4 space-y-3" onSubmit={handleSalvarCategoria}>
              <input
                className="input w-full"
                placeholder="Nome da categoria"
                value={categoriaForm.nome}
                onChange={(e) => setCategoriaForm((c) => ({ ...c, nome: e.target.value }))}
                required
              />
              <label className="flex items-center gap-2 text-sm text-[var(--c-text)]">
                <input
                  type="checkbox"
                  checked={categoriaForm.ativo}
                  onChange={(e) => setCategoriaForm((c) => ({ ...c, ativo: e.target.checked }))}
                />
                Categoria ativa
              </label>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : (categoriaForm.id ? 'Salvar alteracoes' : 'Criar categoria')}
                </button>
                {categoriaForm.id && (
                  <button type="button" className="btn btn-outline" onClick={() => setCategoriaForm(defaultCategoriaForm())}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Categorias cadastradas</h2>
              <input
                className="input w-[220px]"
                placeholder="Buscar categoria"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>

            {categoriasFiltradas.length === 0 ? (
              <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-8 text-center text-sm text-[var(--c-muted)]">
                Nenhuma categoria cadastrada.
              </div>
            ) : categoriasFiltradas.map((categoria) => (
              <div key={categoria.id} className="rounded-xl border border-[var(--c-border)] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-[var(--c-text)]">{categoria.nome}</div>
                    <div className="text-xs text-[var(--c-muted)]">ID {categoria.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(categoria.ativo)}`}>
                      {categoria.ativo ? 'ATIVA' : 'INATIVA'}
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setCategoriaForm(pickCategoriaFormData(categoria))}
                    >
                      Editar
                    </button>
                    {categoria.ativo && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => handleDesativar(categoria)}
                      >
                        Desativar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
