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
  getCartoesFinanceiros,
  getFaturasCartaoFinanceiro
} from '../services/financeiro';
import { TabelaPadrao } from '../components/padrao';

const DEFAULT_FILTERS = {
  status: 'ABERTA',
  cartao_id: ''
};

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

function cartaoLabel(cartao) {
  if (!cartao) return 'Cartao nao informado';
  const final = String(cartao.ultimos_digitos || '').replace(/\D/g, '').slice(-4);
  const bandeira = String(cartao.bandeira || '').trim();
  return final
    ? `${bandeira || 'Cartao'} final ${final}`
    : `Cartao #${cartao.id}`;
}

function contaLabel(conta) {
  if (!conta) return 'Conta nao informada';
  const banco = conta.banco || conta.tipo_operacional || 'Conta';
  return `${conta.nome || `Conta #${conta.id}`} - ${banco}`;
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
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoadingOptions(true);

    getCartoesFinanceiros()
      .then((cartoesData) => {
        if (!active) return;
        setCartoes(Array.isArray(cartoesData) ? cartoesData : []);
      })
      .catch(() => {
        if (active) setCartoes([]);
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
  }

  function limparFiltros() {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  }

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

      <div>
        <section className="card sol-surface-card">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Faturas encontradas</h2>
              <p className="text-sm text-[var(--c-muted)]">Abra uma fatura para conferir os titulos vinculados e registrar pagamento.</p>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAppliedFilters({ ...filters })} disabled={loading}>
              <HiOutlineArrowPath className="h-4 w-4" /> Atualizar
            </button>
          </div>

          <TabelaPadrao
            colunas={[
              {
                id: 'fatura',
                titulo: 'Fatura',
                tipo: 'codigo',
                render: (fatura) => (
                  <div>
                    <div className="font-semibold text-[var(--c-text)]">{fatura.competencia || `#${fatura.id}`}</div>
                    <div className="text-xs text-[var(--c-muted)]">
                      {formatDate(fatura.data_inicio)} a {formatDate(fatura.data_fechamento)}
                    </div>
                  </div>
                )
              },
              {
                id: 'cartao',
                titulo: 'Cartao',
                // R17: o cartao NOMEIA a fatura.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (fatura) => (
                  <div>
                    <div className="text-sm text-[var(--c-text)]">{cartaoLabel(fatura.cartao)}</div>
                    <div className="text-xs text-[var(--c-muted)]">{contaLabel(fatura.cartao?.contaBancaria)}</div>
                  </div>
                )
              },
              { id: 'vencimento', titulo: 'Vencimento', tipo: 'data', render: (fatura) => formatDate(fatura.data_vencimento) },
              { id: 'status', titulo: 'Status', tipo: 'status', render: (fatura) => <span className={statusClass(fatura.status)}>{fatura.status || 'ABERTA'}</span> },
              { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (fatura) => <span className="font-semibold">{formatCurrency(fatura.valor_total)}</span> },
              { id: 'titulos', titulo: 'Titulos', tipo: 'numero', render: (fatura) => (fatura.titulos || []).length }
            ]}
            itens={faturas}
            carregando={loading}
            vazio="Nenhuma fatura encontrada."
            storageKey="tabela:faturas-cartao"
            rotuloRolagem="Faturas de cartao encontradas"
            larguraAcoes={120}
            acoesLinha={(fatura) => (
              <Link
                className="app-dense-icon-action"
                to={`/financeiro/faturas-cartao/${fatura.id}`}
                title="Abrir detalhes"
                aria-label={`Abrir detalhes da fatura ${fatura.competencia || fatura.id}`}
              >
                <HiOutlineEye />
              </Link>
            )}
          />
        </section>
      </div>
    </div>
  );
}
