import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowDownTray,
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
import { TabelaPadrao } from '../components/padrao';

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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];

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

function csvEscape(value) {
  const text = value == null ? '' : String(value);
  if (/[",\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(filename, rows) {
  const content = rows.map((row) => row.map(csvEscape).join(';')).join('\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters, pageSize]);

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

  const totalPages = Math.max(1, Math.ceil(baixas.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleStart = baixas.length === 0 ? 0 : ((safeCurrentPage - 1) * pageSize) + 1;
  const visibleEnd = Math.min(safeCurrentPage * pageSize, baixas.length);

  const baixasPaginadas = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return baixas.slice(start, start + pageSize);
  }, [baixas, pageSize, safeCurrentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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

  function exportarBaixas() {
    const headers = [
      'Data baixa',
      'Titulo',
      'Tipo',
      'Documento',
      'Parceiro',
      'Documento parceiro',
      'Obra',
      'Conta bancaria',
      'Valor base',
      'Juros',
      'Multa',
      'Desconto',
      'Valor quitacao',
      'Status',
      'Observacoes'
    ];

    const rows = baixas.map((baixa) => [
      formatDate(baixa.data_movimento),
      baixa.titulo?.codigo || `#${baixa.titulo_financeiro_id}`,
      baixa.titulo?.tipo || '',
      baixa.titulo?.numero_documento || '',
      baixa.titulo?.parceiro?.nome || '',
      baixa.titulo?.parceiro?.cpf_cnpj || '',
      baixa.titulo?.obra?.nome || '',
      baixa.contaBancaria?.nome || '',
      Number(baixa.valor || 0).toFixed(2).replace('.', ','),
      Number(baixa.juros || 0).toFixed(2).replace('.', ','),
      Number(baixa.multa || 0).toFixed(2).replace('.', ','),
      Number(baixa.desconto || 0).toFixed(2).replace('.', ','),
      Number(baixa.valor_quitacao || 0).toFixed(2).replace('.', ','),
      baixa.status || '',
      baixa.observacoes || ''
    ]);

    downloadCsv(`baixas-financeiras-${new Date().toISOString().slice(0, 10)}.csv`, [headers, ...rows]);
  }

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header-row">
        <div>
          <h1 className="page-title">Baixas Realizadas</h1>
          <p className="page-subtitle">Consulte movimentos baixados e estorne uma baixa para corrigir conta, juros, multa ou valor.</p>
        </div>
        <div className="app-page-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={exportarBaixas} disabled={loading || baixas.length === 0}>
            <HiOutlineArrowDownTray className="h-4 w-4" />
            Exportar
          </button>
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
        <div className="flex flex-col gap-3 border-b border-[var(--c-border)] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--c-text)]">Movimentos de baixa</h2>
            <p className="text-xs text-[var(--c-muted)]">Estornar libera o titulo para nova baixa, mantendo historico e auditoria.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--c-muted)]">
            <span className="whitespace-nowrap">
              {loading ? 'Carregando...' : `Exibindo ${visibleStart}-${visibleEnd} de ${baixas.length}`}
            </span>
            <label className="flex items-center gap-2 whitespace-nowrap">
              <span>Por pagina</span>
              <select
                className="input input-sm h-9 w-20"
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={loading || safeCurrentPage <= 1}
            >
              Anterior
            </button>
            <span className="min-w-12 text-center tabular-nums text-[var(--c-text)]">{safeCurrentPage}/{totalPages}</span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={loading || safeCurrentPage >= totalPages}
            >
              Proxima
            </button>
          </div>
        </div>
        <TabelaPadrao
          colunas={[
            { id: 'data', titulo: 'Data', tipo: 'data', render: (baixa) => formatDate(baixa.data_movimento) },
            {
              id: 'titulo',
              titulo: 'Titulo',
              tipo: 'codigo',
              render: (baixa) => (
                <div>
                  <Link className="font-semibold text-[var(--c-primary)] hover:underline" to={`/financeiro/titulos/${baixa.titulo_financeiro_id}`}>
                    {baixa.titulo?.codigo || `#${baixa.titulo_financeiro_id}`}
                  </Link>
                  <div className="truncate text-xs text-[var(--c-muted)]">{baixa.titulo?.descricao || '-'}</div>
                </div>
              )
            },
            { id: 'tipo', titulo: 'Tipo', tipo: 'badge', render: (baixa) => baixa.titulo?.tipo || '-' },
            {
              id: 'parceiro',
              titulo: 'Parceiro',
              // R17: o parceiro NOMEIA a baixa listada.
              tipo: 'identidade',
              noCard: 'titulo',
              render: (baixa) => (
                <div>
                  <div className="truncate">{baixa.titulo?.parceiro?.nome || '-'}</div>
                  <div className="text-xs text-[var(--c-muted)]">{baixa.titulo?.parceiro?.cpf_cnpj || ''}</div>
                </div>
              )
            },
            { id: 'obra', titulo: 'Obra', tipo: 'texto', render: (baixa) => baixa.titulo?.obra?.nome || '-' },
            { id: 'conta', titulo: 'Conta', tipo: 'texto', render: (baixa) => baixa.contaBancaria?.nome || '-' },
            { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (baixa) => formatCurrency(baixa.valor) },
            { id: 'quitacao', titulo: 'Quitacao', tipo: 'valor', render: (baixa) => formatCurrency(baixa.valor_quitacao) },
            { id: 'status', titulo: 'Status', tipo: 'status', render: (baixa) => <span className={statusClass(baixa.status)}>{baixa.status}</span> }
          ]}
          itens={loading ? [] : baixasPaginadas}
          carregando={loading}
          vazio="Nenhuma baixa encontrada."
          storageKey="tabela:financeiro-baixas"
          rotuloRolagem="Baixas financeiras"
          larguraAcoes={140}
          acoesLinha={(baixa) => (
            <>
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
            </>
          )}
        />
      </section>
    </div>
  );
}
