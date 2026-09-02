import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TabelaPadrao } from '../components/padrao';
import { obterRelatorioComprasPorFornecedor } from '../services/compras';
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
    return message || 'Erro ao carregar relatorio de compras por fornecedor';
  }
}

export default function ComprasRelatorioComprasFornecedor() {
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
        const data = await obterRelatorioComprasPorFornecedor(filtrosAtivos);
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
  const fornecedores = useMemo(() => (
    Array.isArray(relatorio?.fornecedores) ? relatorio.fornecedores : []
  ), [relatorio]);
  const obrasResumo = useMemo(() => (
    Array.isArray(relatorio?.obras) ? relatorio.obras : []
  ), [relatorio]);
  const pedidos = useMemo(() => (
    Array.isArray(relatorio?.pedidos) ? relatorio.pedidos : []
  ), [relatorio]);
  const topFornecedores = useMemo(() => fornecedores.slice(0, 10), [fornecedores]);
  const maiorValorFornecedor = useMemo(
    () => Math.max(...topFornecedores.map((item) => Number(item.valor_total || 0)), 0),
    [topFornecedores]
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
            <h1 className="page-title">Compras por Fornecedor</h1>
            <p className="page-subtitle">
              Valor efetivamente pedido por fornecedor com base nos pedidos de compra emitidos.
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
              <span className="app-filter-label">Pedido criado de</span>
              <input
                className="input"
                type="date"
                value={filtros.data_inicio}
                onChange={(event) => setFiltros((current) => ({ ...current, data_inicio: event.target.value }))}
              />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Pedido criado ate</span>
              <input
                className="input"
                type="date"
                value={filtros.data_fim}
                onChange={(event) => setFiltros((current) => ({ ...current, data_fim: event.target.value }))}
              />
            </label>
          </div>

          <div className="app-filter-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Atualizar relatorio
            </button>
            <button type="button" className="btn btn-outline" onClick={limparFiltros} disabled={loading}>
              Limpar
            </button>
          </div>
        </form>
      </div>

      {erro ? (
        <div className="mt-4 alert alert-error">{erro}</div>
      ) : null}

      <div className="dashboard-metric-grid mt-4">
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Pedidos</span>
          <strong>{formatNumber(resumo.pedidos)}</strong>
          <small>Pedidos emitidos</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Fornecedores</span>
          <strong>{formatNumber(resumo.fornecedores)}</strong>
          <small>Com pedido no periodo</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Valor pedido</span>
          <strong>{formatMoney(resumo.valor_total)}</strong>
          <small>Baseado em pedidos reais</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Ticket medio</span>
          <strong>{formatMoney(resumo.ticket_medio_pedido)}</strong>
          <small>Valor por pedido</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Concentracao top 5</span>
          <strong>{formatPercent(resumo.concentracao_top5)}</strong>
          <small>Valor nos maiores fornecedores</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Minimo nao atingido</span>
          <strong>{formatNumber(resumo.pedidos_minimo_nao_atingido)}</strong>
          <small>Pedidos abaixo do minimo cadastrado</small>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card">
        <div className="app-page-header-row">
          <div>
            <h2 className="text-lg font-bold text-[var(--c-text)]">Ranking visual de fornecedores</h2>
            <p className="page-subtitle">
              Top 10 por valor efetivamente pedido no periodo filtrado.
            </p>
          </div>
        </div>
        {loading ? (
          <div className="text-sm text-[var(--c-muted)] py-4">Carregando ranking...</div>
        ) : topFornecedores.length === 0 ? (
          <div className="app-empty-card mt-3">Sem pedidos emitidos para montar o ranking.</div>
        ) : (
          <div className="grid gap-3 mt-3">
            {topFornecedores.map((item, index) => {
              const valor = Number(item.valor_total || 0);
              const percentual = maiorValorFornecedor > 0 ? Math.max(4, (valor / maiorValorFornecedor) * 100) : 0;
              return (
                <div key={`ranking-${item.key}`} className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[var(--c-muted)]">#{index + 1}</span>
                      <strong className="ml-2 text-sm text-[var(--c-text)]">{item.fornecedor_nome}</strong>
                      <span className="ml-2 text-xs text-[var(--c-muted)]">
                        {formatNumber(item.pedidos)} pedido(s)
                      </span>
                    </div>
                    <strong className="text-sm tabular-nums text-[var(--c-text)]">{formatMoney(valor)}</strong>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--c-primary)]"
                      style={{ width: `${percentual}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Fornecedores por valor pedido</h2>
        <p className="page-subtitle mb-3">Ranking de fornecedores usando somente pedidos de compra emitidos.</p>
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
                  <div className="font-semibold text-slate-900">{item.fornecedor_nome}</div>
                  <div className="text-xs text-slate-500">{item.cnpj || 'Sem CNPJ'} {item.estado ? `- ${item.estado}` : ''}</div>
                </div>
              )
            },
            { id: 'pedidos', titulo: 'Pedidos', tipo: 'numero', render: (item) => formatNumber(item.pedidos) },
            { id: 'itens', titulo: 'Itens', tipo: 'numero', render: (item) => formatNumber(item.itens) },
            {
              id: 'obras',
              titulo: 'Obras/centros',
              tipo: 'texto',
              render: (item) => (
                <div>
                  <div className="font-semibold text-slate-900">{formatNumber(item.obras)}</div>
                  <div className="text-xs text-slate-500">{(item.obras_nomes || []).join(', ') || '-'}</div>
                </div>
              )
            },
            { id: 'valor', titulo: 'Valor pedido', tipo: 'valor', render: (item) => <span className="font-semibold">{formatMoney(item.valor_total)}</span> },
            { id: 'ticket', titulo: 'Ticket medio', tipo: 'valor', render: (item) => formatMoney(item.ticket_medio) },
            { id: 'minimo', titulo: 'Minimo nao atingido', tipo: 'numero', render: (item) => formatNumber(item.pedidos_minimo_nao_atingido) },
            { id: 'ultimo', titulo: 'Ultimo pedido', tipo: 'data', render: (item) => formatDate(item.ultimo_pedido_em) }
          ]}
          itens={fornecedores}
          getId={(item) => item.key}
          carregando={loading}
          storageKey="tabela:compras-fornecedor:fornecedores"
          rotuloRolagem="Fornecedores por valor pedido"
          vazio="Sem pedidos emitidos nos filtros."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mt-4">
        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Compras por obra/centro</h2>
          <p className="page-subtitle mb-3">Onde o valor comprado por fornecedor esta concentrado.</p>
          <TabelaPadrao
            colunas={[
              {
                id: 'obra',
                titulo: 'Obra/Centro',
                // R17: a obra/centro NOMEIA a linha deste resumo.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => item.obra_nome
              },
              { id: 'fornecedores', titulo: 'Fornecedores', tipo: 'numero', render: (item) => formatNumber(item.fornecedores) },
              { id: 'pedidos', titulo: 'Pedidos', tipo: 'numero', render: (item) => formatNumber(item.pedidos) },
              { id: 'itens', titulo: 'Itens', tipo: 'numero', render: (item) => formatNumber(item.itens) },
              { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (item) => <span className="font-semibold">{formatMoney(item.valor_total)}</span> },
              { id: 'ticket', titulo: 'Ticket', tipo: 'valor', render: (item) => formatMoney(item.ticket_medio) }
            ]}
            itens={obrasResumo}
            getId={(item) => item.key}
            carregando={loading}
            storageKey="tabela:compras-fornecedor:obras"
            rotuloRolagem="Compras por obra/centro"
            vazio="Sem pedidos por obra/centro nos filtros."
          />
        </div>

        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Pedidos recentes</h2>
          <p className="page-subtitle mb-3">Ultimos 100 pedidos usados no relatorio.</p>
          <TabelaPadrao
            colunas={[
              {
                id: 'pedido',
                titulo: 'Pedido',
                // R17: o pedido de compra NOMEIA o registro.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => (
                  <Link className="font-semibold text-blue-700 hover:underline" to={`/pedidos-compra/${item.id}`}>
                    PC #{item.id}
                  </Link>
                )
              },
              { id: 'fornecedor', titulo: 'Fornecedor', tipo: 'texto', render: (item) => <span className="font-semibold text-slate-900">{item.fornecedor?.nome || 'Sem fornecedor'}</span> },
              { id: 'status', titulo: 'Status', tipo: 'status', render: (item) => item.status_label },
              { id: 'obra', titulo: 'Obra/Centro', tipo: 'texto', render: (item) => item.obra?.nome || '-' },
              {
                id: 'solicitacao',
                titulo: 'Solicitacao',
                tipo: 'codigo',
                render: (item) => (item.solicitacao?.id ? (
                  <Link className="font-semibold text-blue-700 hover:underline" to={`/solicitacoes-compra/${item.solicitacao.id}`}>
                    SC #{item.solicitacao.id}
                  </Link>
                ) : '-')
              },
              { id: 'itens', titulo: 'Itens', tipo: 'numero', render: (item) => formatNumber(item.itens) },
              { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (item) => <span className="font-semibold">{formatMoney(item.valor_total)}</span> },
              { id: 'criado', titulo: 'Criado em', tipo: 'data', render: (item) => formatDate(item.criado_em) }
            ]}
            itens={pedidos}
            carregando={loading}
            storageKey="tabela:compras-fornecedor:pedidos"
            rotuloRolagem="Pedidos recentes"
            vazio="Sem pedidos nos filtros."
          />
        </div>
      </div>
    </div>
  );
}
