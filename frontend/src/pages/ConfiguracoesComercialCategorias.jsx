import { useEffect, useState } from 'react';
import {
  getComercialCategoriasContrato,
  salvarComercialCategoriasContrato
} from '../services/configuracoesSistema';
import { criarCategoriaFinanceira } from '../services/financeiro';

function toggleId(list, id, checked) {
  const current = new Set((list || []).map(Number));
  if (checked) {
    current.add(Number(id));
  } else {
    current.delete(Number(id));
  }
  return Array.from(current);
}

function CategoriaChecklist({ title, description, categorias, selectedIds, onChange }) {
  const selected = new Set((selectedIds || []).map(Number));
  const allIds = (categorias || []).map((categoria) => Number(categoria.id)).filter(Number.isFinite);

  return (
    <section className="sol-surface-card rounded-2xl p-4 md:p-5">
      <div className="sol-filtros-head">
        <div>
          <p className="sol-filtros-title">{title}</p>
          <p className="sol-filtros-subtitle">{description}</p>
        </div>
        <span className="sol-filtros-meta">{selected.size} selecionada(s)</span>
      </div>

      {(categorias || []).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange(allIds)}>
            Marcar todos
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange([])}>
            Desmarcar todos
          </button>
        </div>
      )}

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {(categorias || []).map((categoria) => (
          <label
            key={categoria.id}
            className="flex items-start gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-3 text-sm text-[var(--c-text)]"
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={selected.has(Number(categoria.id))}
              onChange={(event) => onChange(toggleId(selectedIds, categoria.id, event.target.checked))}
            />
            <span>
              <span className="block font-semibold">{categoria.nome}</span>
              <span className="block text-xs text-[var(--c-muted)]">{categoria.tipo}</span>
            </span>
          </label>
        ))}
      </div>

      {(categorias || []).length === 0 && (
        <div className="app-empty-card mt-4">Nenhuma categoria financeira compativel encontrada.</div>
      )}
    </section>
  );
}

export default function ConfiguracoesComercialCategorias() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [categoriaForm, setCategoriaForm] = useState({
    nome: '',
    tipo: 'RECEBER',
    descricao: ''
  });
  const [config, setConfig] = useState({
    contrato_venda_categoria_ids: [],
    comissao_categoria_ids: [],
    categorias_contrato: [],
    categorias_comissao: []
  });

  async function carregar() {
    const data = await getComercialCategoriasContrato();
    setConfig(data || {});
    return data || {};
  }

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await getComercialCategoriasContrato();
        if (active) setConfig(data || {});
      } catch (err) {
        if (active) setError(err?.message || 'Erro ao carregar configuracao comercial');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      setError('');
      const data = await salvarComercialCategoriasContrato({
        contrato_venda_categoria_ids: config.contrato_venda_categoria_ids,
        comissao_categoria_ids: config.comissao_categoria_ids
      });
      setConfig(data || config);
      alert('Categorias comerciais atualizadas com sucesso.');
    } catch (err) {
      setError(err?.message || 'Erro ao salvar configuracao comercial');
    } finally {
      setSaving(false);
    }
  }

  async function handleCriarCategoria(event) {
    event.preventDefault();
    try {
      setCreating(true);
      setError('');
      const categoria = await criarCategoriaFinanceira({
        nome: categoriaForm.nome,
        tipo: categoriaForm.tipo,
        descricao: categoriaForm.descricao || undefined,
        ativo: true
      });
      const data = await carregar();
      const categoriaId = Number(categoria?.id);
      const tipo = String(categoria?.tipo || categoriaForm.tipo || '').toUpperCase();
      if (categoriaId) {
        setConfig({
          ...data,
          contrato_venda_categoria_ids: ['RECEBER', 'AMBOS'].includes(tipo)
            ? Array.from(new Set([...(data.contrato_venda_categoria_ids || []).map(Number), categoriaId]))
            : (data.contrato_venda_categoria_ids || []),
          comissao_categoria_ids: ['PAGAR', 'AMBOS'].includes(tipo)
            ? Array.from(new Set([...(data.comissao_categoria_ids || []).map(Number), categoriaId]))
            : (data.comissao_categoria_ids || [])
        });
      }
      setCategoriaForm({ nome: '', tipo: 'RECEBER', descricao: '' });
      setShowCreate(false);
    } catch (err) {
      setError(err?.message || 'Erro ao criar categoria financeira');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="page solicitacoes-page">
        <div className="app-empty-card">Carregando categorias comerciais...</div>
      </div>
    );
  }

  return (
    <div className="page solicitacoes-page space-y-5 md:space-y-6">
      <header className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Categorias comerciais</h1>
            <p className="page-subtitle">
              Defina quais categorias financeiras aparecem no contrato de venda e na categoria de comissao.
            </p>
          </div>
          <div className="app-page-actions">
            <button type="button" className="btn btn-outline" onClick={() => setShowCreate((current) => !current)}>
              {showCreate ? 'Fechar cadastro' : 'Nova categoria'}
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar configuracao'}
            </button>
          </div>
        </div>
      </header>

      {error && <div className="app-alert app-alert--error">{error}</div>}

      {showCreate && (
        <section className="sol-surface-card rounded-2xl p-4 md:p-5">
          <div className="sol-filtros-head">
            <div>
              <p className="sol-filtros-title">Nova categoria financeira</p>
              <p className="sol-filtros-subtitle">
                Crie a categoria e selecione onde ela sera usada no comercial.
              </p>
            </div>
          </div>

          <form className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)_auto]" onSubmit={handleCriarCategoria}>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Nome</span>
              <input
                className="input w-full"
                value={categoriaForm.nome}
                onChange={(event) => setCategoriaForm((current) => ({ ...current, nome: event.target.value }))}
                placeholder="Ex.: Recebiveis de venda"
                required
              />
            </label>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Tipo</span>
              <select
                className="input w-full"
                value={categoriaForm.tipo}
                onChange={(event) => setCategoriaForm((current) => ({ ...current, tipo: event.target.value }))}
              >
                <option value="RECEBER">Contrato de venda</option>
                <option value="PAGAR">Comissao</option>
                <option value="AMBOS">Ambos</option>
              </select>
            </label>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Descricao</span>
              <input
                className="input w-full"
                value={categoriaForm.descricao}
                onChange={(event) => setCategoriaForm((current) => ({ ...current, descricao: event.target.value }))}
                placeholder="Opcional"
              />
            </label>
            <div className="flex items-end">
              <button type="submit" className="btn btn-primary w-full" disabled={creating}>
                {creating ? 'Criando...' : 'Criar categoria'}
              </button>
            </div>
          </form>
        </section>
      )}

      <CategoriaChecklist
        title="Contrato de venda"
        description="Categorias de contas a receber exibidas no campo Categoria financeira."
        categorias={config.categorias_contrato || []}
        selectedIds={config.contrato_venda_categoria_ids || []}
        onChange={(ids) => setConfig((current) => ({ ...current, contrato_venda_categoria_ids: ids }))}
      />

      <CategoriaChecklist
        title="Comissao"
        description="Categorias de contas a pagar exibidas no campo Categoria comissao."
        categorias={config.categorias_comissao || []}
        selectedIds={config.comissao_categoria_ids || []}
        onChange={(ids) => setConfig((current) => ({ ...current, comissao_categoria_ids: ids }))}
      />
    </div>
  );
}
