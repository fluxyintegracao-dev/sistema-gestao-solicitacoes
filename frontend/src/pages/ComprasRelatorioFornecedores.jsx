import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import { obterRelatorioFornecedoresCompras } from '../services/compras';
import { getMinhasObras } from '../services/obras';

const DEFAULT_FILTERS = {
  obra_id: '',
  data_inicio: '',
  data_fim: ''
};

const TABLE_COLUMNS = [
  { key: 'fornecedor', width: 220, minWidth: 160 },
  { key: 'cotacoes', width: 82, minWidth: 76 },
  { key: 'resposta', width: 118, minWidth: 92 },
  { key: 'sem_resposta', width: 118, minWidth: 100 },
  { key: 'visualizacao', width: 118, minWidth: 100 },
  { key: 'prazo', width: 104, minWidth: 84 },
  { key: 'itens_respondidos', width: 128, minWidth: 104 },
  { key: 'itens_vencedores', width: 128, minWidth: 104 },
  { key: 'valor_cotado', width: 136, minWidth: 112 },
  { key: 'valor_vencedor', width: 136, minWidth: 112 },
  { key: 'ultima_cotacao', width: 118, minWidth: 104 },
  { key: 'sinal', width: 132, minWidth: 112 }
];

const RISCO_COLUMNS = [
  { key: 'fornecedor', width: 260, minWidth: 180 },
  { key: 'taxa_resposta', width: 128, minWidth: 104 },
  { key: 'sem_resposta', width: 128, minWidth: 104 },
  { key: 'cotacoes', width: 104, minWidth: 86 },
  { key: 'visualizacao', width: 128, minWidth: 104 },
  { key: 'ultima_cotacao', width: 128, minWidth: 104 },
  { key: 'sinal', width: 150, minWidth: 122 }
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

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
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

function formatHours(value) {
  if (value === null || value === undefined) {
    return '-';
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '-';
  }

  if (numeric < 24) {
    return `${numeric.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`;
  }

  return `${(numeric / 24).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dia(s)`;
}

function respostaBadge(item) {
  const classificacao = item?.classificacao_resposta || 'SEM_AMOSTRA';
  if (classificacao === 'BAIXA_RESPOSTA') {
    return { label: 'Baixa resposta', className: 'badge badge-danger' };
  }
  if (classificacao === 'ATENCAO') {
    return { label: 'Atencao', className: 'badge badge-warning' };
  }
  if (classificacao === 'RESPONSIVO') {
    return { label: 'Responsivo', className: 'badge badge-success' };
  }
  return { label: 'Sem amostra', className: 'badge badge-muted' };
}

function extractErrorMessage(error) {
  const message = error?.message || '';
  try {
    const parsed = JSON.parse(message);
    return parsed?.error || parsed?.message || message;
  } catch (_) {
    return message || 'Erro ao carregar relatorio de fornecedores';
  }
}

export default function ComprasRelatorioFornecedores() {
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
        const data = await obterRelatorioFornecedoresCompras(filtrosAtivos);
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
  const fornecedores = useMemo(
    () => (Array.isArray(relatorio?.fornecedores) ? relatorio.fornecedores : []),
    [relatorio]
  );
  const fornecedoresBaixaResposta = useMemo(
    () => (Array.isArray(relatorio?.fornecedores_baixa_resposta) ? relatorio.fornecedores_baixa_resposta : []),
    [relatorio]
  );

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
            <h1 className="page-title">Fornecedores</h1>
            <p className="page-subtitle">
              Analise de participacao, resposta e vitorias por fornecedor no processo de cotacao.
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

      {erro ? (
        <div className="mt-4 alert alert-danger">{erro}</div>
      ) : null}

      <div className="mt-4 metric-grid">
        <div className="dashboard-metric-card dashboard-metric-card--blue">
          <span className="dashboard-metric-label">Fornecedores</span>
          <strong className="dashboard-metric-value">{Number(resumo.fornecedores || 0).toLocaleString('pt-BR')}</strong>
          <small className="dashboard-metric-detail">Com cotacoes no periodo</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--slate">
          <span className="dashboard-metric-label">Cotacoes enviadas</span>
          <strong className="dashboard-metric-value">{Number(resumo.cotacoes_enviadas || 0).toLocaleString('pt-BR')}</strong>
          <small className="dashboard-metric-detail">Participacoes registradas</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--green">
          <span className="dashboard-metric-label">Taxa de resposta</span>
          <strong className="dashboard-metric-value">{formatPercent(resumo.taxa_resposta)}</strong>
          <small className="dashboard-metric-detail">{Number(resumo.cotacoes_respondidas || 0).toLocaleString('pt-BR')} respondida(s)</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--amber">
          <span className="dashboard-metric-label">Sem resposta</span>
          <strong className="dashboard-metric-value">{Number(resumo.cotacoes_sem_resposta || 0).toLocaleString('pt-BR')}</strong>
          <small className="dashboard-metric-detail">Participacoes sem retorno</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--red">
          <span className="dashboard-metric-label">Baixa resposta</span>
          <strong className="dashboard-metric-value">{Number(resumo.fornecedores_baixa_resposta || 0).toLocaleString('pt-BR')}</strong>
          <small className="dashboard-metric-detail">Fornecedor(es) com amostra minima</small>
        </div>
        <div className="dashboard-metric-card dashboard-metric-card--amber">
          <span className="dashboard-metric-label">Valor vencedor</span>
          <strong className="dashboard-metric-value">{formatMoney(resumo.valor_vencedor)}</strong>
          <small className="dashboard-metric-detail">{Number(resumo.itens_vencedores || 0).toLocaleString('pt-BR')} item(ns) vencedor(es)</small>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <div className="card-header">
          <div>
            <h2>Fornecedores com menor taxa de resposta</h2>
            <p>Ranking gerado apenas por cotacoes enviadas e respostas registradas. Fornecedores com menos de 2 participacoes ficam fora desta lista.</p>
          </div>
        </div>
        <div className="sol-table-wrapper">
          <ResizableTable
            className="sol-table"
            columns={RISCO_COLUMNS}
            storageKey="fluxy.compras.relatorioFornecedores.riscoColumnWidths"
          >
            <thead>
              <tr>
                <ResizableTh columnKey="fornecedor">Fornecedor</ResizableTh>
                <ResizableTh columnKey="taxa_resposta" className="text-right">Taxa resposta</ResizableTh>
                <ResizableTh columnKey="sem_resposta" className="text-right">Sem resposta</ResizableTh>
                <ResizableTh columnKey="cotacoes" className="text-right">Cotacoes</ResizableTh>
                <ResizableTh columnKey="visualizacao" className="text-right">Visualizacao</ResizableTh>
                <ResizableTh columnKey="ultima_cotacao" className="text-right">Ultima cotacao</ResizableTh>
                <ResizableTh columnKey="sinal">Sinal</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center text-[var(--c-muted)] py-6">
                    Carregando ranking...
                  </td>
                </tr>
              ) : fornecedoresBaixaResposta.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-[var(--c-muted)] py-6">
                    Nenhum fornecedor com baixa resposta para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                fornecedoresBaixaResposta.map((item) => {
                  const badge = respostaBadge(item);
                  return (
                    <tr key={`risco-${item.fornecedor.id || item.fornecedor.nome}`}>
                      <td>
                        <strong>{item.fornecedor.nome}</strong>
                        <div className="text-xs text-[var(--c-muted)]">
                          {[item.fornecedor.cnpj, item.fornecedor.cidade, item.fornecedor.estado]
                            .filter(Boolean)
                            .join(' - ') || 'Sem dados complementares'}
                        </div>
                      </td>
                      <td className="text-right"><strong>{formatPercent(item.taxa_resposta)}</strong></td>
                      <td className="text-right">{Number(item.cotacoes_sem_resposta || 0).toLocaleString('pt-BR')}</td>
                      <td className="text-right">{Number(item.cotacoes_enviadas || 0).toLocaleString('pt-BR')}</td>
                      <td className="text-right">{formatPercent(item.taxa_visualizacao)}</td>
                      <td className="text-right tabular-nums">{formatDate(item.ultima_cotacao)}</td>
                      <td><span className={badge.className}>{badge.label}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </ResizableTable>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <div className="card-header">
          <div>
            <h2>Base analitica de fornecedores</h2>
            <p>Participacao completa em cotacoes, respostas, itens e valores por fornecedor.</p>
          </div>
        </div>
        <div className="sol-table-wrapper compras-fornecedores-table-shell">
          <ResizableTable
            className="sol-table compras-fornecedores-table"
            columns={TABLE_COLUMNS}
            storageKey="fluxy.compras.relatorioFornecedores.columnWidths"
          >
            <thead>
              <tr>
                <ResizableTh columnKey="fornecedor">Fornecedor</ResizableTh>
                <ResizableTh columnKey="cotacoes" className="text-right">Cotacoes</ResizableTh>
                <ResizableTh columnKey="resposta" className="text-right">Resposta</ResizableTh>
                <ResizableTh columnKey="sem_resposta" className="text-right">Sem resposta</ResizableTh>
                <ResizableTh columnKey="visualizacao" className="text-right">Visualizacao</ResizableTh>
                <ResizableTh columnKey="prazo" className="text-right">Prazo medio</ResizableTh>
                <ResizableTh columnKey="itens_respondidos" className="text-right">Itens respondidos</ResizableTh>
                <ResizableTh columnKey="itens_vencedores" className="text-right">Itens vencedores</ResizableTh>
                <ResizableTh columnKey="valor_cotado" className="text-right">Valor cotado</ResizableTh>
                <ResizableTh columnKey="valor_vencedor" className="text-right">Valor vencedor</ResizableTh>
                <ResizableTh columnKey="ultima_cotacao" className="text-right">Ultima cotacao</ResizableTh>
                <ResizableTh columnKey="sinal">Sinal</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center text-[var(--c-muted)] py-6">
                    Carregando fornecedores...
                  </td>
                </tr>
              ) : fornecedores.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center text-[var(--c-muted)] py-6">
                    Nenhum fornecedor encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                fornecedores.map((item) => {
                  const badge = respostaBadge(item);
                  return (
                    <tr key={item.fornecedor.id || item.fornecedor.nome}>
                      <td>
                        <strong>{item.fornecedor.nome}</strong>
                        <div className="text-xs text-[var(--c-muted)]">
                          {[item.fornecedor.cnpj, item.fornecedor.cidade, item.fornecedor.estado]
                            .filter(Boolean)
                            .join(' - ') || 'Sem dados complementares'}
                        </div>
                      </td>
                      <td className="text-right">{Number(item.cotacoes_enviadas || 0).toLocaleString('pt-BR')}</td>
                      <td className="text-right">
                        <strong>{formatPercent(item.taxa_resposta)}</strong>
                        <div className="text-xs text-[var(--c-muted)]">
                          {Number(item.cotacoes_respondidas || 0).toLocaleString('pt-BR')} de{' '}
                          {Number(item.cotacoes_enviadas || 0).toLocaleString('pt-BR')}
                        </div>
                      </td>
                      <td className="text-right">{Number(item.cotacoes_sem_resposta || 0).toLocaleString('pt-BR')}</td>
                      <td className="text-right">{formatPercent(item.taxa_visualizacao)}</td>
                      <td className="text-right">{formatHours(item.prazo_medio_resposta_horas)}</td>
                      <td className="text-right">{Number(item.itens_respondidos || 0).toLocaleString('pt-BR')}</td>
                      <td className="text-right">{Number(item.itens_vencedores || 0).toLocaleString('pt-BR')}</td>
                      <td className="text-right tabular-nums">{formatMoney(item.valor_cotado)}</td>
                      <td className="text-right tabular-nums">{formatMoney(item.valor_vencedor)}</td>
                      <td className="text-right tabular-nums">{formatDate(item.ultima_cotacao)}</td>
                      <td><span className={badge.className}>{badge.label}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </ResizableTable>
        </div>
      </div>
    </div>
  );
}
