import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
  HiOutlineCreditCard,
  HiOutlineEye
} from 'react-icons/hi2';
import {
  baixarFaturaCartaoFinanceiro,
  getCartoesFinanceiros,
  getContasBancarias,
  getFaturaCartaoFinanceiro,
  getFaturasCartaoFinanceiro
} from '../services/financeiro';

const DEFAULT_FILTERS = {
  status: 'ABERTA',
  cartao_id: ''
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return '-';
  return `${day}/${month}/${year}`;
}

function compact(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
  );
}

function statusClass(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PAGA') return 'app-status-pill bg-emerald-100 text-emerald-700';
  if (normalized === 'FECHADA') return 'app-status-pill bg-blue-100 text-blue-700';
  if (normalized === 'PARCIAL') return 'app-status-pill bg-amber-100 text-amber-700';
  if (normalized === 'CANCELADA') return 'app-status-pill bg-rose-100 text-rose-700';
  return 'app-status-pill bg-slate-100 text-slate-700';
}

function tituloStatusClass(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'QUITADO') return 'app-status-pill bg-emerald-100 text-emerald-700';
  if (normalized === 'PARCIAL') return 'app-status-pill bg-amber-100 text-amber-700';
  if (normalized === 'CANCELADO') return 'app-status-pill bg-rose-100 text-rose-700';
  return 'app-status-pill bg-blue-100 text-blue-700';
}

function cartaoLabel(cartao) {
  if (!cartao) return 'Cartao nao informado';
  const final = cartao.ultimos_digitos ? ` final ${cartao.ultimos_digitos}` : '';
  return `${cartao.nome || `Cartao #${cartao.id}`}${final}`;
}

function contaLabel(conta) {
  if (!conta) return 'Conta nao informada';
  const banco = conta.banco || conta.tipo_operacional || 'Conta';
  return `${conta.nome || `Conta #${conta.id}`} - ${banco}`;
}

function countTitulosAbertos(fatura) {
  return (fatura?.titulos || []).filter((titulo) => ['ABERTO', 'PARCIAL'].includes(String(titulo.status || '').toUpperCase())).length;
}

function getValorAberto(fatura) {
  return (fatura?.titulos || []).reduce((total, titulo) => {
    if (!['ABERTO', 'PARCIAL'].includes(String(titulo.status || '').toUpperCase())) return total;
    return total + Number(titulo.valor_saldo || titulo.valor_original || 0);
  }, 0);
}

export default function FinanceiroFaturasCartao() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [faturas, setFaturas] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [contas, setContas] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [baixaForm, setBaixaForm] = useState({
    conta_bancaria_id: '',
    data_pagamento: today(),
    observacoes: ''
  });

  useEffect(() => {
    let active = true;
    setLoadingOptions(true);

    Promise.all([
      getCartoesFinanceiros().catch(() => []),
      getContasBancarias().catch(() => [])
    ])
      .then(([cartoesData, contasData]) => {
        if (!active) return;
        setCartoes(Array.isArray(cartoesData) ? cartoesData : []);
        setContas(Array.isArray(contasData) ? contasData : []);
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getFaturasCartaoFinanceiro(compact(appliedFilters))
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        setFaturas(list);
        if (selected) {
          const refreshed = list.find((fatura) => Number(fatura.id) === Number(selected.id));
          if (refreshed) setSelected(refreshed);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Erro ao carregar faturas de cartao');
        setFaturas([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appliedFilters]);

  const resumo = useMemo(() => faturas.reduce((acc, fatura) => {
    acc.quantidade += 1;
    acc.valor_total += Number(fatura.valor_total || 0);
    acc.valor_aberto += getValorAberto(fatura);
    if (String(fatura.status || '').toUpperCase() === 'PAGA') acc.pagas += 1;
    return acc;
  }, {
    quantidade: 0,
    valor_total: 0,
    valor_aberto: 0,
    pagas: 0
  }), [faturas]);

  function setFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value
    }));
  }

  function aplicarFiltros(event) {
    event.preventDefault();
    setAppliedFilters({ ...filters });
    setMessage('');
  }

  function limparFiltros() {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setMessage('');
  }

  async function selecionarFatura(fatura) {
    setSelected(fatura);
    setMessage('');
    setError('');
    setBaixaForm({
      conta_bancaria_id: fatura.conta_bancaria_id || fatura.cartao?.conta_bancaria_id || '',
      data_pagamento: today(),
      observacoes: ''
    });

    try {
      setLoadingDetail(true);
      const data = await getFaturaCartaoFinanceiro(fatura.id);
      setSelected(data);
      setBaixaForm((current) => ({
        ...current,
        conta_bancaria_id: data.conta_bancaria_id || data.cartao?.conta_bancaria_id || current.conta_bancaria_id || ''
      }));
    } catch (err) {
      setError(err?.message || 'Erro ao carregar detalhes da fatura');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function baixarFatura(event) {
    event.preventDefault();
    if (!selected) return;

    try {
      setProcessing(true);
      setError('');
      setMessage('');
      const data = await baixarFaturaCartaoFinanceiro(selected.id, baixaForm);
      setSelected(data);
      setMessage('Fatura baixada. Os titulos da fatura foram quitados com movimentos na conta bancaria informada.');
      const list = await getFaturasCartaoFinanceiro(compact(appliedFilters));
      setFaturas(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message || 'Erro ao baixar fatura de cartao');
    } finally {
      setProcessing(false);
    }
  }

  const selectedStatus = String(selected?.status || '').toUpperCase();
  const canBaixarSelected = selected && ['ABERTA', 'FECHADA', 'PARCIAL'].includes(selectedStatus) && countTitulosAbertos(selected) > 0;

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header-row">
        <div>
          <h1 className="page-title">Faturas de Cartao</h1>
          <p className="page-subtitle">
            Controle as faturas de cartao de credito, confira os titulos vinculados e registre a baixa na conta bancaria real.
          </p>
        </div>
        <div className="app-page-actions">
          <Link to="/financeiro/titulos" className="btn btn-outline btn-sm">Titulos</Link>
          <Link to="/financeiro/cadastros" className="btn btn-outline btn-sm">Cartoes</Link>
        </div>
      </div>

      <form className="card sol-surface-card" onSubmit={aplicarFiltros}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
          <label className="app-filter-field xl:col-span-3">
            <span className="app-filter-label">Status</span>
            <select className="input w-full input-sm" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
              <option value="">Todos</option>
              <option value="ABERTA">Abertas</option>
              <option value="FECHADA">Fechadas</option>
              <option value="PARCIAL">Parciais</option>
              <option value="PAGA">Pagas</option>
              <option value="CANCELADA">Canceladas</option>
            </select>
          </label>
          <label className="app-filter-field xl:col-span-5">
            <span className="app-filter-label">Cartao</span>
            <select className="input w-full input-sm" value={filters.cartao_id} onChange={(event) => setFilter('cartao_id', event.target.value)} disabled={loadingOptions}>
              <option value="">Todos os cartoes</option>
              {cartoes.map((cartao) => (
                <option key={cartao.id} value={cartao.id}>{cartaoLabel(cartao)}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2 xl:col-span-4">
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? 'Carregando...' : 'Atualizar'}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={limparFiltros}>Limpar</button>
          </div>
        </div>
      </form>

      {error && <div className="alert-error">{error}</div>}
      {message && <div className="alert-success">{message}</div>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="card sol-surface-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Faturas</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--c-text)]">{resumo.quantidade}</p>
            </div>
            <HiOutlineCreditCard className="h-5 w-5 text-[var(--c-muted)]" />
          </div>
        </div>
        <div className="card sol-surface-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Valor total</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--c-text)]">{formatCurrency(resumo.valor_total)}</p>
            </div>
            <HiOutlineBanknotes className="h-5 w-5 text-[var(--c-muted)]" />
          </div>
        </div>
        <div className="card sol-surface-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Saldo em aberto</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--c-text)]">{formatCurrency(resumo.valor_aberto)}</p>
            </div>
            <HiOutlineCalendarDays className="h-5 w-5 text-[var(--c-muted)]" />
          </div>
        </div>
        <div className="card sol-surface-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Pagas</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--c-text)]">{resumo.pagas}</p>
            </div>
            <HiOutlineCheckCircle className="h-5 w-5 text-[var(--c-muted)]" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.75fr)]">
        <section className="card sol-surface-card">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Faturas encontradas</h2>
              <p className="text-sm text-[var(--c-muted)]">Selecione uma fatura para conferir titulos e registrar pagamento.</p>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAppliedFilters({ ...filters })} disabled={loading}>
              <HiOutlineArrowPath className="h-4 w-4" /> Atualizar
            </button>
          </div>

          <div className="app-table-shell overflow-x-auto">
            <table className="table min-w-full">
              <thead>
                <tr>
                  <th>Fatura</th>
                  <th>Cartao</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th>Valor</th>
                  <th>Titulos</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7">Carregando faturas...</td></tr>
                ) : faturas.length === 0 ? (
                  <tr><td colSpan="7">Nenhuma fatura encontrada.</td></tr>
                ) : faturas.map((fatura) => (
                  <tr key={fatura.id}>
                    <td>
                      <div className="font-semibold text-[var(--c-text)]">{fatura.competencia || `#${fatura.id}`}</div>
                      <div className="text-xs text-[var(--c-muted)]">
                        {formatDate(fatura.data_inicio)} a {formatDate(fatura.data_fechamento)}
                      </div>
                    </td>
                    <td>
                      <div className="text-sm text-[var(--c-text)]">{cartaoLabel(fatura.cartao)}</div>
                      <div className="text-xs text-[var(--c-muted)]">{contaLabel(fatura.cartao?.contaBancaria)}</div>
                    </td>
                    <td>{formatDate(fatura.data_vencimento)}</td>
                    <td><span className={statusClass(fatura.status)}>{fatura.status || 'ABERTA'}</span></td>
                    <td className="font-semibold">{formatCurrency(fatura.valor_total)}</td>
                    <td>{(fatura.titulos || []).length}</td>
                    <td>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => selecionarFatura(fatura)}>
                        <HiOutlineEye className="h-4 w-4" /> Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="card sol-surface-card">
          {!selected ? (
            <div className="app-empty-card">
              Selecione uma fatura para visualizar os titulos vinculados e registrar a baixa.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--c-muted)]">Fatura selecionada</p>
                  <h2 className="text-xl font-semibold text-[var(--c-text)]">{selected.competencia}</h2>
                  <p className="text-sm text-[var(--c-muted)]">{cartaoLabel(selected.cartao)} - vence em {formatDate(selected.data_vencimento)}</p>
                </div>
                <span className={statusClass(selected.status)}>{selected.status || 'ABERTA'}</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="app-list-card">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--c-muted)]">Valor total</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--c-text)]">{formatCurrency(selected.valor_total)}</p>
                </div>
                <div className="app-list-card">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--c-muted)]">Aberto</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--c-text)]">{formatCurrency(getValorAberto(selected))}</p>
                </div>
              </div>

              {loadingDetail && <div className="app-note">Atualizando detalhes da fatura...</div>}

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--c-text)]">Titulos da fatura</h3>
                {(selected.titulos || []).length === 0 ? (
                  <div className="app-note">Nenhum titulo vinculado.</div>
                ) : (
                  <div className="app-list-stack">
                    {selected.titulos.map((titulo) => (
                      <div key={titulo.id} className="app-list-card">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-[var(--c-text)]">{titulo.codigo || `Titulo #${titulo.id}`}</div>
                            <div className="text-sm text-[var(--c-muted)]">{titulo.descricao || 'Sem descricao'}</div>
                            <div className="text-xs text-[var(--c-muted)]">{titulo.parceiro?.nome || 'Parceiro nao informado'}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-[var(--c-text)]">{formatCurrency(titulo.valor_original)}</div>
                            <span className={tituloStatusClass(titulo.status)}>{titulo.status || 'ABERTO'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {canBaixarSelected ? (
                <form className="space-y-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface-muted)] p-3" onSubmit={baixarFatura}>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--c-text)]">Baixar fatura</h3>
                    <p className="text-xs text-[var(--c-muted)]">
                      A baixa quita os titulos abertos da fatura e registra os movimentos na conta informada.
                    </p>
                  </div>
                  <label className="app-filter-field">
                    <span className="app-filter-label">Conta bancaria</span>
                    <select
                      className="input w-full input-sm"
                      value={baixaForm.conta_bancaria_id}
                      onChange={(event) => setBaixaForm((current) => ({ ...current, conta_bancaria_id: event.target.value }))}
                      required
                    >
                      <option value="">Selecione a conta real</option>
                      {contas.map((conta) => (
                        <option key={conta.id} value={conta.id}>{contaLabel(conta)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="app-filter-field">
                    <span className="app-filter-label">Data de pagamento</span>
                    <input
                      className="input w-full input-sm"
                      type="date"
                      value={baixaForm.data_pagamento}
                      onChange={(event) => setBaixaForm((current) => ({ ...current, data_pagamento: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="app-filter-field">
                    <span className="app-filter-label">Observacoes</span>
                    <textarea
                      className="input min-h-[72px] w-full"
                      value={baixaForm.observacoes}
                      onChange={(event) => setBaixaForm((current) => ({ ...current, observacoes: event.target.value }))}
                      placeholder="Opcional"
                    />
                  </label>
                  <button type="submit" className="btn btn-primary w-full" disabled={processing}>
                    {processing ? 'Baixando...' : 'Baixar fatura'}
                  </button>
                </form>
              ) : (
                <div className="app-note">
                  Esta fatura nao possui titulos abertos para baixa.
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
