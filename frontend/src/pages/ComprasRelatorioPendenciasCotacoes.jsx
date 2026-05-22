import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import { obterRelatorioPendenciasCotacoesCompras } from '../services/compras';
import { getMinhasObras } from '../services/obras';

const DEFAULT_FILTERS = {
  obra_id: '',
  data_inicio: '',
  data_fim: ''
};

const COTACAO_COLUMNS = [
  { key: 'cotacao', width: 130, minWidth: 100 },
  { key: 'titulo', width: 240, minWidth: 170 },
  { key: 'obra', width: 220, minWidth: 150 },
  { key: 'status', width: 120, minWidth: 95 },
  { key: 'fornecedores', width: 150, minWidth: 120 },
  { key: 'respostas', width: 130, minWidth: 105 },
  { key: 'pendencias', width: 180, minWidth: 140 },
  { key: 'criada', width: 120, minWidth: 100 }
];

const VENCIDO_COLUMNS = [
  { key: 'cotacao', width: 130, minWidth: 100 },
  { key: 'fornecedor', width: 240, minWidth: 170 },
  { key: 'obra', width: 220, minWidth: 150 },
  { key: 'enviado', width: 120, minWidth: 100 },
  { key: 'visualizado', width: 120, minWidth: 100 },
  { key: 'prazo', width: 120, minWidth: 100 }
];

const OBRA_COLUMNS = [
  { key: 'obra', width: 260, minWidth: 170 },
  { key: 'cotacoes', width: 110, minWidth: 90 },
  { key: 'sem_minimo', width: 130, minWidth: 105 },
  { key: 'vencidas', width: 130, minWidth: 105 }
];

function readFilters(searchParams) {
  return {
    obra_id: searchParams.get('obra_id') || '',
    data_inicio: searchParams.get('data_inicio') || '',
    data_fim: searchParams.get('data_fim') || ''
  };
}

function buildSearchParams(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });
  return params;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}%`;
}

function formatDate(value) {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return parsed.toLocaleDateString('pt-BR');
}

function extractErrorMessage(error) {
  const message = error?.message || '';
  try {
    const parsed = JSON.parse(message);
    return parsed?.error || parsed?.message || message;
  } catch (_) {
    return message || 'Erro ao carregar pendencias de cotacoes';
  }
}

function PendenciaBadge({ active, children, tone = 'amber' }) {
  if (!active) {
    return null;
  }
  const classes = tone === 'red'
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${classes}`}>
      {children}
    </span>
  );
}

export default function ComprasRelatorioPendenciasCotacoes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtros, setFiltros] = useState(() => readFilters(searchParams));
  const [obras, setObras] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    getMinhasObras()
      .then((data) => {
        if (ativo) {
          setObras(Array.isArray(data) ? data : []);
        }
      })
      .catch((error) => console.error(error));

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    const filtrosAtivos = readFilters(searchParams);
    setFiltros(filtrosAtivos);

    let ativo = true;
    async function carregar() {
      try {
        setLoading(true);
        setErro('');
        const data = await obterRelatorioPendenciasCotacoesCompras(filtrosAtivos);
        if (ativo) {
          setRelatorio(data);
        }
      } catch (error) {
        console.error(error);
        if (ativo) {
          setRelatorio(null);
          setErro(extractErrorMessage(error));
        }
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    carregar();

    return () => {
      ativo = false;
    };
  }, [searchParams]);

  const resumo = relatorio?.resumo || {};
  const cotacoes = useMemo(() => (Array.isArray(relatorio?.cotacoes) ? relatorio.cotacoes : []), [relatorio]);
  const fornecedoresVencidos = useMemo(() => (
    Array.isArray(relatorio?.fornecedores_vencidos) ? relatorio.fornecedores_vencidos : []
  ), [relatorio]);
  const obrasResumo = useMemo(() => (Array.isArray(relatorio?.obras) ? relatorio.obras : []), [relatorio]);

  function aplicarFiltros(event) {
    event.preventDefault();
    setSearchParams(buildSearchParams(filtros));
  }

  function limparFiltros() {
    setFiltros(DEFAULT_FILTERS);
    setSearchParams(new URLSearchParams());
  }

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <p className="eyebrow">Compras / Relatorios</p>
            <h1 className="page-title">Pendencias de Cotacoes</h1>
            <p className="page-subtitle">
              Cotacoes sem minimo de respostas e fornecedores com prazo vencido sem resposta.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/compras/relatorios" className="btn btn-outline">
              Voltar aos relatorios
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card solicitacoes-filtros app-filters-card">
        <form className="grid gap-4" onSubmit={aplicarFiltros}>
          <div className="app-filters-grid">
            <label className="app-filter-field">
              <span className="app-filter-label">Obra / Centro de custo</span>
              <select
                className="input"
                value={filtros.obra_id}
                onChange={(event) => setFiltros((current) => ({ ...current, obra_id: event.target.value }))}
              >
                <option value="">Todos</option>
                {obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Cotacao criada de</span>
              <input
                className="input"
                type="date"
                value={filtros.data_inicio}
                onChange={(event) => setFiltros((current) => ({ ...current, data_inicio: event.target.value }))}
              />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Cotacao criada ate</span>
              <input
                className="input"
                type="date"
                value={filtros.data_fim}
                onChange={(event) => setFiltros((current) => ({ ...current, data_fim: event.target.value }))}
              />
            </label>
          </div>

          <div className="app-page-actions">
            <button type="button" className="btn btn-outline" onClick={limparFiltros}>
              Limpar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar relatorio'}
            </button>
          </div>
        </form>
      </div>

      {erro && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="metric-card">
          <span>Cotacoes</span>
          <strong>{formatNumber(resumo.cotacoes)}</strong>
          <small>Com fornecedores enviados</small>
        </div>
        <div className="metric-card">
          <span>Sem minimo</span>
          <strong>{formatNumber(resumo.cotacoes_sem_minimo)}</strong>
          <small>Minimo atual: {formatNumber(resumo.minimo_cotacoes)}</small>
        </div>
        <div className="metric-card">
          <span>Prazo vencido</span>
          <strong>{formatNumber(resumo.cotacoes_com_prazo_vencido)}</strong>
          <small>Cotacoes com fornecedor atrasado</small>
        </div>
        <div className="metric-card">
          <span>Fornecedores vencidos</span>
          <strong>{formatNumber(resumo.fornecedores_vencidos_sem_resposta)}</strong>
          <small>Sem resposta ate o prazo</small>
        </div>
        <div className="metric-card">
          <span>Taxa resposta</span>
          <strong>{formatPercent(resumo.taxa_resposta)}</strong>
          <small>Respondidos sobre enviados</small>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Cotacoes com pendencias</h2>
        <p className="page-subtitle mb-3">Top 100 cotacoes priorizadas por prazo vencido e falta de respostas minimas.</p>
        <div className="sol-table-wrapper">
          <ResizableTable className="sol-table" columns={COTACAO_COLUMNS} storageKey="fluxy.compras.pendenciasCotacoes.cotacoes.columns">
            <thead>
              <tr>
                <ResizableTh columnKey="cotacao">Cotacao</ResizableTh>
                <ResizableTh columnKey="titulo">Titulo</ResizableTh>
                <ResizableTh columnKey="obra">Obra/Centro</ResizableTh>
                <ResizableTh columnKey="status">Status</ResizableTh>
                <ResizableTh columnKey="fornecedores" className="text-right">Enviados</ResizableTh>
                <ResizableTh columnKey="respostas" className="text-right">Respostas</ResizableTh>
                <ResizableTh columnKey="pendencias">Pendencias</ResizableTh>
                <ResizableTh columnKey="criada">Criada em</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}>Carregando...</td></tr>
              ) : cotacoes.length === 0 ? (
                <tr><td colSpan={8}>Sem cotacoes com fornecedores nos filtros.</td></tr>
              ) : (
                cotacoes.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link className="font-semibold text-blue-700 hover:underline" to={`/solicitacoes-compra/${item.id}`}>
                        SC #{item.id}
                      </Link>
                    </td>
                    <td className="font-semibold text-slate-900">{item.titulo || '-'}</td>
                    <td>{item.obra?.nome || '-'}</td>
                    <td>{item.status || '-'}</td>
                    <td className="text-right">{formatNumber(item.fornecedores_enviados)}</td>
                    <td className="text-right">{formatNumber(item.fornecedores_respondidos)} / {formatNumber(item.minimo_cotacoes)}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <PendenciaBadge active={item.sem_minimo}>Sem minimo</PendenciaBadge>
                        <PendenciaBadge active={item.prazo_vencido} tone="red">Prazo vencido</PendenciaBadge>
                      </div>
                    </td>
                    <td>{formatDate(item.criada_em)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </ResizableTable>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Fornecedores vencidos sem resposta</h2>
          <p className="page-subtitle mb-3">Fornecedores com prazo de resposta anterior a hoje e sem resposta registrada.</p>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={VENCIDO_COLUMNS} storageKey="fluxy.compras.pendenciasCotacoes.vencidos.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="cotacao">Cotacao</ResizableTh>
                  <ResizableTh columnKey="fornecedor">Fornecedor</ResizableTh>
                  <ResizableTh columnKey="obra">Obra/Centro</ResizableTh>
                  <ResizableTh columnKey="enviado">Enviado</ResizableTh>
                  <ResizableTh columnKey="visualizado">Visualizado</ResizableTh>
                  <ResizableTh columnKey="prazo">Prazo</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6}>Carregando...</td></tr>
                ) : fornecedoresVencidos.length === 0 ? (
                  <tr><td colSpan={6}>Sem fornecedores vencidos sem resposta.</td></tr>
                ) : (
                  fornecedoresVencidos.map((item, index) => (
                    <tr key={`${item.cotacao_id}-${item.fornecedor_id || index}`}>
                      <td>
                        <Link className="font-semibold text-blue-700 hover:underline" to={`/solicitacoes-compra/${item.cotacao_id}`}>
                          SC #{item.cotacao_id}
                        </Link>
                      </td>
                      <td className="font-semibold text-slate-900">{item.fornecedor_nome}</td>
                      <td>{item.obra?.nome || '-'}</td>
                      <td>{formatDate(item.enviado_em)}</td>
                      <td>{formatDate(item.visualizado_em)}</td>
                      <td className="font-semibold text-red-700">{formatDate(item.prazo_resposta)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>

        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Pendencias por obra/centro</h2>
          <p className="page-subtitle mb-3">Onde estao concentradas cotacoes sem minimo e com prazo vencido.</p>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={OBRA_COLUMNS} storageKey="fluxy.compras.pendenciasCotacoes.obras.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="obra">Obra/Centro</ResizableTh>
                  <ResizableTh columnKey="cotacoes" className="text-right">Cotacoes</ResizableTh>
                  <ResizableTh columnKey="sem_minimo" className="text-right">Sem minimo</ResizableTh>
                  <ResizableTh columnKey="vencidas" className="text-right">Vencidas</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4}>Carregando...</td></tr>
                ) : obrasResumo.length === 0 ? (
                  <tr><td colSpan={4}>Sem pendencias por obra/centro.</td></tr>
                ) : (
                  obrasResumo.map((item) => (
                    <tr key={item.key}>
                      <td className="font-semibold text-slate-900">{item.obra_nome}</td>
                      <td className="text-right">{formatNumber(item.cotacoes)}</td>
                      <td className="text-right">{formatNumber(item.sem_minimo)}</td>
                      <td className="text-right">{formatNumber(item.vencidas)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>
      </div>
    </div>
  );
}
