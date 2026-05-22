import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import {
  getObrasVisiveisSolicitacoes,
  obterRelatorioSolicitacoesOperacional
} from '../services/solicitacoes';

const DEFAULT_FILTERS = {
  periodo: '30_DIAS',
  data_inicio: '',
  data_fim: '',
  obra_id: ''
};

const STATUS_COLUMNS = [
  { key: 'status', width: 180, minWidth: 130 },
  { key: 'total', width: 100, minWidth: 80 },
  { key: 'valor', width: 140, minWidth: 110 }
];

const SETOR_COLUMNS = [
  { key: 'setor', width: 190, minWidth: 130 },
  { key: 'total', width: 100, minWidth: 80 },
  { key: 'valor', width: 140, minWidth: 110 }
];

const OBRA_COLUMNS = [
  { key: 'obra', width: 240, minWidth: 160 },
  { key: 'tipo', width: 132, minWidth: 100 },
  { key: 'total', width: 100, minWidth: 80 },
  { key: 'valor', width: 140, minWidth: 110 }
];

const GARGALO_COLUMNS = [
  { key: 'codigo', width: 130, minWidth: 100 },
  { key: 'setor', width: 150, minWidth: 110 },
  { key: 'status', width: 150, minWidth: 110 },
  { key: 'obra', width: 210, minWidth: 140 },
  { key: 'tipo', width: 180, minWidth: 120 },
  { key: 'dias', width: 112, minWidth: 92 },
  { key: 'valor', width: 130, minWidth: 100 }
];

function readFilters(searchParams) {
  return {
    periodo: searchParams.get('periodo') || DEFAULT_FILTERS.periodo,
    data_inicio: searchParams.get('data_inicio') || '',
    data_fim: searchParams.get('data_fim') || '',
    obra_id: searchParams.get('obra_id') || ''
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

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
}

function formatLabel(value) {
  return String(value || 'Nao informado')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function extractErrorMessage(error) {
  return error?.data?.error || error?.message || 'Erro ao carregar relatorio de solicitacoes';
}

function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center text-[var(--c-muted)] py-6">
        {children}
      </td>
    </tr>
  );
}

export default function SolicitacoesRelatorioOperacional() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtros, setFiltros] = useState(() => readFilters(searchParams));
  const [obras, setObras] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    getObrasVisiveisSolicitacoes()
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
        const data = await obterRelatorioSolicitacoesOperacional(filtrosAtivos);
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
  const porStatus = useMemo(() => (Array.isArray(relatorio?.por_status) ? relatorio.por_status : []), [relatorio]);
  const porSetor = useMemo(() => (Array.isArray(relatorio?.por_setor) ? relatorio.por_setor : []), [relatorio]);
  const porObra = useMemo(() => (Array.isArray(relatorio?.por_obra) ? relatorio.por_obra : []), [relatorio]);
  const gargalos = useMemo(() => (Array.isArray(relatorio?.gargalos) ? relatorio.gargalos : []), [relatorio]);

  function aplicarFiltros(event) {
    event.preventDefault();
    setSearchParams(buildSearchParams(filtros));
  }

  function limparFiltros() {
    setFiltros(DEFAULT_FILTERS);
    setSearchParams(buildSearchParams(DEFAULT_FILTERS));
  }

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <p className="eyebrow">Solicitacoes / Relatorios</p>
            <h1 className="page-title">Painel operacional</h1>
            <p className="page-subtitle">
              Volume, funil, gargalos e distribuicao por setor, obra e tipo usando dados reais do fluxo de solicitacoes.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/solicitacoes/relatorios" className="btn btn-outline">
              Voltar aos relatorios
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card solicitacoes-filtros app-filters-card">
        <form className="grid gap-4" onSubmit={aplicarFiltros}>
          <div className="app-filters-grid">
            <label className="app-filter-field">
              <span className="app-filter-label">Periodo</span>
              <select
                className="input"
                value={filtros.periodo}
                onChange={(event) => setFiltros((current) => ({ ...current, periodo: event.target.value }))}
              >
                <option value="HOJE">Hoje</option>
                <option value="30_DIAS">Ultimos 30 dias</option>
                <option value="90_DIAS">Ultimos 90 dias</option>
                <option value="MES_ATUAL">Mes atual</option>
              </select>
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Data inicial</span>
              <input
                className="input"
                type="date"
                value={filtros.data_inicio}
                onChange={(event) => setFiltros((current) => ({ ...current, data_inicio: event.target.value }))}
              />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Data final</span>
              <input
                className="input"
                type="date"
                value={filtros.data_fim}
                onChange={(event) => setFiltros((current) => ({ ...current, data_fim: event.target.value }))}
              />
            </label>

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

      {erro ? <div className="mt-4 alert alert-danger">{erro}</div> : null}

      <div className="mt-4 metric-grid">
        <div className="dashboard-metric-card dashboard-metric-card--blue">
          <span className="dashboard-metric-label">Solicitacoes</span>
          <strong className="dashboard-metric-value">{formatNumber(resumo.total_solicitacoes)}</strong>
          <small className="dashboard-metric-detail">Criadas no periodo filtrado</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--green">
          <span className="dashboard-metric-label">Concluidas</span>
          <strong className="dashboard-metric-value">{formatNumber(resumo.concluidas)}</strong>
          <small className="dashboard-metric-detail">{formatNumber(resumo.abertas)} ainda abertas</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--amber">
          <span className="dashboard-metric-label">Media abertas</span>
          <strong className="dashboard-metric-value">{formatNumber(resumo.media_dias_abertas, 1)} dia(s)</strong>
          <small className="dashboard-metric-detail">Tempo medio desde a criacao</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--red">
          <span className="dashboard-metric-label">Maior parada</span>
          <strong className="dashboard-metric-value">{formatNumber(resumo.maior_tempo_parado_dias, 1)} dia(s)</strong>
          <small className="dashboard-metric-detail">Sem nova movimentacao registrada</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--slate">
          <span className="dashboard-metric-label">Valor aberto</span>
          <strong className="dashboard-metric-value">{formatCurrency(resumo.valor_aberto)}</strong>
          <small className="dashboard-metric-detail">{formatCurrency(resumo.valor_total)} no periodo</small>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="app-empty-card">
            <strong>{formatNumber(resumo.criadas)}</strong>
            <span>criadas</span>
          </div>
          <div className="app-empty-card">
            <strong>{formatNumber(resumo.assumidas)}</strong>
            <span>assumidas</span>
          </div>
          <div className="app-empty-card">
            <strong>{formatNumber(resumo.enviadas)}</strong>
            <span>enviadas</span>
          </div>
          <div className="app-empty-card">
            <strong>{formatNumber(resumo.aprovadas_diretoria)}</strong>
            <span>aprovadas diretoria</span>
          </div>
          <div className="app-empty-card">
            <strong>{formatNumber(resumo.concluidas)}</strong>
            <span>concluidas</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-3">Por status</h2>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={STATUS_COLUMNS} storageKey="fluxy.solicitacoes.relatorio.status.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="status">Status</ResizableTh>
                  <ResizableTh columnKey="total" className="text-right">Qtd.</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow colSpan={3}>Carregando...</EmptyRow>
                ) : porStatus.length === 0 ? (
                  <EmptyRow colSpan={3}>Sem dados no periodo.</EmptyRow>
                ) : (
                  porStatus.map((item) => (
                    <tr key={item.key}>
                      <td>{formatLabel(item.status || item.key)}</td>
                      <td className="text-right">{formatNumber(item.total)}</td>
                      <td className="text-right">{formatCurrency(item.valor_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>

        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-3">Por setor atual</h2>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={SETOR_COLUMNS} storageKey="fluxy.solicitacoes.relatorio.setor.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="setor">Setor</ResizableTh>
                  <ResizableTh columnKey="total" className="text-right">Qtd.</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow colSpan={3}>Carregando...</EmptyRow>
                ) : porSetor.length === 0 ? (
                  <EmptyRow colSpan={3}>Sem dados no periodo.</EmptyRow>
                ) : (
                  porSetor.map((item) => (
                    <tr key={item.key}>
                      <td>{formatLabel(item.setor || item.key)}</td>
                      <td className="text-right">{formatNumber(item.total)}</td>
                      <td className="text-right">{formatCurrency(item.valor_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>

        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-3">Por obra/centro</h2>
          <div className="sol-table-wrapper">
            <ResizableTable className="sol-table" columns={OBRA_COLUMNS} storageKey="fluxy.solicitacoes.relatorio.obra.columns">
              <thead>
                <tr>
                  <ResizableTh columnKey="obra">Obra / Centro</ResizableTh>
                  <ResizableTh columnKey="tipo">Tipo</ResizableTh>
                  <ResizableTh columnKey="total" className="text-right">Qtd.</ResizableTh>
                  <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <EmptyRow colSpan={4}>Carregando...</EmptyRow>
                ) : porObra.length === 0 ? (
                  <EmptyRow colSpan={4}>Sem dados no periodo.</EmptyRow>
                ) : (
                  porObra.map((item) => (
                    <tr key={item.key}>
                      <td>
                        <strong>{item.obra_nome || 'Sem obra/centro'}</strong>
                        {item.obra_codigo ? <div className="text-xs text-[var(--c-muted)]">{item.obra_codigo}</div> : null}
                      </td>
                      <td>{formatLabel(item.tipo_centro_custo)}</td>
                      <td className="text-right">{formatNumber(item.total)}</td>
                      <td className="text-right">{formatCurrency(item.valor_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <div className="app-page-header-row mb-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--c-text)]">Gargalos operacionais</h2>
            <p className="page-subtitle">Solicitacoes abertas ha pelo menos 3 dias sem nova movimentacao registrada.</p>
          </div>
        </div>
        <div className="sol-table-wrapper">
          <ResizableTable className="sol-table" columns={GARGALO_COLUMNS} storageKey="fluxy.solicitacoes.relatorio.gargalos.columns">
            <thead>
              <tr>
                <ResizableTh columnKey="codigo">Solicitacao</ResizableTh>
                <ResizableTh columnKey="setor">Setor</ResizableTh>
                <ResizableTh columnKey="status">Status</ResizableTh>
                <ResizableTh columnKey="obra">Obra / Centro</ResizableTh>
                <ResizableTh columnKey="tipo">Tipo</ResizableTh>
                <ResizableTh columnKey="dias" className="text-right">Parada</ResizableTh>
                <ResizableTh columnKey="valor" className="text-right">Valor</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <EmptyRow colSpan={7}>Carregando gargalos...</EmptyRow>
              ) : gargalos.length === 0 ? (
                <EmptyRow colSpan={7}>Nenhum gargalo encontrado nos filtros selecionados.</EmptyRow>
              ) : (
                gargalos.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`/solicitacoes/${item.id}`} className="font-bold text-[var(--c-primary)] hover:underline">
                        {item.codigo || `#${item.id}`}
                      </Link>
                      <div className="text-xs text-[var(--c-muted)]">Criada em {formatDate(item.criada_em)}</div>
                    </td>
                    <td>{formatLabel(item.setor)}</td>
                    <td>{formatLabel(item.status)}</td>
                    <td>{item.obra_nome || '-'}</td>
                    <td>{item.tipo_nome || '-'}</td>
                    <td className="text-right">
                      <strong>{formatNumber(item.dias_parada, 1)} dia(s)</strong>
                      <div className="text-xs text-[var(--c-muted)]">Ultima: {formatDate(item.ultima_movimentacao_em)}</div>
                    </td>
                    <td className="text-right">{formatCurrency(item.valor)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </ResizableTable>
        </div>
      </div>
    </div>
  );
}
