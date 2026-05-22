import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowDownTray,
  HiOutlineBars3,
  HiOutlineEye,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark
} from 'react-icons/hi2';
import {
  getCategoriasFinanceiras,
  getContasBancarias,
  getRelatorioAnaliticoFinanceiro
} from '../services/financeiro';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import { getMinhasObras } from '../services/obras';
import { buscarParceiros } from '../services/parceiros';

const STORAGE_KEY = 'fluxy.financeiro.relatorioAnalitico.columns';

const DEFAULT_FILTERS = {
  tipo: '',
  status_titulo: '',
  status_movimento: 'TODOS',
  q: '',
  obra_id: '',
  parceiro_id: '',
  categoria_financeira_id: '',
  conta_bancaria_id: '',
  data_inicial: '',
  data_final: '',
  vencimento_inicial: '',
  vencimento_final: '',
  limit: '500'
};

const COLUMN_DEFINITIONS = [
  { id: 'titulo_codigo', label: 'Titulo', kind: 'text', sticky: true },
  { id: 'tipo', label: 'Tipo', kind: 'text' },
  { id: 'status_titulo', label: 'Status titulo', kind: 'status' },
  { id: 'status_movimento', label: 'Status baixa', kind: 'status' },
  { id: 'parceiro_nome', label: 'Parceiro', kind: 'text' },
  { id: 'parceiro_cpf_cnpj', label: 'CPF/CNPJ', kind: 'text' },
  { id: 'obra_nome', label: 'Obra', kind: 'text' },
  { id: 'categoria_nome', label: 'Categoria', kind: 'text' },
  { id: 'numero_documento', label: 'Documento', kind: 'text' },
  { id: 'data_emissao', label: 'Emissao', kind: 'date' },
  { id: 'data_vencimento', label: 'Vencimento', kind: 'date' },
  { id: 'data_movimento', label: 'Data baixa', kind: 'date' },
  { id: 'conta_bancaria_nome', label: 'Conta', kind: 'text' },
  { id: 'valor_original', label: 'Valor original', kind: 'currency' },
  { id: 'valor_saldo', label: 'Saldo', kind: 'currency' },
  { id: 'valor_baixado', label: 'Valor baixado', kind: 'currency' },
  { id: 'valor_movimento', label: 'Valor movimento', kind: 'currency' },
  { id: 'juros', label: 'Juros', kind: 'currency' },
  { id: 'multa', label: 'Multa', kind: 'currency' },
  { id: 'desconto', label: 'Desconto', kind: 'currency' },
  { id: 'valor_quitacao', label: 'Quitacao', kind: 'currency' },
  { id: 'usuario_baixa', label: 'Usuario baixa', kind: 'text' },
  { id: 'origem', label: 'Origem', kind: 'text' }
];

function getColumnWidth(column) {
  if (column.id === 'titulo_codigo') return 122;
  if (column.id === 'parceiro_nome') return 220;
  if (column.id === 'obra_nome') return 200;
  if (column.id === 'categoria_nome') return 190;
  if (column.id === 'numero_documento') return 140;
  if (column.kind === 'currency') return 142;
  if (column.kind === 'date') return 122;
  if (column.kind === 'status') return 128;
  return 150;
}

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

function formatCell(row, column) {
  const value = row[column.id];
  if (column.kind === 'currency') return formatCurrency(value);
  if (column.kind === 'date') return formatDate(value);
  return value || '-';
}

function loadColumns() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    if (!Array.isArray(parsed)) return COLUMN_DEFINITIONS.map((item) => item.id);
    const allowed = new Set(COLUMN_DEFINITIONS.map((item) => item.id));
    const normalized = parsed.filter((id) => allowed.has(id));
    const missing = COLUMN_DEFINITIONS.map((item) => item.id).filter((id) => !normalized.includes(id));
    return [...normalized, ...missing];
  } catch (error) {
    return COLUMN_DEFINITIONS.map((item) => item.id);
  }
}

function statusClass(value) {
  const normalized = String(value || '').toUpperCase();
  if (['QUITADO', 'ATIVO'].includes(normalized)) return 'app-status-pill bg-emerald-100 text-emerald-700';
  if (['PARCIAL', 'SEM_BAIXA'].includes(normalized)) return 'app-status-pill bg-amber-100 text-amber-700';
  if (['ESTORNADO', 'CANCELADO'].includes(normalized)) return 'app-status-pill bg-rose-100 text-rose-700';
  return 'app-status-pill bg-slate-100 text-slate-700';
}

function toCsvValue(value) {
  const text = String(value ?? '');
  if (/[",;\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export default function FinanceiroRelatorioAnalitico() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [relatorio, setRelatorio] = useState({ resumo: {}, linhas: [] });
  const [obras, setObras] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [contas, setContas] = useState([]);
  const [columnOrder, setColumnOrder] = useState(loadColumns);
  const [visibleColumns, setVisibleColumns] = useState(() => new Set(COLUMN_DEFINITIONS.map((item) => item.id)));
  const [draggingColumn, setDraggingColumn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState('');

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columnOrder));
  }, [columnOrder]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getRelatorioAnaliticoFinanceiro(compact(appliedFilters))
      .then((data) => {
        if (!active) return;
        setRelatorio({
          resumo: data?.resumo || {},
          linhas: Array.isArray(data?.linhas) ? data.linhas : []
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Erro ao carregar relatorio analitico');
        setRelatorio({ resumo: {}, linhas: [] });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [appliedFilters]);

  const columns = useMemo(() => {
    const map = new Map(COLUMN_DEFINITIONS.map((item) => [item.id, item]));
    return columnOrder.map((id) => map.get(id)).filter(Boolean).filter((column) => visibleColumns.has(column.id));
  }, [columnOrder, visibleColumns]);
  const tableColumns = useMemo(
    () => [
      ...columns.map((column) => ({
        key: column.id,
        width: getColumnWidth(column),
        minWidth: column.kind === 'currency' ? 118 : 96
      })),
      { key: 'acoes', width: 84, minWidth: 72 }
    ],
    [columns]
  );

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

  function handleDrop(targetColumnId) {
    if (!draggingColumn || draggingColumn === targetColumnId) {
      setDraggingColumn(null);
      return;
    }

    setColumnOrder((current) => {
      const next = current.filter((id) => id !== draggingColumn);
      const targetIndex = next.indexOf(targetColumnId);
      next.splice(targetIndex >= 0 ? targetIndex : next.length, 0, draggingColumn);
      return next;
    });
    setDraggingColumn(null);
  }

  function toggleColumn(columnId) {
    setVisibleColumns((current) => {
      const next = new Set(current);
      if (next.has(columnId) && next.size > 1) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }

  function exportarCsv() {
    const header = columns.map((column) => toCsvValue(column.label)).join(';');
    const rows = relatorio.linhas.map((row) => (
      columns.map((column) => toCsvValue(formatCell(row, column))).join(';')
    ));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio-financeiro-analitico.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header-row">
        <div>
          <h1 className="page-title">Relatorio Analitico Financeiro</h1>
          <p className="page-subtitle">Monte a visao por titulo, baixa, conta e parceiro. Arraste as colunas para reorganizar.</p>
        </div>
        <div className="app-page-actions">
          <Link to="/financeiro/relatorios" className="btn btn-outline btn-sm">Fluxo de caixa</Link>
          <Link to="/financeiro/baixas" className="btn btn-outline btn-sm">Baixas</Link>
          <button type="button" className="btn btn-outline btn-sm" onClick={exportarCsv} disabled={!relatorio.linhas.length}>
            <HiOutlineArrowDownTray className="h-4 w-4" />
            CSV
          </button>
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
            <span className="app-filter-label">Status titulo</span>
            <select className="input w-full input-sm" value={filters.status_titulo} onChange={(event) => setFilter('status_titulo', event.target.value)}>
              <option value="">Todos</option>
              <option value="ABERTO">Aberto</option>
              <option value="PARCIAL">Parcial</option>
              <option value="QUITADO">Quitado</option>
              <option value="CANCELADO">Cancelado</option>
              <option value="ESTORNADO">Estornado</option>
            </select>
          </label>
          <label className="app-filter-field xl:col-span-2">
            <span className="app-filter-label">Status baixa</span>
            <select className="input w-full input-sm" value={filters.status_movimento} onChange={(event) => setFilter('status_movimento', event.target.value)}>
              <option value="TODOS">Todos</option>
              <option value="ATIVO">Ativo</option>
              <option value="ESTORNADO">Estornado</option>
              <option value="SEM_BAIXA">Sem baixa</option>
            </select>
          </label>
          <label className="app-filter-field xl:col-span-6">
            <span className="app-filter-label">Busca</span>
            <input className="input w-full input-sm" value={filters.q} onChange={(event) => setFilter('q', event.target.value)} placeholder="Titulo, parceiro, documento ou obra" />
          </label>
          <label className="app-filter-field xl:col-span-2">
            <span className="app-filter-label">Baixa inicial</span>
            <input className="input w-full input-sm" type="date" value={filters.data_inicial} onChange={(event) => setFilter('data_inicial', event.target.value)} />
          </label>
          <label className="app-filter-field xl:col-span-2">
            <span className="app-filter-label">Baixa final</span>
            <input className="input w-full input-sm" type="date" value={filters.data_final} onChange={(event) => setFilter('data_final', event.target.value)} />
          </label>
          <label className="app-filter-field xl:col-span-2">
            <span className="app-filter-label">Venc. inicial</span>
            <input className="input w-full input-sm" type="date" value={filters.vencimento_inicial} onChange={(event) => setFilter('vencimento_inicial', event.target.value)} />
          </label>
          <label className="app-filter-field xl:col-span-2">
            <span className="app-filter-label">Venc. final</span>
            <input className="input w-full input-sm" type="date" value={filters.vencimento_final} onChange={(event) => setFilter('vencimento_final', event.target.value)} />
          </label>
          <label className="app-filter-field xl:col-span-4">
            <span className="app-filter-label">Obra</span>
            <select className="input w-full input-sm" value={filters.obra_id} onChange={(event) => setFilter('obra_id', event.target.value)} disabled={loadingOptions}>
              <option value="">Todas</option>
              {obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}
            </select>
          </label>
          <label className="app-filter-field xl:col-span-4">
            <span className="app-filter-label">Parceiro</span>
            <select className="input w-full input-sm" value={filters.parceiro_id} onChange={(event) => setFilter('parceiro_id', event.target.value)} disabled={loadingOptions}>
              <option value="">Todos</option>
              {parceiros.map((parceiro) => <option key={parceiro.id} value={parceiro.id}>{parceiro.nome}</option>)}
            </select>
          </label>
          <label className="app-filter-field xl:col-span-4">
            <span className="app-filter-label">Categoria</span>
            <select className="input w-full input-sm" value={filters.categoria_financeira_id} onChange={(event) => setFilter('categoria_financeira_id', event.target.value)} disabled={loadingOptions}>
              <option value="">Todas</option>
              {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>)}
            </select>
          </label>
          <label className="app-filter-field xl:col-span-4">
            <span className="app-filter-label">Conta</span>
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
        <div className="card sol-surface-card"><span className="app-summary-label">Linhas</span><strong className="app-summary-value">{relatorio.resumo?.quantidade_linhas || 0}</strong></div>
        <div className="card sol-surface-card"><span className="app-summary-label">Titulos</span><strong className="app-summary-value">{relatorio.resumo?.titulos || 0}</strong></div>
        <div className="card sol-surface-card"><span className="app-summary-label">Saldo</span><strong className="app-summary-value">{formatCurrency(relatorio.resumo?.total_saldo)}</strong></div>
        <div className="card sol-surface-card"><span className="app-summary-label">Quitacao</span><strong className="app-summary-value">{formatCurrency(relatorio.resumo?.total_quitacao)}</strong></div>
      </div>

      {error ? <div className="app-alert app-alert--error">{error}</div> : null}

      <section className="card sol-surface-card">
        <div className="border-b border-[var(--c-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--c-text)]">Colunas</h2>
          <p className="text-xs text-[var(--c-muted)]">Arraste os chips para mudar a ordem. Desmarque campos que nao quer na grade ou exportacao.</p>
        </div>
        <div className="flex flex-wrap gap-2 px-4 py-3">
          {columnOrder.map((columnId) => {
            const column = COLUMN_DEFINITIONS.find((item) => item.id === columnId);
            if (!column) return null;
            const active = visibleColumns.has(column.id);
            return (
              <button
                key={column.id}
                type="button"
                draggable
                onDragStart={() => setDraggingColumn(column.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(column.id)}
                onClick={() => toggleColumn(column.id)}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text)]'
                    : 'border-dashed border-[var(--c-border)] text-[var(--c-muted)]'
                }`}
                title="Clique para mostrar/ocultar. Arraste para reposicionar."
              >
                <HiOutlineBars3 className="h-3.5 w-3.5" />
                {column.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card sol-surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <ResizableTable
            className="w-full text-xs"
            columns={tableColumns}
            storageKey="fluxy.financeiro.relatorioAnalitico.columnWidths"
          >
            <thead>
              <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg)]">
                {columns.map((column) => (
                  <ResizableTh
                    key={column.id}
                    columnKey={column.id}
                    draggable
                    onDragStart={() => setDraggingColumn(column.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleDrop(column.id)}
                    className="cursor-move px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--c-muted)] whitespace-nowrap"
                    title="Arraste para reposicionar"
                  >
                    {column.label}
                  </ResizableTh>
                ))}
                <ResizableTh
                  columnKey="acoes"
                  className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--c-muted)] whitespace-nowrap"
                >
                  Acoes
                </ResizableTh>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-border)]">
              {loading ? (
                <tr><td colSpan={columns.length + 1} className="px-3 py-8 text-center text-[var(--c-muted)]">Carregando relatorio...</td></tr>
              ) : null}
              {!loading && relatorio.linhas.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="px-3 py-8 text-center text-[var(--c-muted)]">Nenhuma linha encontrada.</td></tr>
              ) : null}
              {!loading && relatorio.linhas.map((row) => (
                <tr key={row.id} className="align-top hover:bg-[var(--c-bg)]">
                  {columns.map((column) => (
                    <td key={`${row.id}-${column.id}`} className="px-3 py-2 whitespace-nowrap">
                      {column.kind === 'status' ? (
                        <span className={statusClass(row[column.id])}>{row[column.id] || '-'}</span>
                      ) : column.id === 'titulo_codigo' ? (
                        <Link className="font-semibold text-[var(--c-primary)] hover:underline" to={`/financeiro/titulos/${row.titulo_id}`}>
                          {formatCell(row, column)}
                        </Link>
                      ) : (
                        formatCell(row, column)
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link className="btn btn-outline btn-sm" to={`/financeiro/titulos/${row.titulo_id}`} title="Abrir titulo">
                      <HiOutlineEye className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </ResizableTable>
        </div>
      </section>
    </div>
  );
}
