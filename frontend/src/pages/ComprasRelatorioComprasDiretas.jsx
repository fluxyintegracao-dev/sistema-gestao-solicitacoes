import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
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

const DETAIL_COLUMNS = [
  { key: 'data', width: 120, minWidth: 95 },
  { key: 'compra', width: 110, minWidth: 95 },
  { key: 'solicitacao', width: 120, minWidth: 100 },
  { key: 'solicitante', width: 220, minWidth: 160 },
  { key: 'obra', width: 240, minWidth: 170 },
  { key: 'credor', width: 260, minWidth: 180 },
  { key: 'item', width: 260, minWidth: 180 },
  { key: 'unidade', width: 90, minWidth: 70 },
  { key: 'quantidade', width: 120, minWidth: 90 },
  { key: 'unitario', width: 130, minWidth: 105 },
  { key: 'total', width: 140, minWidth: 110 },
  { key: 'status', width: 170, minWidth: 120 }
];

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

function RankingTable({ title, subtitle, rows, valueLabel = 'Valor', nameKey = 'label', metaKey }) {
  const safeRows = Array.isArray(rows) ? rows.slice(0, 8) : [];

  return (
    <div className="card sol-surface-card">
      <div className="app-page-header-row mb-3">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle ? <p className="muted-text">{subtitle}</p> : null}
        </div>
      </div>
      <div className="table-wrapper">
        <table className="table compact-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Compras</th>
              <th>Itens</th>
              <th>{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {safeRows.length ? safeRows.map((row) => (
              <tr key={row.key}>
                <td>
                  <strong>{row[nameKey] || row.label || '-'}</strong>
                  {metaKey && row[metaKey] ? <small className="block muted-text">{row[metaKey]}</small> : null}
                </td>
                <td>{formatNumber(row.compras)}</td>
                <td>{formatNumber(row.itens)}</td>
                <td>{formatMoney(row.valor_total)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="text-center muted-text">Sem dados no periodo.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
        />
        <RankingTable
          title="Credores"
          subtitle="Fornecedores/credores mais usados em compra direta."
          rows={relatorio?.credores}
          metaKey="documento"
        />
        <RankingTable
          title="Itens comprados"
          subtitle="Itens com maior valor acumulado."
          rows={relatorio?.itens_ranking}
          metaKey="unidade"
        />
        <RankingTable
          title="Obras / centros"
          subtitle="Centros de custo com maior uso de compra direta."
          rows={relatorio?.obras}
          metaKey="obra_codigo"
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

        <div className="table-wrapper">
          <ResizableTable
            columns={DETAIL_COLUMNS}
            storageKey="compras-diretas-relatorio-detalhe-v1"
            className="table compact-table"
          >
            <thead>
              <tr>
                <ResizableTh columnKey="data">Data</ResizableTh>
                <ResizableTh columnKey="compra">SC</ResizableTh>
                <ResizableTh columnKey="solicitacao">SOL</ResizableTh>
                <ResizableTh columnKey="solicitante">Solicitante</ResizableTh>
                <ResizableTh columnKey="obra">Obra</ResizableTh>
                <ResizableTh columnKey="credor">Credor</ResizableTh>
                <ResizableTh columnKey="item">Item</ResizableTh>
                <ResizableTh columnKey="unidade">Unid.</ResizableTh>
                <ResizableTh columnKey="quantidade">Qtd.</ResizableTh>
                <ResizableTh columnKey="unitario">Unitario</ResizableTh>
                <ResizableTh columnKey="total">Total</ResizableTh>
                <ResizableTh columnKey="status">Status</ResizableTh>
              </tr>
            </thead>
            <tbody>
              {itens.length ? itens.map((row) => (
                <tr key={`${row.compra_id}-${row.item?.tipo}-${row.item?.id}`}>
                  <td>{formatDate(row.criado_em)}</td>
                  <td>
                    <Link to={`/solicitacoes-compra/${row.compra_id}`} className="link-primary">
                      {row.compra_codigo}
                    </Link>
                  </td>
                  <td>
                    {row.solicitacao_id ? (
                      <Link to={`/solicitacoes/${row.solicitacao_id}`} className="link-primary">
                        {row.solicitacao_codigo || `#${row.solicitacao_id}`}
                      </Link>
                    ) : '-'}
                  </td>
                  <td>
                    <strong>{row.solicitante?.nome || '-'}</strong>
                    {row.solicitante?.email ? <small className="block muted-text">{row.solicitante.email}</small> : null}
                  </td>
                  <td>
                    <strong>{row.obra?.nome || '-'}</strong>
                    {row.obra?.codigo ? <small className="block muted-text">{row.obra.codigo}</small> : null}
                  </td>
                  <td>
                    <strong>{row.credor?.nome || 'Sem credor'}</strong>
                    {row.credor?.documento ? <small className="block muted-text">{row.credor.documento}</small> : null}
                  </td>
                  <td>
                    <strong>{row.item?.descricao || '-'}</strong>
                    {row.item?.apropriacao?.codigo ? (
                      <small className="block muted-text">
                        {row.item.apropriacao.codigo} {row.item.apropriacao.descricao || ''}
                      </small>
                    ) : null}
                  </td>
                  <td>{row.item?.unidade || '-'}</td>
                  <td>{formatNumber(row.quantidade, 2)}</td>
                  <td>{formatMoney(row.valor_unitario)}</td>
                  <td>{formatMoney(row.valor_total)}</td>
                  <td><span className="badge badge-soft">{row.status_label || row.status}</span></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={12} className="text-center muted-text">
                    Nenhuma compra direta encontrada para os filtros informados.
                  </td>
                </tr>
              )}
            </tbody>
          </ResizableTable>
        </div>
      </div>
    </div>
  );
}
