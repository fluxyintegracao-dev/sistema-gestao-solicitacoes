import { useEffect, useMemo, useState } from 'react';
import {
  atualizarCategoriaFinanceira,
  atualizarContaBancaria,
  criarCategoriaFinanceira,
  criarContaBancaria,
  getCategoriasFinanceiras,
  getContasBancarias
} from '../services/financeiro';

function defaultContaForm() {
  return {
    id: null,
    nome: '',
    banco: '',
    agencia: '',
    conta: '',
    tipo_conta: '',
    ativo: true
  };
}

function defaultCategoriaForm() {
  return {
    id: null,
    nome: '',
    tipo: 'AMBOS',
    descricao: '',
    ativo: true
  };
}

function pickContaFormData(conta = {}) {
  return {
    id: conta.id || null,
    nome: conta.nome || '',
    banco: conta.banco || '',
    agencia: conta.agencia || '',
    conta: conta.conta || '',
    tipo_conta: conta.tipo_conta || '',
    ativo: conta.ativo !== false
  };
}

function pickCategoriaFormData(categoria = {}) {
  return {
    id: categoria.id || null,
    nome: categoria.nome || '',
    tipo: categoria.tipo || 'AMBOS',
    descricao: categoria.descricao || '',
    ativo: categoria.ativo !== false
  };
}

function statusClass(ativo) {
  return ativo ? 'app-status-pill bg-emerald-100 text-emerald-700' : 'app-status-pill bg-slate-100 text-slate-700';
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const CATEGORIA_TIPO_META = {
  TODAS: {
    label: 'Todas',
    titulo: 'Todas as categorias',
    descricao: 'Visao consolidada de contas a pagar, receber e categorias compartilhadas.'
  },
  PAGAR: {
    label: 'Contas a pagar',
    titulo: 'Categorias de contas a pagar',
    descricao: 'Aparecem apenas em titulos do tipo PAGAR.'
  },
  RECEBER: {
    label: 'Contas a receber',
    titulo: 'Categorias de contas a receber',
    descricao: 'Aparecem apenas em titulos do tipo RECEBER.'
  },
  AMBOS: {
    label: 'Compartilhadas',
    titulo: 'Categorias compartilhadas',
    descricao: 'Ficam disponiveis para titulos a pagar e a receber.'
  }
};

function categoriaTipoLabel(tipo) {
  return CATEGORIA_TIPO_META[tipo]?.label || tipo;
}

function categoriaTipoBadgeClass(tipo) {
  if (tipo === 'PAGAR') {
    return 'finance-category-type-pill finance-category-type-pill--pagar';
  }
  if (tipo === 'RECEBER') {
    return 'finance-category-type-pill finance-category-type-pill--receber';
  }
  return 'finance-category-type-pill finance-category-type-pill--ambos';
}

export default function FinanceiroCadastros() {
  const [contas, setContas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [contaForm, setContaForm] = useState(defaultContaForm());
  const [categoriaForm, setCategoriaForm] = useState(defaultCategoriaForm());
  const [loading, setLoading] = useState(true);
  const [savingConta, setSavingConta] = useState(false);
  const [savingCategoria, setSavingCategoria] = useState(false);
  const [error, setError] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [categoriaTipoFiltro, setCategoriaTipoFiltro] = useState('TODAS');

  async function carregar() {
    try {
      setLoading(true);
      setError('');
      const [contasData, categoriasData] = await Promise.all([
        getContasBancarias(),
        getCategoriasFinanceiras()
      ]);
      setContas(Array.isArray(contasData) ? contasData : []);
      setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
    } catch (err) {
      setError(err?.message || 'Erro ao carregar cadastros financeiros');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const categoriasFiltradas = useMemo(() => {
    const search = normalizeSearchText(categoriaFiltro);
    return [...categorias]
      .filter((categoria) => {
        const tipoCategoria = String(categoria.tipo || 'AMBOS').trim().toUpperCase();
        const atendeTipo = categoriaTipoFiltro === 'TODAS' ? true : tipoCategoria === categoriaTipoFiltro;
        if (!atendeTipo) {
          return false;
        }

        if (!search) {
          return true;
        }

        const nome = normalizeSearchText(categoria.nome);
        const descricao = normalizeSearchText(categoria.descricao);
        const tipo = normalizeSearchText(tipoCategoria);
        return nome.includes(search) || descricao.includes(search) || tipo.includes(search);
      })
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' }));
  }, [categoriaFiltro, categoriaTipoFiltro, categorias]);

  const secoesCategorias = useMemo(() => {
    const grupos = [
      {
        key: 'PAGAR',
        titulo: CATEGORIA_TIPO_META.PAGAR.titulo,
        descricao: CATEGORIA_TIPO_META.PAGAR.descricao,
        itens: categoriasFiltradas.filter((categoria) => String(categoria.tipo || '').trim().toUpperCase() === 'PAGAR')
      },
      {
        key: 'RECEBER',
        titulo: CATEGORIA_TIPO_META.RECEBER.titulo,
        descricao: CATEGORIA_TIPO_META.RECEBER.descricao,
        itens: categoriasFiltradas.filter((categoria) => String(categoria.tipo || '').trim().toUpperCase() === 'RECEBER')
      },
      {
        key: 'AMBOS',
        titulo: CATEGORIA_TIPO_META.AMBOS.titulo,
        descricao: CATEGORIA_TIPO_META.AMBOS.descricao,
        itens: categoriasFiltradas.filter((categoria) => String(categoria.tipo || '').trim().toUpperCase() === 'AMBOS')
      }
    ];

    if (categoriaTipoFiltro === 'TODAS') {
      return grupos.filter((grupo) => grupo.itens.length > 0);
    }

    return grupos.filter((grupo) => grupo.key === categoriaTipoFiltro);
  }, [categoriaTipoFiltro, categoriasFiltradas]);

  async function handleSalvarConta(event) {
    event.preventDefault();
    try {
      setSavingConta(true);
      setError('');
      const { id, ...contaPayload } = pickContaFormData(contaForm);
      if (contaForm.id) {
        await atualizarContaBancaria(contaForm.id, contaPayload);
      } else {
        await criarContaBancaria(contaPayload);
      }
      setContaForm(defaultContaForm());
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao salvar conta bancaria');
    } finally {
      setSavingConta(false);
    }
  }

  async function handleSalvarCategoria(event) {
    event.preventDefault();
    try {
      setSavingCategoria(true);
      setError('');
      const { id, ...categoriaPayload } = pickCategoriaFormData(categoriaForm);
      if (categoriaForm.id) {
        await atualizarCategoriaFinanceira(categoriaForm.id, categoriaPayload);
      } else {
        await criarCategoriaFinanceira(categoriaPayload);
      }
      setCategoriaForm(defaultCategoriaForm());
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao salvar categoria financeira');
    } finally {
      setSavingCategoria(false);
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header">
        <h1 className="text-xl font-semibold md:text-2xl">Cadastros Financeiros</h1>
        <p className="page-subtitle">
          Base simples para contas bancarias e categorias usadas nas baixas e nos titulos.
        </p>
      </div>

      {error && (
        <div className="app-alert app-alert--error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="app-empty-card">
          Carregando cadastros financeiros...
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <div className="card sol-surface-card">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">
                {contaForm.id ? 'Editar conta bancaria' : 'Nova conta bancaria'}
              </h2>
              <form className="mt-4 space-y-3" onSubmit={handleSalvarConta}>
                <input className="input w-full" placeholder="Nome" value={contaForm.nome} onChange={(e) => setContaForm((c) => ({ ...c, nome: e.target.value }))} required />
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="input w-full" placeholder="Banco" value={contaForm.banco} onChange={(e) => setContaForm((c) => ({ ...c, banco: e.target.value }))} />
                  <input className="input w-full" placeholder="Tipo da conta" value={contaForm.tipo_conta} onChange={(e) => setContaForm((c) => ({ ...c, tipo_conta: e.target.value }))} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input className="input w-full" placeholder="Agencia" value={contaForm.agencia} onChange={(e) => setContaForm((c) => ({ ...c, agencia: e.target.value }))} />
                  <input className="input w-full" placeholder="Conta" value={contaForm.conta} onChange={(e) => setContaForm((c) => ({ ...c, conta: e.target.value }))} />
                </div>
                <label className="flex items-center gap-2 text-sm text-[var(--c-text)]">
                  <input type="checkbox" checked={contaForm.ativo} onChange={(e) => setContaForm((c) => ({ ...c, ativo: e.target.checked }))} />
                  Conta ativa
                </label>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={savingConta}>
                    {savingConta ? 'Salvando...' : (contaForm.id ? 'Salvar alteracoes' : 'Criar conta')}
                  </button>
                  {contaForm.id && (
                    <button type="button" className="btn btn-outline" onClick={() => setContaForm(defaultContaForm())}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="card sol-surface-card space-y-3">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Contas bancarias</h2>
              {contas.length === 0 ? (
                <p className="text-sm text-[var(--c-muted)]">Nenhuma conta bancaria cadastrada.</p>
              ) : (
                <div className="app-list-stack">
                  {contas.map((conta) => (
                    <div key={conta.id} className="app-list-card">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div className="text-sm">
                          <div className="font-medium text-[var(--c-text)]">{conta.nome}</div>
                          <div className="text-[var(--c-muted)]">
                            {conta.banco || 'Banco nao informado'} - {conta.agencia || '-'} / {conta.conta || '-'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={statusClass(conta.ativo)}>
                            {conta.ativo ? 'ATIVA' : 'INATIVA'}
                          </span>
                          <button type="button" className="btn btn-outline" onClick={() => setContaForm(pickContaFormData(conta))}>
                            Editar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card sol-surface-card">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">
                {categoriaForm.id ? 'Editar categoria financeira' : 'Nova categoria financeira'}
              </h2>
              <form className="mt-4 space-y-3" onSubmit={handleSalvarCategoria}>
                <input className="input w-full" placeholder="Nome" value={categoriaForm.nome} onChange={(e) => setCategoriaForm((c) => ({ ...c, nome: e.target.value }))} required />
                <select className="input w-full" value={categoriaForm.tipo} onChange={(e) => setCategoriaForm((c) => ({ ...c, tipo: e.target.value }))}>
                  <option value="AMBOS">Ambos</option>
                  <option value="PAGAR">Pagar</option>
                  <option value="RECEBER">Receber</option>
                </select>
                <textarea className="input min-h-[96px] w-full" placeholder="Descricao" value={categoriaForm.descricao} onChange={(e) => setCategoriaForm((c) => ({ ...c, descricao: e.target.value }))} />
                <label className="flex items-center gap-2 text-sm text-[var(--c-text)]">
                  <input type="checkbox" checked={categoriaForm.ativo} onChange={(e) => setCategoriaForm((c) => ({ ...c, ativo: e.target.checked }))} />
                  Categoria ativa
                </label>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary" disabled={savingCategoria}>
                    {savingCategoria ? 'Salvando...' : (categoriaForm.id ? 'Salvar alteracoes' : 'Criar categoria')}
                  </button>
                  {categoriaForm.id && (
                    <button type="button" className="btn btn-outline" onClick={() => setCategoriaForm(defaultCategoriaForm())}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="card sol-surface-card space-y-3">
              <div className="solicitacoes-toolbar rounded-xl p-0">
                <div className="finance-category-filter-row">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--c-text)]">Categorias financeiras</h2>
                    <p className="text-sm text-[var(--c-muted)]">
                      {categoriasFiltradas.length} categoria(s) exibida(s) de {categorias.length}.
                    </p>
                  </div>
                  <div className="finance-category-toolbar-actions">
                    <input
                      className="input w-full md:max-w-sm"
                      placeholder="Buscar categoria por nome, tipo ou descricao"
                      value={categoriaFiltro}
                      onChange={(e) => setCategoriaFiltro(e.target.value)}
                    />
                    <div className="finance-category-toggle-group" role="tablist" aria-label="Filtro de categorias financeiras">
                      {Object.entries(CATEGORIA_TIPO_META).map(([key, meta]) => (
                        <button
                          key={key}
                          type="button"
                          className={`finance-category-toggle ${categoriaTipoFiltro === key ? 'finance-category-toggle--active' : ''}`}
                          onClick={() => setCategoriaTipoFiltro(key)}
                        >
                          {meta.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="app-note">
                Na criacao do titulo, o sistema mostra apenas categorias compatíveis com o tipo escolhido e mantem as compartilhadas disponiveis nos dois fluxos.
              </div>
              {categorias.length === 0 ? (
                <p className="text-sm text-[var(--c-muted)]">Nenhuma categoria financeira cadastrada.</p>
              ) : categoriasFiltradas.length === 0 ? (
                <p className="text-sm text-[var(--c-muted)]">Nenhuma categoria encontrada para esse filtro.</p>
              ) : (
                <div className="finance-category-sections">
                  {secoesCategorias.map((secao) => (
                    <section key={secao.key} className="finance-category-section">
                      <div className="finance-category-section-head">
                        <div>
                          <h3 className="finance-category-section-title">{secao.titulo}</h3>
                          <p className="finance-category-section-subtitle">{secao.descricao}</p>
                        </div>
                        <span className="app-status-pill bg-slate-100 text-slate-700">
                          {secao.itens.length} item(ns)
                        </span>
                      </div>

                      {secao.itens.length === 0 ? (
                        <div className="app-note">
                          Nenhuma categoria em {categoriaTipoLabel(secao.key).toLowerCase()} para o filtro atual.
                        </div>
                      ) : (
                        <div className="app-list-stack">
                          {secao.itens.map((categoria) => (
                            <div key={categoria.id} className="app-list-card">
                              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                <div className="text-sm">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="font-medium text-[var(--c-text)]">{categoria.nome}</div>
                                    <span className={categoriaTipoBadgeClass(String(categoria.tipo || 'AMBOS').trim().toUpperCase())}>
                                      {categoriaTipoLabel(String(categoria.tipo || 'AMBOS').trim().toUpperCase())}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-[var(--c-muted)]">
                                    {categoria.descricao || 'Sem descricao complementar.'}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={statusClass(categoria.ativo)}>
                                    {categoria.ativo ? 'ATIVA' : 'INATIVA'}
                                  </span>
                                  <button type="button" className="btn btn-outline" onClick={() => setCategoriaForm(pickCategoriaFormData(categoria))}>
                                    Editar
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
