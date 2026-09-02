import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TabelaPadrao } from '../components/padrao';
import { obterRelatorioEvolucaoCompras } from '../services/compras';
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

function extractErrorMessage(error) {
  const message = error?.message || '';
  try {
    const parsed = JSON.parse(message);
    return parsed?.error || parsed?.message || message;
  } catch (_) {
    return message || 'Erro ao carregar relatorio de evolucao mensal de compras';
  }
}

function MiniBar({ value, max }) {
  const percent = max > 0 ? Math.max(4, Math.round((Number(value || 0) / max) * 100)) : 0;
  return (
    <div className="mt-1 h-2 rounded-full bg-slate-100">
      <div
        className="h-2 rounded-full bg-blue-600"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default function ComprasRelatorioEvolucao() {
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
        const data = await obterRelatorioEvolucaoCompras(filtrosAtivos);
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
  const meses = useMemo(() => (Array.isArray(relatorio?.meses) ? relatorio.meses : []), [relatorio]);
  const obrasResumo = useMemo(() => (Array.isArray(relatorio?.obras) ? relatorio.obras : []), [relatorio]);
  const statusResumo = useMemo(() => (Array.isArray(relatorio?.status) ? relatorio.status : []), [relatorio]);
  const maxMesValor = useMemo(() => (
    meses.reduce((max, item) => Math.max(max, Number(item.valor_total || 0)), 0)
  ), [meses]);

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
            <h1 className="page-title">Evolucao Mensal de Compras</h1>
            <p className="page-subtitle">
              Curva mensal de pedidos de compra emitidos, valor total, ticket medio e concentracao por obra/centro.
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
          <span className="dashboard-metric-label">Meses</span>
          <strong>{formatNumber(resumo.meses)}</strong>
          <small>Com movimentacao</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Valor total</span>
          <strong>{formatMoney(resumo.valor_total)}</strong>
          <small>Soma dos pedidos</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Ticket medio</span>
          <strong>{formatMoney(resumo.ticket_medio)}</strong>
          <small>Valor por pedido</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Maior mes</span>
          <strong>{resumo.maior_mes?.label || '-'}</strong>
          <small>{resumo.maior_mes ? formatMoney(resumo.maior_mes.valor_total) : 'Sem dados'}</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Fornecedores</span>
          <strong>{formatNumber(resumo.fornecedores)}</strong>
          <small>Com pedido no periodo</small>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Curva mensal</h2>
        <p className="page-subtitle mb-3">Pedidos agrupados pelo mes real de criacao do pedido de compra.</p>
        <TabelaPadrao
          // R17: serie puramente temporal (mes x totais) — a linha e um
          // periodo, nao um registro nomeado; nao ha coluna de identidade.
          semIdentidade
          colunas={[
            { id: 'mes', titulo: 'Mes', tipo: 'texto', noCard: 'titulo', render: (item) => <span className="font-semibold text-slate-900">{item.label}</span> },
            { id: 'pedidos', titulo: 'Pedidos', tipo: 'numero', render: (item) => formatNumber(item.pedidos) },
            { id: 'fornecedores', titulo: 'Fornecedores', tipo: 'numero', render: (item) => formatNumber(item.fornecedores) },
            { id: 'obras', titulo: 'Obras', tipo: 'numero', render: (item) => formatNumber(item.obras) },
            { id: 'itens', titulo: 'Itens', tipo: 'numero', render: (item) => formatNumber(item.itens) },
            {
              id: 'valor',
              titulo: 'Valor',
              tipo: 'valor',
              render: (item) => (
                <span className="font-semibold">
                  {formatMoney(item.valor_total)}
                  <MiniBar value={item.valor_total} max={maxMesValor} />
                </span>
              )
            },
            { id: 'ticket', titulo: 'Ticket', tipo: 'valor', render: (item) => formatMoney(item.ticket_medio) },
            {
              id: 'status',
              titulo: 'Status',
              tipo: 'texto',
              render: (item) => (
                <>
                  {(item.status || []).slice(0, 3).map((status) => (
                    <span key={status.key} className="badge badge-soft mr-1">
                      {status.label}: {status.total}
                    </span>
                  ))}
                </>
              )
            }
          ]}
          itens={meses}
          getId={(item) => item.key}
          carregando={loading}
          storageKey="tabela:compras-evolucao:meses"
          rotuloRolagem="Curva mensal"
          vazio="Sem pedidos nos filtros."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr] mt-4">
        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Compras por obra/centro</h2>
          <p className="page-subtitle mb-3">Ranking de valor comprado por obra ou centro de custo no periodo.</p>
          <TabelaPadrao
            colunas={[
              {
                id: 'obra',
                titulo: 'Obra/Centro',
                // R17: a obra/centro NOMEIA a linha do ranking.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => item.obra_nome
              },
              { id: 'pedidos', titulo: 'Pedidos', tipo: 'numero', render: (item) => formatNumber(item.pedidos) },
              { id: 'fornecedores', titulo: 'Fornecedores', tipo: 'numero', render: (item) => formatNumber(item.fornecedores) },
              { id: 'itens', titulo: 'Itens', tipo: 'numero', render: (item) => formatNumber(item.itens) },
              { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (item) => <span className="font-semibold">{formatMoney(item.valor_total)}</span> },
              { id: 'ticket', titulo: 'Ticket', tipo: 'valor', render: (item) => formatMoney(item.ticket_medio) },
              {
                id: 'meses',
                titulo: 'Meses',
                tipo: 'texto',
                render: (item) => (
                  <span className="text-xs text-slate-600">
                    {(item.meses || []).slice(-3).map((mes) => `${mes.label}: ${formatMoney(mes.valor_total)}`).join(' | ') || '-'}
                  </span>
                )
              }
            ]}
            itens={obrasResumo}
            getId={(item) => item.key}
            carregando={loading}
            storageKey="tabela:compras-evolucao:obras"
            rotuloRolagem="Compras por obra/centro"
            vazio="Sem dados por obra/centro."
          />
        </div>

        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Pedidos por status</h2>
          <p className="page-subtitle mb-3">Distribuicao dos pedidos usados na evolucao.</p>
          <TabelaPadrao
            colunas={[
              {
                id: 'status',
                titulo: 'Status',
                // R17: o status NOMEIA a linha deste agrupamento.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => item.label
              },
              { id: 'total', titulo: 'Total', tipo: 'numero', render: (item) => formatNumber(item.total) },
              { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (item) => <span className="font-semibold">{formatMoney(item.valor_total)}</span> }
            ]}
            itens={statusResumo}
            getId={(item) => item.key}
            carregando={loading}
            storageKey="tabela:compras-evolucao:status"
            rotuloRolagem="Pedidos por status"
            vazio="Sem status nos filtros."
          />
        </div>
      </div>
    </div>
  );
}
