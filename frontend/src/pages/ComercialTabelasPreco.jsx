import { useEffect, useMemo, useState } from 'react';
import {
  ativarTabelaPrecoComercial,
  atualizarTabelaPrecoComercial,
  criarTabelaPrecoComercial,
  getEmpreendimentosComerciais,
  getTabelasPrecoComerciais,
  getUnidadesComerciais
} from '../services/comercial';

const STATUS_TABELA = ['RASCUNHO', 'ATIVA', 'ARQUIVADA'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value) {
  if (value == null || String(value).trim() === '') return 0;
  const raw = String(value).trim().replace(/[R$\s]/gi, '');
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return toNumber(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatCurrencyInput(value) {
  if (value == null || String(value).trim() === '') return '';
  const numeric = toNumber(value);
  return numeric > 0 ? formatCurrency(numeric) : '';
}

function defaultItem(unidade = null) {
  return {
    unidade_comercial_id: unidade?.id ? String(unidade.id) : '',
    valor_tabela: unidade?.valor_tabela ? formatCurrencyInput(unidade.valor_tabela) : '',
    valor_minimo: '',
    observacoes: ''
  };
}

function defaultForm() {
  return {
    id: null,
    empreendimento_id: '',
    codigo: '',
    nome: '',
    status: 'RASCUNHO',
    vigencia_inicio: today(),
    vigencia_fim: '',
    observacoes: '',
    itens: []
  };
}

function pickForm(item = {}) {
  return {
    id: item.id || null,
    empreendimento_id: item.empreendimento_id ? String(item.empreendimento_id) : '',
    codigo: item.codigo || '',
    nome: item.nome || '',
    status: item.status || 'RASCUNHO',
    vigencia_inicio: item.vigencia_inicio || today(),
    vigencia_fim: item.vigencia_fim || '',
    observacoes: item.observacoes || '',
    itens: Array.isArray(item.itens)
      ? item.itens.map((registro) => ({
          unidade_comercial_id: registro.unidade_comercial_id ? String(registro.unidade_comercial_id) : '',
          valor_tabela: formatCurrencyInput(registro.valor_tabela),
          valor_minimo: formatCurrencyInput(registro.valor_minimo),
          observacoes: registro.observacoes || ''
        }))
      : []
  };
}

function statusClass(status) {
  switch (String(status || '').toUpperCase()) {
    case 'ATIVA':
      return 'bg-emerald-100 text-emerald-700';
    case 'ARQUIVADA':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-amber-100 text-amber-700';
  }
}

export default function ComercialTabelasPreco() {
  const [form, setForm] = useState(defaultForm());
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [tabelas, setTabelas] = useState([]);
  const [filtroEmpreendimento, setFiltroEmpreendimento] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function carregar() {
    try {
      setLoading(true);
      setError('');
      const [empreData, unidadesData, tabelasData] = await Promise.all([
        getEmpreendimentosComerciais({ ativo: 1 }),
        getUnidadesComerciais({ ativo: 1 }),
        getTabelasPrecoComerciais()
      ]);
      setEmpreendimentos(Array.isArray(empreData) ? empreData : []);
      setUnidades(Array.isArray(unidadesData) ? unidadesData : []);
      setTabelas(Array.isArray(tabelasData) ? tabelasData : []);
    } catch (err) {
      setError(err?.message || 'Erro ao carregar tabelas de preco');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const unidadesDoEmpreendimento = useMemo(
    () => unidades.filter((item) => String(item.empreendimento_id) === String(form.empreendimento_id)),
    [form.empreendimento_id, unidades]
  );

  const tabelasFiltradas = useMemo(() => {
    if (!filtroEmpreendimento) return tabelas;
    return tabelas.filter((item) => String(item.empreendimento_id) === String(filtroEmpreendimento));
  }, [filtroEmpreendimento, tabelas]);

  const unidadesJaSelecionadas = useMemo(
    () => new Set((form.itens || []).map((item) => String(item.unidade_comercial_id))),
    [form.itens]
  );

  function adicionarUnidade(unidade) {
    if (!unidade?.id || unidadesJaSelecionadas.has(String(unidade.id))) return;
    setForm((current) => ({
      ...current,
      itens: [...current.itens, defaultItem(unidade)]
    }));
  }

  function atualizarItem(index, field, value) {
    setForm((current) => {
      const itens = [...current.itens];
      itens[index] = {
        ...itens[index],
        [field]: value
      };
      return {
        ...current,
        itens
      };
    });
  }

  function removerItem(index) {
    setForm((current) => ({
      ...current,
      itens: current.itens.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');

      const payload = {
        empreendimento_id: Number(form.empreendimento_id),
        codigo: form.codigo || undefined,
        nome: form.nome,
        status: form.status,
        vigencia_inicio: form.vigencia_inicio || undefined,
        vigencia_fim: form.vigencia_fim || undefined,
        observacoes: form.observacoes || undefined,
        itens: form.itens.map((item) => ({
          unidade_comercial_id: Number(item.unidade_comercial_id),
          valor_tabela: item.valor_tabela,
          valor_minimo: item.valor_minimo || undefined,
          observacoes: item.observacoes || undefined
        }))
      };

      if (form.id) {
        await atualizarTabelaPrecoComercial(form.id, payload);
      } else {
        await criarTabelaPrecoComercial(payload);
      }

      setForm(defaultForm());
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao salvar tabela de preco');
    } finally {
      setSaving(false);
    }
  }

  async function ativarTabela(id) {
    try {
      await ativarTabelaPrecoComercial(id);
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao ativar tabela');
    }
  }

  if (loading) {
    return <div className="page solicitacoes-page"><div className="app-empty-card">Carregando tabelas de preco...</div></div>;
  }

  return (
    <div className="page solicitacoes-page space-y-5 md:space-y-6">
      <header className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">Tabelas de preco</h1>
            <p className="page-subtitle">
              Estruture e ative tabelas comerciais por empreendimento sem depender de ajuste manual unidade por unidade.
            </p>
          </div>
        </div>
      </header>

      {error && <div className="app-alert app-alert--error">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[520px_minmax(0,1fr)]">
        <section className="sol-surface-card rounded-2xl p-4 md:p-5">
          <div className="sol-filtros-head">
            <div>
              <p className="sol-filtros-title">{form.id ? 'Editar tabela de preco' : 'Nova tabela de preco'}</p>
              <p className="sol-filtros-subtitle">A tabela ativa pode atualizar o valor de tabela das unidades automaticamente.</p>
            </div>
          </div>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="sol-filter-field">
                <span className="sol-filter-label">Empreendimento</span>
                <select className="input w-full" value={form.empreendimento_id} onChange={(e) => setForm((current) => ({ ...current, empreendimento_id: e.target.value, itens: [] }))} required>
                  <option value="">Selecione</option>
                  {empreendimentos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                </select>
              </label>
              <label className="sol-filter-field">
                <span className="sol-filter-label">Status</span>
                <select className="input w-full" value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
                  {STATUS_TABELA.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="sol-filter-field">
                <span className="sol-filter-label">Codigo</span>
                <input className="input w-full" value={form.codigo} onChange={(e) => setForm((current) => ({ ...current, codigo: e.target.value }))} />
              </label>
              <label className="sol-filter-field">
                <span className="sol-filter-label">Nome</span>
                <input className="input w-full" value={form.nome} onChange={(e) => setForm((current) => ({ ...current, nome: e.target.value }))} required />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="sol-filter-field">
                <span className="sol-filter-label">Vigencia inicial</span>
                <input className="input w-full" type="date" value={form.vigencia_inicio} onChange={(e) => setForm((current) => ({ ...current, vigencia_inicio: e.target.value }))} />
              </label>
              <label className="sol-filter-field">
                <span className="sol-filter-label">Vigencia final</span>
                <input className="input w-full" type="date" value={form.vigencia_fim} onChange={(e) => setForm((current) => ({ ...current, vigencia_fim: e.target.value }))} />
              </label>
            </div>

            <label className="sol-filter-field">
              <span className="sol-filter-label">Observacoes</span>
              <textarea className="input min-h-[96px] w-full" value={form.observacoes} onChange={(e) => setForm((current) => ({ ...current, observacoes: e.target.value }))} />
            </label>

            <div className="space-y-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--c-text)]">Itens da tabela</p>
                  <p className="text-xs text-[var(--c-muted)]">Selecione as unidades e defina os valores comerciais dessa tabela.</p>
                </div>
              </div>

              {form.empreendimento_id ? (
                <div className="flex flex-wrap gap-2">
                  {unidadesDoEmpreendimento.filter((item) => !unidadesJaSelecionadas.has(String(item.id))).map((item) => (
                    <button key={item.id} type="button" className="btn btn-outline" onClick={() => adicionarUnidade(item)}>
                      + {item.codigo}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-[var(--c-muted)]">Selecione um empreendimento para adicionar unidades.</div>
              )}

              <div className="space-y-3">
                {(form.itens || []).map((item, index) => {
                  const unidade = unidadesDoEmpreendimento.find((registro) => String(registro.id) === String(item.unidade_comercial_id));
                  return (
                    <div key={`${item.unidade_comercial_id}-${index}`} className="grid gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-3 md:grid-cols-[160px_180px_180px_minmax(0,1fr)_auto]">
                      <label className="sol-filter-field">
                        <span className="sol-filter-label">Unidade</span>
                        <input className="input w-full" value={unidade?.codigo || item.unidade_comercial_id} disabled />
                      </label>
                      <label className="sol-filter-field">
                        <span className="sol-filter-label">Valor tabela</span>
                        <input className="input w-full" inputMode="decimal" value={item.valor_tabela} onChange={(e) => atualizarItem(index, 'valor_tabela', e.target.value)} onBlur={(e) => atualizarItem(index, 'valor_tabela', formatCurrencyInput(e.target.value))} placeholder="R$ 0,00" />
                      </label>
                      <label className="sol-filter-field">
                        <span className="sol-filter-label">Valor minimo</span>
                        <input className="input w-full" inputMode="decimal" value={item.valor_minimo} onChange={(e) => atualizarItem(index, 'valor_minimo', e.target.value)} onBlur={(e) => atualizarItem(index, 'valor_minimo', formatCurrencyInput(e.target.value))} placeholder="R$ 0,00" />
                      </label>
                      <label className="sol-filter-field">
                        <span className="sol-filter-label">Observacoes</span>
                        <input className="input w-full" value={item.observacoes} onChange={(e) => atualizarItem(index, 'observacoes', e.target.value)} />
                      </label>
                      <div className="flex items-end">
                        <button type="button" className="btn btn-outline w-full" onClick={() => removerItem(index)}>Remover</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : form.id ? 'Salvar tabela' : 'Criar tabela'}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setForm(defaultForm())}>Limpar</button>
            </div>
          </form>
        </section>

        <section className="sol-surface-card rounded-2xl p-4 md:p-5">
          <div className="sol-filtros-head">
            <div>
              <p className="sol-filtros-title">Tabelas cadastradas</p>
              <p className="sol-filtros-subtitle">Ative a tabela vigente e mantenha o historico comercial por empreendimento.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[260px_minmax(0,1fr)]">
            <label className="sol-filter-field">
              <span className="sol-filter-label">Empreendimento</span>
              <select className="input w-full" value={filtroEmpreendimento} onChange={(e) => setFiltroEmpreendimento(e.target.value)}>
                <option value="">Todos</option>
                {empreendimentos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-4 space-y-3">
            {tabelasFiltradas.length === 0 ? (
              <div className="app-empty-card">Nenhuma tabela de preco cadastrada.</div>
            ) : (
              tabelasFiltradas.map((item) => (
                <article key={item.id} className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-[var(--c-text)]">{item.nome}</h3>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(item.status)}`}>{item.status}</span>
                      </div>
                      <div className="grid gap-2 text-sm text-[var(--c-muted)] md:grid-cols-2">
                        <span>Empreendimento: {item.empreendimento?.nome || '-'}</span>
                        <span>Codigo: {item.codigo || '-'}</span>
                        <span>Vigencia: {item.vigencia_inicio || '-'} ate {item.vigencia_fim || '-'}</span>
                        <span>Itens: {item.itens?.length || 0}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.status !== 'ATIVA' && (
                        <button type="button" className="btn btn-outline" onClick={() => ativarTabela(item.id)}>
                          Ativar
                        </button>
                      )}
                      <button type="button" className="btn btn-outline" onClick={() => setForm(pickForm(item))}>
                        Editar
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
