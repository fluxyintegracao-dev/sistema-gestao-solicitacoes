import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TabelaPadrao } from '../components/padrao';
import { obterRelatorioComprasDiretas } from '../services/compras';
import { getMinhasObras } from '../services/obras';

const DEFAULT_FILTERS = {
  obra_id: '',
  data_inicio: '',
  data_fim: '',
  status: '',
  q: '',
  item: '',
  limit: '1000'
};

function readFilters(searchParams) {
  return {
    obra_id: searchParams.get('obra_id') || '',
    data_inicio: searchParams.get('data_inicio') || '',
    data_fim: searchParams.get('data_fim') || '',
    status: searchParams.get('status') || '',
    q: searchParams.get('q') || '',
    item: searchParams.get('item') || '',
    limit: searchParams.get('limit') || '1000'
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

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
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
    return message || 'Erro ao carregar relatorio de compras diretas';
  }
}

function RankingTable({ title, subtitle, rows, valueLabel = 'Valor', nameKey = 'label', metaKey, storageKey }) {
  const safeRows = Array.isArray(rows) ? rows.slice(0, 8) : [];

  return (
    <div className="card sol-surface-card">
      <div className="app-page-header-row mb-3">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle ? <p className="muted-text">{subtitle}</p> : null}
        </div>
      </div>
      <TabelaPadrao
        colunas={[
          {
            id: 'nome',
            titulo: 'Nome',
            // R17: o nome do ranking (solicitante/credor/item/obra) NOMEIA a linha.
            tipo: 'identidade',
            noCard: 'titulo',
            render: (row) => (
              <div>
                <strong>{row[nameKey] || row.label || '-'}</strong>
                {metaKey && row[metaKey] ? <small className="block muted-text">{row[metaKey]}</small> : null}
              </div>
            )
          },
          { id: 'compras', titulo: 'Compras', tipo: 'numero', render: (row) => formatNumber(row.compras) },
          { id: 'itens', titulo: 'Itens', tipo: 'numero', render: (row) => formatNumber(row.itens) },
          { id: 'valor', titulo: valueLabel, tipo: 'valor', render: (row) => formatMoney(row.valor_total) }
        ]}
        itens={safeRows}
        getId={(row) => row.key}
        storageKey={storageKey}
        rotuloRolagem={title}
        vazio="Sem dados no periodo."
      />
    </div>
  );
}

export default function ComprasRelatorioComprasDiretas() {
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
        const data = await obterRelatorioComprasDiretas(filtrosAtivos);
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
  const itens = useMemo(() => (
    Array.isArray(relatorio?.itens) ? relatorio.itens : []
  ), [relatorio]);
  const statusOptions = useMemo(() => (
    Array.isArray(relatorio?.status) ? relatorio.status : []
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
            <h1 className="page-title">Compras Diretas</h1>
            <p className="page-subtitle">
              Monitore quem solicita, quais credores atendem, quais itens sao comprados e o volume de compras diretas.
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
                <option value="">Todas</option>
                {obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.codigo ? `${obra.codigo} - ${obra.nome}` : obra.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Criada de</span>
              <input
                className="input"
                type="date"
                value={filtros.data_inicio}
                onChange={(event) => setFiltros((current) => ({ ...current, data_inicio: event.target.value }))}
              />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Criada ate</span>
              <input
                className="input"
                type="date"
                value={filtros.data_fim}
                onChange={(event) => setFiltros((current) => ({ ...current, data_fim: event.target.value }))}
              />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Status</span>
              <input
                className="input"
                list="compras-diretas-status"
                placeholder="Ex.: ENVIADO"
                value={filtros.status}
                onChange={(event) => setFiltros((current) => ({ ...current, status: event.target.value }))}
              />
              <datalist id="compras-diretas-status">
                {statusOptions.map((entry) => (
                  <option key={entry.key} value={entry.key}>{entry.label}</option>
                ))}
              </datalist>
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Busca geral</span>
              <input
                className="input"
                placeholder="SOL, SC, solicitante, credor ou obra"
                value={filtros.q}
                onChange={(event) => setFiltros((current) => ({ ...current, q: event.target.value }))}
              />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Item</span>
              <input
                className="input"
                placeholder="Nome do item comprado"
                value={filtros.item}
                onChange={(event) => setFiltros((current) => ({ ...current, item: event.target.value }))}
              />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Limite de linhas</span>
              <input
                className="input"
                type="number"
                min="1"
                max="5000"
                value={filtros.limit}
                onChange={(event) => setFiltros((current) => ({ ...current, limit: event.target.value }))}
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
          <span className="dashboard-metric-label">Compras diretas</span>
          <strong>{formatNumber(resumo.compras)}</strong>
          <small>Solicitacoes criadas</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Valor total</span>
          <strong>{formatMoney(resumo.valor_total)}</strong>
          <small>Soma dos itens</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Itens</span>
          <strong>{formatNumber(resumo.itens)}</strong>
          <small>{formatNumber(resumo.quantidade_total, 2)} unidades informadas</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Solicitantes</span>
          <strong>{formatNumber(resumo.solicitantes)}</strong>
          <small>Usuarios com compras diretas</small>
        </div>
        <div className="dashboard-metric-card">
          <span className="dashboard-metric-label">Credores</span>
          <strong>{formatNumber(resumo.credores)}</strong>
          <small>Fornecedores/credores usados</small>
        </div>
      </div>

      <div className="grid gap-4 mt-4 lg:grid-cols-2">
        <RankingTable
          title="Solicitantes"
          subtitle="Usuarios que mais abriram compras diretas."
          rows={relatorio?.solicitantes}
          metaKey="email"
          storageKey="tabela:compras-diretas:solicitantes"
        />
        <RankingTable
          title="Credores"
          subtitle="Fornecedores/credores mais usados em compra direta."
          rows={relatorio?.credores}
          metaKey="documento"
          storageKey="tabela:compras-diretas:credores"
        />
        <RankingTable
          title="Itens comprados"
          subtitle="Itens com maior valor acumulado."
          rows={relatorio?.itens_ranking}
          metaKey="unidade"
          storageKey="tabela:compras-diretas:itens-ranking"
        />
        <RankingTable
          title="Obras / centros"
          subtitle="Centros de custo com maior uso de compra direta."
          rows={relatorio?.obras}
          metaKey="obra_codigo"
          storageKey="tabela:compras-diretas:obras"
        />
      </div>

      <div className="mt-4 card sol-surface-card">
        <div className="app-page-header-row mb-3">
          <div>
            <h2 className="section-title">Detalhamento por item</h2>
            <p className="muted-text">
              {loading ? 'Carregando...' : `${itens.length} item(ns) listado(s).`}
            </p>
          </div>
        </div>

        <TabelaPadrao
          colunas={[
            { id: 'data', titulo: 'Data', tipo: 'data', render: (row) => formatDate(row.criado_em) },
            {
              id: 'compra',
              titulo: 'SC',
              tipo: 'codigo',
              render: (row) => (
                <Link to={`/solicitacoes-compra/${row.compra_id}`} className="link-primary">
                  {row.compra_codigo}
                </Link>
              )
            },
            {
              id: 'solicitacao',
              titulo: 'SOL',
              tipo: 'codigo',
              render: (row) => (row.solicitacao_id ? (
                <Link to={`/solicitacoes/${row.solicitacao_id}`} className="link-primary">
                  {row.solicitacao_codigo || `#${row.solicitacao_id}`}
                </Link>
              ) : '-')
            },
            {
              id: 'solicitante',
              titulo: 'Solicitante',
              tipo: 'texto',
              render: (row) => (
                <div>
                  <strong>{row.solicitante?.nome || '-'}</strong>
                  {row.solicitante?.email ? <small className="block muted-text">{row.solicitante.email}</small> : null}
                </div>
              )
            },
            {
              id: 'obra',
              titulo: 'Obra',
              tipo: 'texto',
              render: (row) => (
                <div>
                  <strong>{row.obra?.nome || '-'}</strong>
                  {row.obra?.codigo ? <small className="block muted-text">{row.obra.codigo}</small> : null}
                </div>
              )
            },
            {
              id: 'credor',
              titulo: 'Credor',
              tipo: 'texto',
              render: (row) => (
                <div>
                  <strong>{row.credor?.nome || 'Sem credor'}</strong>
                  {row.credor?.documento ? <small className="block muted-text">{row.credor.documento}</small> : null}
                </div>
              )
            },
            {
              id: 'item',
              titulo: 'Item',
              // R17: o item comprado NOMEIA a linha do detalhamento.
              tipo: 'identidade',
              noCard: 'titulo',
              render: (row) => (
                <div>
                  <strong>{row.item?.descricao || '-'}</strong>
                  {row.item?.apropriacao?.codigo ? (
                    <small className="block muted-text">
                      {row.item.apropriacao.codigo} {row.item.apropriacao.descricao || ''}
                    </small>
                  ) : null}
                </div>
              )
            },
            { id: 'unidade', titulo: 'Unid.', tipo: 'texto', render: (row) => row.item?.unidade || '-' },
            { id: 'quantidade', titulo: 'Qtd.', tipo: 'numero', render: (row) => formatNumber(row.quantidade, 2) },
            { id: 'unitario', titulo: 'Unitario', tipo: 'valor', render: (row) => formatMoney(row.valor_unitario) },
            { id: 'total', titulo: 'Total', tipo: 'valor', render: (row) => formatMoney(row.valor_total) },
            { id: 'status', titulo: 'Status', tipo: 'status', render: (row) => <span className="badge badge-soft">{row.status_label || row.status}</span> }
          ]}
          itens={itens}
          getId={(row) => `${row.compra_id}-${row.item?.tipo}-${row.item?.id}`}
          carregando={loading}
          storageKey="tabela:compras-diretas:detalhe"
          rotuloRolagem="Detalhamento por item"
          vazio="Nenhuma compra direta encontrada para os filtros informados."
        />
      </div>
    </div>
  );
}
