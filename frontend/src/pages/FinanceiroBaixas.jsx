import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineEye,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark
} from 'react-icons/hi2';
import {
  estornarMovimentoFinanceiro,
  getBaixasFinanceiras,
  getCategoriasFinanceiras,
  getContasBancarias
} from '../services/financeiro';
import { getMinhasObras } from '../services/obras';
import { buscarParceiros } from '../services/parceiros';

const DEFAULT_FILTERS = {
  tipo: '',
  status_movimento: 'ATIVO',
  q: '',
  obra_id: '',
  parceiro_id: '',
  categoria_financeira_id: '',
  conta_bancaria_id: '',
  data_inicial: '',
  data_final: '',
  limit: '200'
};

function compact(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
  );
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) return '-';
  return `${day}/${month}/${year}`;
}

function statusClass(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'ATIVO') return 'app-status-pill bg-emerald-100 text-emerald-700';
  if (normalized === 'ESTORNADO') return 'app-status-pill bg-rose-100 text-rose-700';
  return 'app-status-pill bg-slate-100 text-slate-700';
}

export default function FinanceiroBaixas() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [baixas, setBaixas] = useState([]);
  const [obras, setObras] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    let active = true;
    setLoadingOptions(true);

    Promise.all([
      getMinhasObras({ modo: 'FINANCEIRO' }).catch(() => []),
      buscarParceiros({ ativo: true, limit: 300 }).catch(() => []),
      getCategoriasFinanceiras().catch(() => []),
      getContasBancarias().catch(() => [])
    ])
      .then(([obrasData, parceirosData, categoriasData, contasData]) => {
        if (!active) return;
        setObras(Array.isArray(obrasData) ? obrasData : []);
        setParceiros(Array.isArray(parceirosData) ? parceirosData : []);
        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
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

    getBaixasFinanceiras(compact(appliedFilters))
      .then((data) => {
        if (!active) return;
        setBaixas(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Erro ao carregar baixas financeiras');
        setBaixas([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appliedFilters]);

  const resumo = useMemo(() => baixas.reduce((acc, baixa) => {
    acc.quantidade += 1;
    acc.valor += Number(baixa.valor || 0);
    acc.valor_quitacao += Number(baixa.valor_quitacao || 0);
    if (String(baixa.status || '').toUpperCase() === 'ESTORNADO') {
      acc.estornadas += 1;
    }
    return acc;
  }, {
    quantidade: 0,
    valor: 0,
    valor_quitacao: 0,
    estornadas: 0
  }), [baixas]);

  function setFilter(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: value
    }));
  }

  function aplicarFiltros(event) {
    event.preventDefault();
    setActionMessage('');
    setAppliedFilters({ ...filters });
  }

  function limparFiltros() {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setActionMessage('');
  }

  async function estornarBaixa(baixa) {
    if (String(baixa.status || '').toUpperCase() !== 'ATIVO') {
      return;
    }

    const observacoes = window.prompt(
      'Informe o motivo do estorno. A baixa nao sera apagada; ela ficara estornada para auditoria.'
    );
    if (observacoes == null) {
      return;
    }

    try {
      setProcessingId(baixa.id);
      setError('');
      setActionMessage('');
      await estornarMovimentoFinanceiro(baixa.titulo_financeiro_id, baixa.id, {
        observacoes: observacoes || 'Estorno realizado pela tela de baixas.'
      });
      setActionMessage('Baixa estornada. O titulo ja pode receber nova baixa conforme saldo atualizado.');
      const data = await getBaixasFinanceiras(compact(appliedFilters));
      setBaixas(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Erro ao estornar baixa financeira');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header-row">
        <div>
          <h1 className="page-title">Baixas Realizadas</h1>
          <p className="page-subtitle">Consulte movimentos baixados e estorne uma baixa para corrigir conta, juros, multa ou valor.</p>
        </div>
        <div className="app-page-actions">
          <Link to="/financeiro/titulos" className="btn btn-outline btn-sm">Titulos</Link>
          <Link to="/financeiro/relatorios" className="btn btn-outline btn-sm">Relatorios</Link>
        </div>
      </div>

      <form className="card sol-surface-card" onSubmit={aplicarFiltros}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
          <label className="app-filter-field xl:col-span-2">
            <span className="app-filter-label">Tipo</span>
            <select className="input w-full input-sm" value={filters.tipo} onChange={(event) => setFilter('tipo', event.target.value)}>
              <option value="">Todos</option>
              <option value="PAGAR">Pagar</option>
              <option value="RECEBER">Receber</option>
            </select>
          </label>
          <label className="app-filter-field xl:col-span-2">
            <span className="app-filter-label">Status baixa</span>
            <select className="input w-full input-sm" value={filters.status_movimento} onChange={(event) => setFilter('status_movimento', event.target.value)}>
              <option value="ATIVO">Ativas</option>
              <option value="ESTORNADO">Estornadas</option>
              <option value="TODOS">Todas</option>
            </select>
          </label>
          <label className="app-filter-field xl:col-span-4">
            <span className="app-filter-label">Busca</span>
            <input className="input w-full input-sm" value={filters.q} onChange={(event) => setFilter('q', event.target.value)} placeholder="Titulo, parceiro, documento ou obra" />
          </label>
          <label className="app-filter-field xl:col-span-2">
            <span className="app-filter-label">Data inicial</span>
            <input className="input w-full input-sm" type="date" value={filters.data_inicial} onChange={(event) => setFilter('data_inicial', event.target.value)} />
          </label>
          <label className="app-filter-field xl:col-span-2">
            <span className="app-filter-label">Data final</span>
            <input className="input w-full input-sm" type="date" value={filters.data_final} onChange={(event) => setFilter('data_final', event.target.value)} />
          </label>
          <label className="app-filter-field xl:col-span-3">
            <span className="app-filter-label">Obra</span>
            <select className="input w-full input-sm" value={filters.obra_id} onChange={(event) => setFilter('obra_id', event.target.value)} disabled={loadingOptions}>
              <option value="">Todas</option>
              {obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}
            </select>
          </label>
          <label className="app-filter-field xl:col-span-3">
            <span className="app-filter-label">Parceiro</span>
            <select className="input w-full input-sm" value={filters.parceiro_id} onChange={(event) => setFilter('parceiro_id', event.target.value)} disabled={loadingOptions}>
              <option value="">Todos</option>
              {parceiros.map((parceiro) => <option key={parceiro.id} value={parceiro.id}>{parceiro.nome}</option>)}
            </select>
          </label>
          <label className="app-filter-field xl:col-span-3">
            <span className="app-filter-label">Categoria</span>
            <select className="input w-full input-sm" value={filters.categoria_financeira_id} onChange={(event) => setFilter('categoria_financeira_id', event.target.value)} disabled={loadingOptions}>
              <option value="">Todas</option>
              {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}
            </select>
          </label>
          <label className="app-filter-field xl:col-span-3">
            <span className="app-filter-label">Conta bancaria</span>
            <select className="input w-full input-sm" value={filters.conta_bancaria_id} onChange={(event) => setFilter('conta_bancaria_id', event.target.value)} disabled={loadingOptions}>
              <option value="">Todas</option>
              {contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--c-border)] pt-3">
          <button type="button" className="btn btn-outline btn-sm" onClick={limparFiltros}>
            <HiOutlineXMark className="h-4 w-4" />
            Limpar
          </button>
          <button type="submit" className="btn btn-primary btn-sm">
            <HiOutlineMagnifyingGlass className="h-4 w-4" />
            Consultar
          </button>
        </div>
      </form>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="card sol-surface-card">
          <span className="app-summary-label">Baixas</span>
          <strong className="app-summary-value">{resumo.quantidade}</strong>
        </div>
        <div className="card sol-surface-card">
          <span className="app-summary-label">Valor base</span>
          <strong className="app-summary-value">{formatCurrency(resumo.valor)}</strong>
        </div>
        <div className="card sol-surface-card">
          <span className="app-summary-label">Valor quitacao</span>
          <strong className="app-summary-value">{formatCurrency(resumo.valor_quitacao)}</strong>
        </div>
        <div className="card sol-surface-card">
          <span className="app-summary-label">Estornadas</span>
          <strong className="app-summary-value">{resumo.estornadas}</strong>
        </div>
      </div>

      {error ? <div className="app-alert app-alert--error">{error}</div> : null}
      {actionMessage ? <div className="app-alert border border-emerald-200 bg-emerald-50 text-emerald-800">{actionMessage}</div> : null}

      <section className="card sol-surface-card overflow-hidden">
        <div className="border-b border-[var(--c-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--c-text)]">Movimentos de baixa</h2>
          <p className="text-xs text-[var(--c-muted)]">Estornar libera o titulo para nova baixa, mantendo historico e auditoria.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg)]">
                {['Data', 'Titulo', 'Tipo', 'Parceiro', 'Obra', 'Conta', 'Valor', 'Quitacao', 'Status', 'Acoes'].map((header) => (
                  <th key={header} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--c-muted)] whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-border)]">
              {loading ? (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-[var(--c-muted)]">Carregando baixas...</td></tr>
              ) : null}
              {!loading && baixas.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-8 text-center text-[var(--c-muted)]">Nenhuma baixa encontrada.</td></tr>
              ) : null}
              {!loading && baixas.map((baixa) => (
                <tr key={baixa.id} className="align-top hover:bg-[var(--c-bg)]">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(baixa.data_movimento)}</td>
                  <td className="px-3 py-2">
                    <Link className="font-semibold text-[var(--c-primary)] hover:underline" to={`/financeiro/titulos/${baixa.titulo_financeiro_id}`}>
                      {baixa.titulo?.codigo || `#${baixa.titulo_financeiro_id}`}
                    </Link>
                    <div className="max-w-[220px] truncate text-[10px] text-[var(--c-muted)]">{baixa.titulo?.descricao || '-'}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{baixa.titulo?.tipo || '-'}</td>
                  <td className="px-3 py-2">
                    <div className="max-w-[180px] truncate">{baixa.titulo?.parceiro?.nome || '-'}</div>
                    <div className="text-[10px] text-[var(--c-muted)]">{baixa.titulo?.parceiro?.cpf_cnpj || ''}</div>
                  </td>
                  <td className="px-3 py-2">{baixa.titulo?.obra?.nome || '-'}</td>
                  <td className="px-3 py-2">{baixa.contaBancaria?.nome || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatCurrency(baixa.valor)}</td>
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatCurrency(baixa.valor_quitacao)}</td>
                  <td className="px-3 py-2 whitespace-nowrap"><span className={statusClass(baixa.status)}>{baixa.status}</span></td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Link className="btn btn-outline btn-sm" to={`/financeiro/titulos/${baixa.titulo_financeiro_id}`} title="Abrir titulo">
                        <HiOutlineEye className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => estornarBaixa(baixa)}
                        disabled={processingId === baixa.id || String(baixa.status || '').toUpperCase() !== 'ATIVO'}
                        title="Estornar baixa"
                      >
                        {processingId === baixa.id ? <HiOutlineArrowPath className="h-4 w-4 animate-spin" /> : <HiOutlineBanknotes className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
