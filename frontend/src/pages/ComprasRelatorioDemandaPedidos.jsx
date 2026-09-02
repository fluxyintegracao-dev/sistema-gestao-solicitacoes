import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TabelaPadrao } from '../components/padrao';
import { obterRelatorioDemandaPedidosCompras } from '../services/compras';
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
    return message || 'Erro ao carregar relatorio de demanda e pedidos';
  }
}

function StatusTable({ title, subtitle, rows, storageKey, loading }) {
  return (
    <div className="card sol-surface-card overflow-hidden">
      <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">{title}</h2>
      <p className="page-subtitle mb-3">{subtitle}</p>
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
          { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (item) => formatMoney(item.valor_total) }
        ]}
        itens={rows}
        getId={(item) => item.key}
        carregando={loading}
        storageKey={storageKey}
        rotuloRolagem={title}
        vazio="Sem registros no periodo."
      />
    </div>
  );
}

export default function ComprasRelatorioDemandaPedidos() {
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
        const data = await obterRelatorioDemandaPedidosCompras(filtrosAtivos);
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
  const solicitacoesPorStatus = useMemo(() => (
    Array.isArray(relatorio?.solicitacoes_por_status) ? relatorio.solicitacoes_por_status : []
  ), [relatorio]);
  const pedidosPorStatus = useMemo(() => (
    Array.isArray(relatorio?.pedidos_por_status) ? relatorio.pedidos_por_status : []
  ), [relatorio]);
  const solicitacoesPorObra = useMemo(() => (
    Array.isArray(relatorio?.solicitacoes_por_obra) ? relatorio.solicitacoes_por_obra : []
  ), [relatorio]);
  const pedidosPorObra = useMemo(() => (
    Array.isArray(relatorio?.pedidos_por_obra) ? relatorio.pedidos_por_obra : []
  ), [relatorio]);
  const solicitacoes = useMemo(() => (
    Array.isArray(relatorio?.solicitacoes) ? relatorio.solicitacoes : []
  ), [relatorio]);
  const pedidos = useMemo(() => (
    Array.isArray(relatorio?.pedidos) ? relatorio.pedidos : []
  ), [relatorio]);

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
            <h1 className="page-title">Demanda e Pedidos</h1>
            <p className="page-subtitle">
              Visao sintetica e analitica das solicitacoes de compra e dos pedidos gerados.
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
              <span className="app-filter-label">Criacao inicial</span>
              <input
                className="input"
                type="date"
                value={filtros.data_inicio}
                onChange={(event) => setFiltros((current) => ({ ...current, data_inicio: event.target.value }))}
              />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Criacao final</span>
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
          <span>Solicitacoes</span>
          <strong>{formatNumber(resumo.solicitacoes)}</strong>
          <small>Criadas no periodo</small>
        </div>
        <div className="metric-card">
          <span>Liberadas</span>
          <strong>{formatNumber(resumo.solicitacoes_liberadas)}</strong>
          <small>Com liberacao para compra</small>
        </div>
        <div className="metric-card">
          <span>Pedidos</span>
          <strong>{formatNumber(resumo.pedidos)}</strong>
          <small>Gerados no periodo</small>
        </div>
        <div className="metric-card">
          <span>Valor pedidos</span>
          <strong>{formatMoney(resumo.valor_pedidos)}</strong>
          <small>Somente pedidos reais</small>
        </div>
        <div className="metric-card">
          <span>Ticket medio</span>
          <strong>{formatMoney(resumo.ticket_medio_pedido)}</strong>
          <small>Valor medio por pedido</small>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <StatusTable
          title="Solicitacoes por status"
          subtitle="Volume de demandas de compra pela situacao atual."
          rows={solicitacoesPorStatus}
          storageKey="tabela:compras-demanda-pedidos:status-solicitacoes"
          loading={loading}
        />
        <StatusTable
          title="Pedidos por status"
          subtitle="Pedidos emitidos agrupados pela situacao atual."
          rows={pedidosPorStatus}
          storageKey="tabela:compras-demanda-pedidos:status-pedidos"
          loading={loading}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Solicitacoes por obra/centro</h2>
          <p className="page-subtitle mb-3">Origem das demandas no periodo filtrado.</p>
          <TabelaPadrao
            colunas={[
              {
                id: 'obra',
                titulo: 'Obra/Centro',
                // R17: a obra/centro NOMEIA a linha deste resumo.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => item.label
              },
              { id: 'total', titulo: 'Total', tipo: 'numero', render: (item) => formatNumber(item.total) },
              { id: 'valor', titulo: 'Valor pedidos', tipo: 'valor', render: (item) => formatMoney(item.valor_total) }
            ]}
            itens={solicitacoesPorObra}
            getId={(item) => item.key}
            carregando={loading}
            storageKey="tabela:compras-demanda-pedidos:obras-solicitacoes"
            rotuloRolagem="Solicitacoes por obra/centro"
            vazio="Sem solicitacoes no periodo."
          />
        </div>

        <div className="card sol-surface-card overflow-hidden">
          <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Pedidos por obra/centro</h2>
          <p className="page-subtitle mb-3">Valor efetivamente pedido por origem operacional.</p>
          <TabelaPadrao
            colunas={[
              {
                id: 'obra',
                titulo: 'Obra/Centro',
                // R17: a obra/centro NOMEIA a linha deste resumo.
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => item.label
              },
              { id: 'total', titulo: 'Pedidos', tipo: 'numero', render: (item) => formatNumber(item.total) },
              { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (item) => formatMoney(item.valor_total) }
            ]}
            itens={pedidosPorObra}
            getId={(item) => item.key}
            carregando={loading}
            storageKey="tabela:compras-demanda-pedidos:obras-pedidos"
            rotuloRolagem="Pedidos por obra/centro"
            vazio="Sem pedidos no periodo."
          />
        </div>
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Analitico de solicitacoes</h2>
        <p className="page-subtitle mb-3">Ultimas 100 solicitacoes conforme os filtros aplicados.</p>
        <TabelaPadrao
          colunas={[
            {
              id: 'codigo',
              titulo: 'Codigo',
              // R17: o codigo da solicitacao NOMEIA o registro.
              tipo: 'identidade',
              noCard: 'titulo',
              render: (item) => (
                <Link className="font-semibold text-blue-700 hover:underline" to={`/solicitacoes-compra/${item.id}`}>
                  SC #{item.id}
                </Link>
              )
            },
            { id: 'titulo', titulo: 'Titulo', tipo: 'texto', render: (item) => <span className="font-semibold text-slate-900">{item.titulo || '-'}</span> },
            { id: 'status', titulo: 'Status', tipo: 'status', render: (item) => item.status_label },
            { id: 'obra', titulo: 'Obra/Centro', tipo: 'texto', render: (item) => item.obra?.nome || '-' },
            { id: 'pedidos', titulo: 'Pedidos', tipo: 'numero', render: (item) => formatNumber(item.pedidos) },
            { id: 'valor', titulo: 'Valor pedidos', tipo: 'valor', render: (item) => formatMoney(item.valor_pedidos) },
            { id: 'criado', titulo: 'Criada em', tipo: 'data', render: (item) => formatDate(item.criado_em) }
          ]}
          itens={solicitacoes}
          carregando={loading}
          storageKey="tabela:compras-demanda-pedidos:solicitacoes"
          rotuloRolagem="Analitico de solicitacoes"
          vazio="Sem solicitacoes no periodo."
        />
      </div>

      <div className="mt-4 card sol-surface-card overflow-hidden">
        <h2 className="text-lg font-bold text-[var(--c-text)] mb-1">Analitico de pedidos</h2>
        <p className="page-subtitle mb-3">Ultimos 100 pedidos conforme os filtros aplicados.</p>
        <TabelaPadrao
          colunas={[
            {
              id: 'codigo',
              titulo: 'Pedido',
              // R17: o codigo do pedido NOMEIA o registro.
              tipo: 'identidade',
              noCard: 'titulo',
              render: (item) => (
                <Link className="font-semibold text-blue-700 hover:underline" to={`/pedidos-compra/${item.id}`}>
                  PC #{item.id}
                </Link>
              )
            },
            { id: 'status', titulo: 'Status', tipo: 'status', render: (item) => item.status_label },
            { id: 'solicitacao', titulo: 'Solicitacao', tipo: 'codigo', render: (item) => (item.solicitacao ? `SC #${item.solicitacao.id}` : '-') },
            { id: 'obra', titulo: 'Obra/Centro', tipo: 'texto', render: (item) => item.obra?.nome || '-' },
            { id: 'valor', titulo: 'Valor', tipo: 'valor', render: (item) => formatMoney(item.valor_total) },
            { id: 'criado', titulo: 'Criado em', tipo: 'data', render: (item) => formatDate(item.criado_em) }
          ]}
          itens={pedidos}
          carregando={loading}
          storageKey="tabela:compras-demanda-pedidos:pedidos"
          rotuloRolagem="Analitico de pedidos"
          vazio="Sem pedidos no periodo."
        />
      </div>
    </div>
  );
}
