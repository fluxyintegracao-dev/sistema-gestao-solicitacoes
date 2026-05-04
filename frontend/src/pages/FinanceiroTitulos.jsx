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

const FILTER_STORAGE_KEY = 'fluxy.financeiro.titulos.filters';

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
    descricao: '',
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
  const [draftFilters, setDraftFilters] = useState(() => {
    try {
      const stored = localStorage.getItem(FILTER_STORAGE_KEY);
      return normalizeFilters(stored ? JSON.parse(stored) : getDefaultFilters());
    } catch (error) {
      return getDefaultFilters();
    }
  });
  const [appliedFilters, setAppliedFilters] = useState(() => normalizeFilters(draftFilters));
  const [obras, setObras] = useState([]);
  const [parceiros, setParceiros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [titulos, setTitulos] = useState([]);
  const [loading, setLoading] = useState(true);
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
    let active = true;
    setLoading(true);
    setError('');

    getTitulosFinanceiros(compactFilters(appliedFilters))
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
      return !tipo || !categoriaTipo || categoriaTipo === 'AMBOS' || categoriaTipo === tipo;
    });
  }, [categorias, draftFilters.tipo]);

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
  const tipoLabel = appliedFilters.tipo === 'PAGAR' ? 'a pagar' : 'a receber';

  function setFilter(name, value) {
    setDraftFilters((current) => ({
      ...current,
      [name]: value
    }));
  }

  function submitFilters(event) {
    event.preventDefault();
    const normalized = normalizeFilters(draftFilters);
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
    setAppliedFilters(defaults);
    localStorage.removeItem(FILTER_STORAGE_KEY);
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

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
            <label className="app-filter-field xl:col-span-2">
              <span className="app-filter-label">Tipo</span>
              <select
                className="input w-full input-sm"
                value={draftFilters.tipo}
                onChange={(event) => setFilter('tipo', event.target.value)}
              >
                <option value="RECEBER">Receber</option>
                <option value="PAGAR">Pagar</option>
              </select>
            </label>

            <label className="app-filter-field xl:col-span-2">
              <span className="app-filter-label">Titulo</span>
              <input
                className="input w-full input-sm"
                value={draftFilters.codigo}
                onChange={(event) => setFilter('codigo', event.target.value)}
                placeholder="TIT-000001"
              />
            </label>

            <label className="app-filter-field xl:col-span-4">
              <span className="app-filter-label">Busca rapida</span>
              <input
                className="input w-full input-sm"
                value={draftFilters.q}
                onChange={(event) => setFilter('q', event.target.value)}
                placeholder="Cliente, obra, documento ou descricao"
              />
            </label>

            <label className="app-filter-field xl:col-span-2">
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

            <label className="app-filter-field xl:col-span-2">
              <span className="app-filter-label">N. documento</span>
              <input
                className="input w-full input-sm"
                value={draftFilters.numero_documento}
                onChange={(event) => setFilter('numero_documento', event.target.value)}
                placeholder="Ex.: NF, contrato"
              />
            </label>

            <label className="app-filter-field xl:col-span-4">
              <span className="app-filter-label">Cliente / fornecedor</span>
              <select
                className="input w-full input-sm"
                value={draftFilters.parceiro_id}
                onChange={(event) => setFilter('parceiro_id', event.target.value)}
                disabled={loadingOptions}
              >
                <option value="">Todos os parceiros</option>
                {parceiros.map((parceiro) => (
                  <option key={parceiro.id} value={parceiro.id}>
                    {parceiro.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="app-filter-field xl:col-span-4">
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

            <label className="app-filter-field xl:col-span-2">
              <span className="app-filter-label">Emissao inicio</span>
              <input
                className="input w-full input-sm"
                type="date"
                value={draftFilters.data_emissao_inicial}
                onChange={(event) => setFilter('data_emissao_inicial', event.target.value)}
              />
            </label>

            <label className="app-filter-field xl:col-span-2">
              <span className="app-filter-label">Emissao fim</span>
              <input
                className="input w-full input-sm"
                type="date"
                value={draftFilters.data_emissao_final}
                onChange={(event) => setFilter('data_emissao_final', event.target.value)}
              />
            </label>
          </div>

          <div className={`grid transition-[grid-template-rows] duration-200 ${advancedOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden">
              <div className="grid gap-3 border-t border-[var(--c-border)] pt-3 md:grid-cols-2 xl:grid-cols-12">
                <label className="app-filter-field xl:col-span-3">
                  <span className="app-filter-label">Categoria financeira</span>
                  <select
                    className="input w-full input-sm"
                    value={draftFilters.categoria_financeira_id}
                    onChange={(event) => setFilter('categoria_financeira_id', event.target.value)}
                    disabled={loadingOptions}
                  >
                    <option value="">Todas as categorias</option>
                    {categoriasFiltradas.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>{categoria.nome}</option>
                    ))}
                  </select>
                </label>

                <label className="app-filter-field xl:col-span-3">
                  <span className="app-filter-label">Descricao</span>
                  <input
                    className="input w-full input-sm"
                    value={draftFilters.descricao}
                    onChange={(event) => setFilter('descricao', event.target.value)}
                    placeholder="Texto da descricao"
                  />
                </label>

                <label className="app-filter-field xl:col-span-2">
                  <span className="app-filter-label">Vencimento inicio</span>
                  <input
                    className="input w-full input-sm"
                    type="date"
                    value={draftFilters.vencimento_inicial}
                    onChange={(event) => setFilter('vencimento_inicial', event.target.value)}
                  />
                </label>

                <label className="app-filter-field xl:col-span-2">
                  <span className="app-filter-label">Vencimento fim</span>
                  <input
                    className="input w-full input-sm"
                    type="date"
                    value={draftFilters.vencimento_final}
                    onChange={(event) => setFilter('vencimento_final', event.target.value)}
                  />
                </label>

                <div className="xl:col-span-2 flex items-end">
                  <Link to="/financeiro/conciliacao" className="btn btn-outline btn-sm w-full">
                    Conciliacao OFX
                  </Link>
                </div>
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
              {loading ? 'Carregando titulos...' : `${titulos.length} titulo(s) encontrados.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/financeiro/cadastros" className="btn btn-outline btn-sm">Cadastros</Link>
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
                  'Cliente/Fornecedor',
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
              {loading ? (
                <tr>
                  <td colSpan={totalColunas} className="px-3 py-8 text-center text-[var(--c-muted)]">
                    Carregando...
                  </td>
                </tr>
              ) : null}

              {!loading && titulos.length === 0 ? (
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
