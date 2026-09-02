import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TabelaPadrao } from '../components/padrao';
import { obterRelatorioFornecedoresCompras } from '../services/compras';
import { getMinhasObras } from '../services/obras';

const DEFAULT_FILTERS = {
  obra_id: '',
  data_inicio: '',
  data_fim: ''
};

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
        <TabelaPadrao
          colunas={[
            {
              id: 'fornecedor',
              titulo: 'Fornecedor',
              // R17: o fornecedor NOMEIA a linha do ranking.
              tipo: 'identidade',
              noCard: 'titulo',
              render: (item) => (
                <div>
                  <strong>{item.fornecedor.nome}</strong>
                  <div className="text-xs text-[var(--c-muted)]">
                    {[item.fornecedor.cnpj, item.fornecedor.cidade, item.fornecedor.estado]
                      .filter(Boolean)
                      .join(' - ') || 'Sem dados complementares'}
                  </div>
                </div>
              )
            },
            { id: 'taxa_resposta', titulo: 'Taxa resposta', tipo: 'numero', render: (item) => <strong>{formatPercent(item.taxa_resposta)}</strong> },
            { id: 'sem_resposta', titulo: 'Sem resposta', tipo: 'numero', render: (item) => Number(item.cotacoes_sem_resposta || 0).toLocaleString('pt-BR') },
            { id: 'cotacoes', titulo: 'Cotacoes', tipo: 'numero', render: (item) => Number(item.cotacoes_enviadas || 0).toLocaleString('pt-BR') },
            { id: 'visualizacao', titulo: 'Visualizacao', tipo: 'numero', render: (item) => formatPercent(item.taxa_visualizacao) },
            { id: 'ultima_cotacao', titulo: 'Ultima cotacao', tipo: 'data', render: (item) => <span className="tabular-nums">{formatDate(item.ultima_cotacao)}</span> },
            {
              id: 'sinal',
              titulo: 'Sinal',
              tipo: 'badge',
              render: (item) => {
                const badge = respostaBadge(item);
                return <span className={badge.className}>{badge.label}</span>;
              }
            }
          ]}
          itens={fornecedoresBaixaResposta}
          getId={(item) => `risco-${item.fornecedor.id || item.fornecedor.nome}`}
          carregando={loading}
          storageKey="tabela:compras-fornecedores:baixa-resposta"
          rotuloRolagem="Fornecedores com menor taxa de resposta"
          vazio="Nenhum fornecedor com baixa resposta para os filtros selecionados."
        />
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <div className="card-header">
          <div>
            <h2>Base analitica de fornecedores</h2>
            <p>Participacao completa em cotacoes, respostas, itens e valores por fornecedor.</p>
          </div>
        </div>
        <TabelaPadrao
          colunas={[
            {
              id: 'fornecedor',
              titulo: 'Fornecedor',
              // R17: o fornecedor NOMEIA o registro desta base analitica.
              tipo: 'identidade',
              noCard: 'titulo',
              render: (item) => (
                <div>
                  <strong>{item.fornecedor.nome}</strong>
                  <div className="text-xs text-[var(--c-muted)]">
                    {[item.fornecedor.cnpj, item.fornecedor.cidade, item.fornecedor.estado]
                      .filter(Boolean)
                      .join(' - ') || 'Sem dados complementares'}
                  </div>
                </div>
              )
            },
            { id: 'cotacoes', titulo: 'Cotacoes', tipo: 'numero', render: (item) => Number(item.cotacoes_enviadas || 0).toLocaleString('pt-BR') },
            {
              id: 'resposta',
              titulo: 'Resposta',
              tipo: 'numero',
              render: (item) => (
                <div>
                  <strong>{formatPercent(item.taxa_resposta)}</strong>
                  <div className="text-xs text-[var(--c-muted)]">
                    {Number(item.cotacoes_respondidas || 0).toLocaleString('pt-BR')} de{' '}
                    {Number(item.cotacoes_enviadas || 0).toLocaleString('pt-BR')}
                  </div>
                </div>
              )
            },
            { id: 'sem_resposta', titulo: 'Sem resposta', tipo: 'numero', render: (item) => Number(item.cotacoes_sem_resposta || 0).toLocaleString('pt-BR') },
            { id: 'visualizacao', titulo: 'Visualizacao', tipo: 'numero', render: (item) => formatPercent(item.taxa_visualizacao) },
            { id: 'prazo', titulo: 'Prazo medio', tipo: 'numero', render: (item) => formatHours(item.prazo_medio_resposta_horas) },
            { id: 'itens_respondidos', titulo: 'Itens respondidos', tipo: 'numero', render: (item) => Number(item.itens_respondidos || 0).toLocaleString('pt-BR') },
            { id: 'itens_vencedores', titulo: 'Itens vencedores', tipo: 'numero', render: (item) => Number(item.itens_vencedores || 0).toLocaleString('pt-BR') },
            { id: 'valor_cotado', titulo: 'Valor cotado', tipo: 'valor', render: (item) => <span className="tabular-nums">{formatMoney(item.valor_cotado)}</span> },
            { id: 'valor_vencedor', titulo: 'Valor vencedor', tipo: 'valor', render: (item) => <span className="tabular-nums">{formatMoney(item.valor_vencedor)}</span> },
            { id: 'ultima_cotacao', titulo: 'Ultima cotacao', tipo: 'data', render: (item) => <span className="tabular-nums">{formatDate(item.ultima_cotacao)}</span> },
            {
              id: 'sinal',
              titulo: 'Sinal',
              tipo: 'badge',
              render: (item) => {
                const badge = respostaBadge(item);
                return <span className={badge.className}>{badge.label}</span>;
              }
            }
          ]}
          itens={fornecedores}
          getId={(item) => item.fornecedor.id || item.fornecedor.nome}
          carregando={loading}
          storageKey="tabela:compras-fornecedores:base-analitica"
          rotuloRolagem="Base analitica de fornecedores"
          vazio="Nenhum fornecedor encontrado para os filtros selecionados."
        />
      </div>
    </div>
  );
}
