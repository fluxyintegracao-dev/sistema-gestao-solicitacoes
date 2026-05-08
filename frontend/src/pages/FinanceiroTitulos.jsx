import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineAdjustmentsHorizontal,
  HiOutlineDocumentChartBar,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineSparkles,
  HiOutlineXMark
} from 'react-icons/hi2';
import { useAuth } from '../contexts/AuthContext';
import {
  getCategoriasFinanceiras,
  getTitulosFinanceiros
} from '../services/financeiro';
import { getMinhasObras } from '../services/obras';
import { buscarParceiros } from '../services/parceiros';
import { canViewIntegracaoSienge } from '../utils/acessoProduto';
import ParceiroAutocomplete from '../components/ui/ParceiroAutocomplete';

const FILTER_STORAGE_KEY = 'fluxy.financeiro.titulos.filters';
const FILTER_VISIBILITY_STORAGE_PREFIX = 'fluxy.financeiro.titulos.visibleFilters';

const FILTER_DEFINITIONS = [
  { id: 'codigo', label: 'Titulo', group: 'basic', span: 'xl:col-span-2' },
  { id: 'q', label: 'Busca rapida', group: 'basic', span: 'xl:col-span-4' },
  { id: 'status', label: 'Status', group: 'basic', span: 'xl:col-span-2' },
  { id: 'numero_documento', label: 'N. documento', group: 'basic', span: 'xl:col-span-2' },
  { id: 'parceiro_id', label: 'Cliente/Credor', group: 'basic', span: 'xl:col-span-4' },
  { id: 'obra_id', label: 'Obra', group: 'basic', span: 'xl:col-span-4' },
  { id: 'data_emissao_inicial', label: 'Emissao inicio', group: 'basic', span: 'xl:col-span-2' },
  { id: 'data_emissao_final', label: 'Emissao fim', group: 'basic', span: 'xl:col-span-2' },
  { id: 'categoria_financeira_id', label: 'Categoria financeira', group: 'advanced', span: 'xl:col-span-3' },
  { id: 'vencimento_inicial', label: 'Vencimento inicio', group: 'advanced', span: 'xl:col-span-2' },
  { id: 'vencimento_final', label: 'Vencimento fim', group: 'advanced', span: 'xl:col-span-2' }
];

const DEFAULT_VISIBLE_FILTER_IDS = FILTER_DEFINITIONS.map((item) => item.id);

function getDefaultFilters() {
  return {
    tipo: 'RECEBER',
    status: 'ABERTO',
    q: '',
    codigo: '',
    obra_id: '',
    parceiro_id: '',
    categoria_financeira_id: '',
    numero_documento: '',
    data_emissao_inicial: '',
    data_emissao_final: '',
    vencimento_inicial: '',
    vencimento_final: ''
  };
}

function normalizeFilters(filters = {}) {
  return {
    ...getDefaultFilters(),
    ...Object.fromEntries(
      Object.entries(filters || {}).map(([key, value]) => [key, value == null ? '' : String(value)])
    )
  };
}

function compactFilters(filters = {}) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
  );
}

function getVisibilityStorageKey(user) {
  const userToken = user?.id || user?.email || 'anonimo';
  return `${FILTER_VISIBILITY_STORAGE_PREFIX}.${userToken}`;
}

function loadVisibleFilterIds(user) {
  try {
    const stored = localStorage.getItem(getVisibilityStorageKey(user));
    const parsed = stored ? JSON.parse(stored) : null;
    if (!Array.isArray(parsed)) {
      return DEFAULT_VISIBLE_FILTER_IDS;
    }

    const allowed = new Set(FILTER_DEFINITIONS.map((item) => item.id));
    const normalized = parsed.filter((id) => allowed.has(id));
    return normalized.length > 0 ? normalized : DEFAULT_VISIBLE_FILTER_IDS;
  } catch (error) {
    return DEFAULT_VISIBLE_FILTER_IDS;
  }
}

function pickVisibleFilters(filters, visibleFilterIds) {
  const visible = new Set(visibleFilterIds);
  return Object.fromEntries(
    Object.entries(filters).filter(([key]) => key === 'tipo' || visible.has(key))
  );
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function statusClass(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'QUITADO') return 'app-status-pill bg-emerald-100 text-emerald-700';
  if (normalized === 'PARCIAL') return 'app-status-pill bg-amber-100 text-amber-700';
  if (normalized === 'CANCELADO' || normalized === 'ESTORNADO') return 'app-status-pill bg-rose-100 text-rose-700';
  return 'app-status-pill bg-slate-100 text-slate-700';
}

function queueStatusClass(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'SUCESSO') return 'app-status-pill bg-emerald-100 text-emerald-700';
  if (normalized === 'ERRO') return 'app-status-pill bg-rose-100 text-rose-700';
  if (normalized === 'PROCESSANDO') return 'app-status-pill bg-amber-100 text-amber-700';
  return 'app-status-pill bg-slate-100 text-slate-700';
}

function isOverdue(titulo) {
  const normalized = String(titulo?.status || '').trim().toUpperCase();
  if (!['ABERTO', 'PARCIAL'].includes(normalized)) return false;
  const today = new Date();
  const dueDate = new Date(`${titulo?.data_vencimento}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) return false;
  return dueDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function getTituloCodigo(titulo) {
  return titulo?.codigo || `#${titulo?.id}`;
}

function getOrigemTitulo(titulo) {
  if (titulo?.solicitacao?.id) return 'Solicitacao';
  if (titulo?.forma_cobranca) return 'Comercial';
  return 'Manual';
}

export default function FinanceiroTitulos() {
  const { user } = useAuth();
  const [saveFilterCache, setSaveFilterCache] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filterChooserOpen, setFilterChooserOpen] = useState(false);
  const [visibleFilterIds, setVisibleFilterIds] = useState(() => loadVisibleFilterIds(user));
  const [draftFilters, setDraftFilters] = useState(() => {
    try {
      const stored = localStorage.getItem(FILTER_STORAGE_KEY);
      return normalizeFilters(stored ? JSON.parse(stored) : getDefaultFilters());
    } catch (error) {
      return getDefaultFilters();
    }
  });
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [obras, setObras] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [titulos, setTitulos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoadingOptions(true);

    Promise.all([
      getMinhasObras({ modo: 'FINANCEIRO' }).catch(() => []),
      buscarParceiros({ ativo: true, limit: 200 }).catch(() => []),
      getCategoriasFinanceiras().catch(() => [])
    ])
      .then(([obrasData, parceirosData, categoriasData]) => {
        if (!active) return;
        setObras(Array.isArray(obrasData) ? obrasData : []);
        setParceiros(Array.isArray(parceirosData) ? parceirosData : []);
        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
      })
      .finally(() => {
        if (active) {
          setLoadingOptions(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setVisibleFilterIds(loadVisibleFilterIds(user));
    setFilterChooserOpen(false);
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!appliedFilters) {
      setTitulos([]);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError('');

    getTitulosFinanceiros(compactFilters(pickVisibleFilters(appliedFilters, visibleFilterIds)))
      .then((data) => {
        if (active) {
          setTitulos(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err?.message || 'Erro ao carregar titulos financeiros');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [appliedFilters]);

  const categoriasFiltradas = useMemo(() => {
    const tipo = String(draftFilters.tipo || '').toUpperCase();
    return categorias.filter((categoria) => {
      const categoriaTipo = String(categoria?.tipo || '').toUpperCase();
      return categoriaTipo === tipo;
    });
  }, [categorias, draftFilters.tipo]);

  const parceirosFiltrados = useMemo(() => {
    const tipo = String(draftFilters.tipo || '').toUpperCase();
    return parceiros.filter((parceiro) => (
      tipo === 'PAGAR'
        ? parceiro?.fornecedor !== false || parceiro?.corretor === true
        : parceiro?.cliente !== false
    ));
  }, [parceiros, draftFilters.tipo]);

  const resumo = useMemo(() => titulos.reduce((acc, item) => {
    acc.total += Number(item.valor_original || 0);
    acc.saldo += Number(item.valor_saldo || 0);
    acc.quantidade += 1;
    if (isOverdue(item)) {
      acc.vencido += Number(item.valor_saldo || 0);
      acc.quantidadeVencida += 1;
    }
    return acc;
  }, {
    total: 0,
    saldo: 0,
    vencido: 0,
    quantidade: 0,
    quantidadeVencida: 0
  }), [titulos]);

  const mostraColunaSienge = canViewIntegracaoSienge(user);
  const totalColunas = mostraColunaSienge ? 14 : 13;
  const hasConsulted = Boolean(appliedFilters);
  const visibleFilterSet = useMemo(() => new Set(visibleFilterIds), [visibleFilterIds]);
  const basicVisibleFilters = useMemo(
    () => FILTER_DEFINITIONS.filter((item) => item.group === 'basic' && visibleFilterSet.has(item.id)),
    [visibleFilterSet]
  );
  const advancedVisibleFilters = useMemo(
    () => FILTER_DEFINITIONS.filter((item) => item.group === 'advanced' && visibleFilterSet.has(item.id)),
    [visibleFilterSet]
  );
  const tipoReferencia = appliedFilters?.tipo || draftFilters.tipo;
  const tipoLabel = tipoReferencia === 'PAGAR' ? 'a pagar' : 'a receber';
  const parceiroLabel = draftFilters.tipo === 'PAGAR' ? 'Credor' : 'Cliente';
  const parceiroResultadoLabel = tipoReferencia === 'PAGAR' ? 'Credor' : 'Cliente';
  const categoriasLabel = draftFilters.tipo === 'PAGAR' ? 'contas a pagar' : 'contas a receber';

  function setFilter(name, value) {
    setDraftFilters((current) => ({
      ...current,
      [name]: value
    }));
  }

  function setTipoFiltro(tipo) {
    setDraftFilters({
      ...getDefaultFilters(),
      tipo
    });
    setAppliedFilters(null);
    setTitulos([]);
    setLoading(false);
    setError('');
  }

  function submitFilters(event) {
    event.preventDefault();
    const normalized = normalizeFilters(draftFilters);
    const visibleFilters = pickVisibleFilters(normalized, visibleFilterIds);
    if (Object.keys(compactFilters(visibleFilters)).length === 0) {
      setError('Selecione ao menos um filtro visivel antes de consultar.');
      setTitulos([]);
      setAppliedFilters(null);
      return;
    }

    setAppliedFilters(normalized);
    if (saveFilterCache) {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(normalized));
    } else {
      localStorage.removeItem(FILTER_STORAGE_KEY);
    }
  }

  function clearFilters() {
    const defaults = getDefaultFilters();
    setDraftFilters(defaults);
    setAppliedFilters(null);
    setTitulos([]);
    setLoading(false);
    setError('');
    localStorage.removeItem(FILTER_STORAGE_KEY);
  }

  function persistVisibleFilters(nextIds) {
    const normalized = nextIds.length > 0 ? nextIds : DEFAULT_VISIBLE_FILTER_IDS;
    setVisibleFilterIds(normalized);
    localStorage.setItem(getVisibilityStorageKey(user), JSON.stringify(normalized));
  }

  function toggleVisibleFilter(filterId) {
    const current = new Set(visibleFilterIds);
    if (current.has(filterId)) {
      current.delete(filterId);
    } else {
      current.add(filterId);
    }

    persistVisibleFilters(FILTER_DEFINITIONS
      .map((item) => item.id)
      .filter((id) => current.has(id)));
  }

  function resetVisibleFilters() {
    persistVisibleFilters(DEFAULT_VISIBLE_FILTER_IDS);
  }

  function renderFilterField(filter) {
    const commonClass = `app-filter-field ${filter.span || ''}`;

    switch (filter.id) {
      case 'codigo':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Titulo</span>
            <input
              className="input w-full input-sm"
              value={draftFilters.codigo}
              onChange={(event) => setFilter('codigo', event.target.value)}
              placeholder="TIT-000001"
            />
          </label>
        );
      case 'q':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Busca rapida</span>
            <input
              className="input w-full input-sm"
              value={draftFilters.q}
              onChange={(event) => setFilter('q', event.target.value)}
              placeholder="Cliente/credor, obra, documento ou texto"
            />
          </label>
        );
      case 'status':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Status</span>
            <select
              className="input w-full input-sm"
              value={draftFilters.status}
              onChange={(event) => setFilter('status', event.target.value)}
            >
              <option value="">Todos</option>
              <option value="ABERTO">Aberto</option>
              <option value="PARCIAL">Parcial</option>
              <option value="QUITADO">Quitado</option>
              <option value="CANCELADO">Cancelado</option>
              <option value="ESTORNADO">Estornado</option>
            </select>
          </label>
        );
      case 'numero_documento':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">N. documento</span>
            <input
              className="input w-full input-sm"
              value={draftFilters.numero_documento}
              onChange={(event) => setFilter('numero_documento', event.target.value)}
              placeholder="Ex.: NF, contrato"
            />
          </label>
        );
      case 'parceiro_id':
        return (
          <ParceiroAutocomplete
            key={filter.id}
            className={commonClass}
            inputClassName="input w-full input-sm"
            label={parceiroLabel}
            value={draftFilters.parceiro_id}
            options={parceirosFiltrados}
            onChange={(nextValue) => setFilter('parceiro_id', nextValue)}
            disabled={loadingOptions}
            placeholder={draftFilters.tipo === 'PAGAR' ? 'Digite o credor' : 'Digite o cliente'}
            emptyLabel={draftFilters.tipo === 'PAGAR' ? 'Nenhum credor encontrado' : 'Nenhum cliente encontrado'}
          />
        );
      case 'obra_id':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Obra</span>
            <select
              className="input w-full input-sm"
              value={draftFilters.obra_id}
              onChange={(event) => setFilter('obra_id', event.target.value)}
              disabled={loadingOptions}
            >
              <option value="">Todas as obras</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>{obra.nome}</option>
              ))}
            </select>
          </label>
        );
      case 'data_emissao_inicial':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Emissao inicio</span>
            <input
              className="input w-full input-sm"
              type="date"
              value={draftFilters.data_emissao_inicial}
              onChange={(event) => setFilter('data_emissao_inicial', event.target.value)}
            />
          </label>
        );
      case 'data_emissao_final':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Emissao fim</span>
            <input
              className="input w-full input-sm"
              type="date"
              value={draftFilters.data_emissao_final}
              onChange={(event) => setFilter('data_emissao_final', event.target.value)}
            />
          </label>
        );
      case 'categoria_financeira_id':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Categoria financeira</span>
            <select
              className="input w-full input-sm"
              value={draftFilters.categoria_financeira_id}
              onChange={(event) => setFilter('categoria_financeira_id', event.target.value)}
              disabled={loadingOptions}
            >
              <option value="">Todas as categorias de {categoriasLabel}</option>
              {categoriasFiltradas.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
              ))}
            </select>
          </label>
        );
      case 'vencimento_inicial':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Vencimento inicio</span>
            <input
              className="input w-full input-sm"
              type="date"
              value={draftFilters.vencimento_inicial}
              onChange={(event) => setFilter('vencimento_inicial', event.target.value)}
            />
          </label>
        );
      case 'vencimento_final':
        return (
          <label key={filter.id} className={commonClass}>
            <span className="app-filter-label">Vencimento fim</span>
            <input
              className="input w-full input-sm"
              type="date"
              value={draftFilters.vencimento_final}
              onChange={(event) => setFilter('vencimento_final', event.target.value)}
            />
          </label>
        );
      default:
        return null;
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header-row">
        <div>
          <h1 className="page-title">Consulta de Titulos Financeiros</h1>
          <p className="page-subtitle">Filtre a carteira antes de operar baixas, boletos e integracoes.</p>
        </div>
        <div className="app-page-actions">
          <Link to="/financeiro/relatorios" className="btn btn-outline btn-sm">
            <HiOutlineDocumentChartBar className="h-4 w-4" />
            Relatorios
          </Link>
          <Link to="/financeiro/baixas" className="btn btn-outline btn-sm">
            Baixas
          </Link>
          <Link to="/financeiro/conciliacao" className="btn btn-outline btn-sm">
            Conciliacao OFX
          </Link>
          <Link to={`/financeiro/titulos/novo?tipo=${draftFilters.tipo || 'RECEBER'}`} className="btn btn-primary btn-sm">
            <HiOutlinePlus className="h-4 w-4" />
            Novo titulo
          </Link>
        </div>
      </div>

      <form className="card sol-surface-card app-toolbar-card" onSubmit={submitFilters}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--c-text)]">Consulta de titulos {tipoLabel}</h2>
              <p className="text-xs text-[var(--c-muted)]">A lista abaixo atualiza somente ao consultar.</p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-[var(--c-text)]">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--c-primary)]"
                checked={saveFilterCache}
                onChange={(event) => setSaveFilterCache(event.target.checked)}
              />
              Salvar filtro neste navegador
            </label>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="app-filter-label">Tipo</span>
            <div className="inline-grid w-full max-w-[220px] grid-cols-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-1">
              {[
                { value: 'RECEBER', label: 'Receber' },
                { value: 'PAGAR', label: 'Pagar' }
              ].map((option) => {
                const active = draftFilters.tipo === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-[var(--c-primary)] text-white shadow-sm'
                        : 'text-[var(--c-muted)] hover:bg-[var(--c-surface)] hover:text-[var(--c-text)]'
                    }`}
                    onClick={() => setTipoFiltro(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
            {basicVisibleFilters.map((filter) => renderFilterField(filter))}
            {basicVisibleFilters.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--c-border)] px-3 py-4 text-sm text-[var(--c-muted)] xl:col-span-12">
                Nenhum filtro principal visivel. Use o olho em filtros para escolher os campos.
              </div>
            ) : null}
          </div>

          <div className={`grid transition-[grid-template-rows] duration-200 ${advancedOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden">
              <div className="grid gap-3 border-t border-[var(--c-border)] pt-3 md:grid-cols-2 xl:grid-cols-12">
                {advancedVisibleFilters.map((filter) => renderFilterField(filter))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[var(--c-border)] pt-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setAdvancedOpen((current) => !current)}
              >
                <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
                {advancedOpen ? 'Menos filtros' : 'Mais filtros'}
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setFilterChooserOpen(true)}
                title="Escolher filtros visiveis"
              >
                <HiOutlineEye className="h-4 w-4" />
                Filtros
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={clearFilters}>
                <HiOutlineXMark className="h-4 w-4" />
                Limpar
              </button>
            </div>

            <button type="submit" className="btn btn-primary btn-sm">
              <HiOutlineMagnifyingGlass className="h-4 w-4" />
              Consultar
            </button>
          </div>
        </div>
      </form>

      {filterChooserOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--c-border)] px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-[var(--c-text)]">Filtros visiveis</div>
                <div className="text-[11px] text-[var(--c-muted)]">Salvo apenas para este usuario neste navegador.</div>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-[var(--c-muted)] hover:bg-[var(--c-bg)] hover:text-[var(--c-text)]"
                onClick={() => setFilterChooserOpen(false)}
                title="Fechar"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-1 overflow-y-auto px-3 py-3">
              {FILTER_DEFINITIONS.map((filter) => {
                const checked = visibleFilterSet.has(filter.id);
                return (
                  <label
                    key={filter.id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-[var(--c-bg)]"
                  >
                    <span className="text-[var(--c-text)]">{filter.label}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--c-primary)]"
                      checked={checked}
                      onChange={() => toggleVisibleFilter(filter.id)}
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex justify-between border-t border-[var(--c-border)] px-4 py-3">
              <button type="button" className="btn btn-outline btn-sm" onClick={resetVisibleFilters}>
                Restaurar
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setFilterChooserOpen(false)}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: 'Titulos filtrados', value: String(resumo.quantidade), icon: HiOutlineDocumentText },
          { label: 'Valor total', value: formatCurrency(resumo.total), icon: HiOutlineSparkles },
          { label: 'Saldo em aberto', value: formatCurrency(resumo.saldo), icon: HiOutlineDocumentChartBar },
          { label: 'Vencidos', value: formatCurrency(resumo.vencido), sub: `${resumo.quantidadeVencida} titulo(s)`, icon: HiOutlineAdjustmentsHorizontal }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="card sol-surface-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wide text-[var(--c-muted)]">{item.label}</span>
                  <div className="mt-1 text-lg font-semibold text-[var(--c-text)] tabular-nums">{item.value}</div>
                  {item.sub ? <div className="text-xs text-[var(--c-muted)]">{item.sub}</div> : null}
                </div>
                <Icon className="h-5 w-5 text-[var(--c-primary)]" />
              </div>
            </div>
          );
        })}
      </div>

      {error ? <div className="app-alert app-alert--error">{error}</div> : null}

      <div className="sol-surface-card card overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-[var(--c-border)] px-3 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--c-text)]">Resultado da consulta</h2>
            <p className="text-xs text-[var(--c-muted)]">
              {!hasConsulted
                ? 'Aplique um filtro para carregar os titulos.'
                : loading
                  ? 'Carregando titulos...'
                  : `${titulos.length} titulo(s) encontrados.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/financeiro/cadastros" className="btn btn-outline btn-sm">Cadastros</Link>
            <Link to="/financeiro/baixas" className="btn btn-outline btn-sm">Baixas</Link>
            <Link to="/financeiro/relatorios" className="btn btn-outline btn-sm">Gerar relatorio</Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg)]">
                {[
                  'Titulo',
                  'Status',
                  'Tipo',
                  'Documento',
                  parceiroResultadoLabel,
                  'Obra',
                  'Categoria',
                  'Origem',
                  ...(mostraColunaSienge ? ['SIENGE'] : []),
                  'Emissao',
                  'Vencimento',
                  'Valor total',
                  'Saldo',
                  'Acoes'
                ].map((header) => (
                  <th
                    key={header}
                    className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--c-muted)] whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-border)]">
              {!hasConsulted ? (
                <tr>
                  <td colSpan={totalColunas} className="px-3 py-10 text-center">
                    <div className="mx-auto max-w-md">
                      <div className="text-sm font-medium text-[var(--c-text)]">Nenhum filtro aplicado</div>
                      <p className="mt-1 text-xs text-[var(--c-muted)]">
                        A tabela fica vazia ate voce consultar os titulos com os filtros desejados.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}

              {loading ? (
                <tr>
                  <td colSpan={totalColunas} className="px-3 py-8 text-center text-[var(--c-muted)]">
                    Carregando...
                  </td>
                </tr>
              ) : null}

              {hasConsulted && !loading && titulos.length === 0 ? (
                <tr>
                  <td colSpan={totalColunas} className="px-3 py-10 text-center">
                    <div className="mx-auto max-w-md">
                      <div className="text-sm font-medium text-[var(--c-text)]">Nenhum titulo encontrado</div>
                      <p className="mt-1 text-xs text-[var(--c-muted)]">
                        Ajuste os filtros ou limpe a consulta para ampliar o resultado.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}

              {!loading && titulos.map((titulo) => (
                <tr
                  key={titulo.id}
                  className={`align-top transition-colors hover:bg-[var(--c-bg)] ${isOverdue(titulo) ? 'bg-rose-50/40' : ''}`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link
                      className="font-semibold text-[var(--c-primary)] hover:underline"
                      to={`/financeiro/titulos/${titulo.id}`}
                    >
                      {getTituloCodigo(titulo)}
                    </Link>
                    <div className="max-w-[220px] truncate text-[10px] text-[var(--c-muted)]">
                      {titulo.descricao || '-'}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={statusClass(titulo.status)}>{titulo.status}</span>
                  </td>
                  <td className="px-3 py-2 font-medium text-[var(--c-muted)] whitespace-nowrap">{titulo.tipo}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{titulo.numero_documento || '-'}</td>
                  <td className="px-3 py-2">
                    <div className="max-w-[180px] truncate font-medium text-[var(--c-text)]">{titulo.parceiro?.nome || '-'}</div>
                    <div className="text-[10px] text-[var(--c-muted)]">{titulo.parceiro?.cpf_cnpj || ''}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="max-w-[150px] truncate text-[var(--c-muted)]">{titulo.obra?.nome || '-'}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="max-w-[150px] truncate text-[var(--c-muted)]">{titulo.categoriaFinanceira?.nome || '-'}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {titulo.solicitacao?.id ? (
                      <Link
                        className="text-[var(--c-primary)] hover:underline"
                        to={`/solicitacoes/${titulo.solicitacao.id}`}
                      >
                        {titulo.solicitacao.codigo || `#${titulo.solicitacao.id}`}
                      </Link>
                    ) : (
                      getOrigemTitulo(titulo)
                    )}
                  </td>
                  {mostraColunaSienge ? (
                    <td className="px-3 py-2 whitespace-nowrap">
                      {String(titulo.tipo || '').trim().toUpperCase() !== 'PAGAR' ? (
                        <span className="text-[var(--c-muted)]">-</span>
                      ) : titulo.integracaoSienge ? (
                        <div>
                          <span className={queueStatusClass(titulo.integracaoSienge.status)}>
                            {titulo.integracaoSienge.status}
                          </span>
                          <div className="mt-1 text-[10px] text-[var(--c-muted)]">
                            {titulo.integracaoSienge.external_title_id
                              ? `Externo: ${titulo.integracaoSienge.external_title_id}`
                              : `Tentativas: ${titulo.integracaoSienge.tentativas || 0}`}
                          </div>
                        </div>
                      ) : (
                        <span className="app-status-pill bg-slate-100 text-slate-700">NAO ENVIADO</span>
                      )}
                    </td>
                  ) : null}
                  <td className="px-3 py-2 whitespace-nowrap text-[var(--c-muted)]">{formatDate(titulo.data_emissao)}</td>
                  <td className={`px-3 py-2 whitespace-nowrap ${isOverdue(titulo) ? 'font-semibold text-rose-600' : 'text-[var(--c-text)]'}`}>
                    {formatDate(titulo.data_vencimento)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-[var(--c-text)] tabular-nums">
                    {formatCurrency(titulo.valor_original)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-semibold text-[var(--c-text)] tabular-nums">
                    {formatCurrency(titulo.valor_saldo)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link
                      className="btn btn-outline btn-sm"
                      to={`/financeiro/titulos/${titulo.id}`}
                      title="Abrir titulo"
                    >
                      <HiOutlineEye className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
