import { useEffect, useMemo, useState } from 'react';
import { HiOutlineEye } from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import { listarPedidosCompra } from '../../../services/compras';
import { getStatusPedidosCompra } from '../../../services/configuracoesSistema';
import { getObras } from '../../../services/obras';
import useComprasRealtimeRefresh from '../hooks/useComprasRealtimeRefresh';
import StatusBadge from '../../../components/StatusBadge';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatStatusLabel(value, statusMap) {
  return statusMap[String(value || '').toUpperCase()]?.nome || String(value || '-').replace(/_/g, ' ').toUpperCase();
}

// Família semântica da etiqueta: status que bloqueia edição = neutro
// (encerrado), ABERTO = em andamento (info), demais = concluído.
function statusKind(status, statusMap) {
  const config = statusMap[String(status || '').toUpperCase()];
  if (config?.bloqueia_edicao) return 'neutral';
  if (String(status || '').toUpperCase() === 'ABERTO') return 'info';
  return 'success';
}

const STATUS_PEDIDOS_FALLBACK = [
  { codigo: 'ABERTO', nome: 'Aberto', ativo: true },
  { codigo: 'EM_ANALISE', nome: 'Em analise interna', ativo: true },
  { codigo: 'ENVIADO_FORNECEDOR', nome: 'Enviado ao fornecedor', ativo: true },
  { codigo: 'NEGOCIACAO', nome: 'Em negociacao', ativo: true },
  { codigo: 'FECHADO_FORNECEDOR', nome: 'Fechado com o fornecedor', ativo: true },
  { codigo: 'CANCELADO', nome: 'Cancelado', ativo: true }
];

async function carregarStatusPedidosComFallback() {
  try {
    const dataStatus = await getStatusPedidosCompra();
    const statuses = Array.isArray(dataStatus?.statuses) ? dataStatus.statuses : [];
    return statuses.length ? statuses : STATUS_PEDIDOS_FALLBACK;
  } catch (error) {
    console.warn('Falha ao buscar configuracao de status dos pedidos. Usando lista padrao.', error);
    return STATUS_PEDIDOS_FALLBACK;
  }
}

export default function PedidosCompra() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [obras, setObras] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false);
  const [filtros, setFiltros] = useState({
    q: '',
    status: '',
    obra_id: ''
  });

  async function carregar() {
    try {
      setLoading(true);
      const [dataPedidos, dataObras, dataStatus] = await Promise.all([
        listarPedidosCompra({
          q: filtros.q || undefined,
          status: filtros.status || undefined,
          obra_id: filtros.obra_id || undefined,
          visao: 'resumo'
        }),
        getObras(),
        carregarStatusPedidosComFallback()
      ]);

      setPedidos(Array.isArray(dataPedidos) ? dataPedidos : []);
      setObras(Array.isArray(dataObras) ? dataObras : []);
      setStatusOptions(Array.isArray(dataStatus) ? dataStatus : []);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao carregar pedidos de compra');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  useComprasRealtimeRefresh(carregar);

  const statusMap = useMemo(
    () => Object.fromEntries((statusOptions || []).map((item) => [String(item.codigo || '').toUpperCase(), item])),
    [statusOptions]
  );
  const totalPedidos = pedidos.length;
  const totalValor = pedidos.reduce((acc, pedido) => acc + Number(pedido.valor_total || 0), 0);

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Pedidos de Compra</h1>
            <p className="page-subtitle">
              Consulta dos pedidos gerados a partir das cotacoes encerradas, com gestao restrita ao setor de compras.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card solicitacoes-filtros app-filters-card">
        <div className="sol-filtros-head">
          <div>
            <h2 className="font-semibold text-[var(--c-text)]">Filtros</h2>
            <p className="text-sm text-[var(--c-muted)]">
              Busque por fornecedor, obra, numero do pedido ou status da negociacao.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline compras-mobile-filter-toggle"
            aria-expanded={filtrosVisiveis}
            onClick={() => setFiltrosVisiveis((atual) => !atual)}
          >
            {filtrosVisiveis ? 'Ocultar filtros' : 'Exibir filtros'}
          </button>
        </div>

        <div className={`compras-filter-content ${filtrosVisiveis ? 'is-open' : ''}`}>
          <div className="app-filters-grid">
            <label className="app-filter-field">
              <span className="app-filter-label">Busca geral</span>
              <input
                className="input"
                placeholder="Fornecedor, obra ou pedido"
                value={filtros.q}
                onChange={(event) => setFiltros((atual) => ({ ...atual, q: event.target.value }))}
              />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Status</span>
              <select
                className="input"
                value={filtros.status}
                onChange={(event) => setFiltros((atual) => ({ ...atual, status: event.target.value }))}
              >
                <option value="">Todos os status</option>
                {statusOptions
                  .filter((item) => item?.ativo !== false)
                  .map((status) => (
                    <option key={status.codigo} value={status.codigo}>
                      {status.nome}
                    </option>
                  ))}
              </select>
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Obra</span>
              <select
                className="input"
                value={filtros.obra_id}
                onChange={(event) => setFiltros((atual) => ({ ...atual, obra_id: event.target.value }))}
              >
                <option value="">Todas as obras</option>
                {obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="app-page-actions justify-end">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setFiltros({ q: '', status: '', obra_id: '' })}
            >
              Limpar filtros
            </button>
            <button type="button" className="btn btn-primary" onClick={carregar} disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 app-summary-grid">
        <div className="app-summary-card">
          <div className="app-summary-label">Pedidos listados</div>
          <div className="app-summary-value">{totalPedidos}</div>
        </div>
        <div className="app-summary-card">
          <div className="app-summary-label">Valor total em pedidos</div>
          <div className="app-summary-value">{formatMoney(totalValor)}</div>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card compras-table-card compras-adaptive-list">
        <div className="card-header flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Lista de pedidos</h2>
          <span className="text-sm text-[var(--c-muted)]">{pedidos.length} registro(s)</span>
        </div>

        {loading ? (
          <div className="app-empty-card">Carregando...</div>
        ) : pedidos.length === 0 ? (
          <div className="app-empty-card">Nenhum pedido de compra encontrado para os filtros informados.</div>
        ) : (
          <div className="compras-table-wrapper">
            <table className="compras-data-table compras-data-table-pedidos">
              <colgroup>
                <col className="compras-col-codigo" />
                <col className="compras-col-fornecedor" />
                <col className="compras-col-obra" />
                <col className="compras-col-codigo" />
                <col className="compras-col-numero" />
                <col className="compras-col-valor" />
                <col className="compras-col-valor" />
                <col className="compras-col-status" />
                <col className="compras-col-acoes" />
              </colgroup>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Fornecedor</th>
                  <th>Obra</th>
                  <th>Solicitacao</th>
                  <th>Itens ativos</th>
                  <th>Valor total</th>
                  <th>Pedido minimo</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido) => {
                  const itensAtivos = pedido.itens_ativos_count
                    ?? (pedido.itens || []).filter((item) => !item.removido).length;

                  return (
                    <tr key={pedido.id}>
                      <td>PC-{String(pedido.id).padStart(5, '0')}</td>
                      <td>{pedido.fornecedor?.nome || '-'}</td>
                      <td>{pedido.obra?.nome || '-'}</td>
                      <td>
                        SC-{String(pedido.solicitacao_compra_id || pedido.solicitacao?.id || '').padStart(5, '0')}
                      </td>
                      <td>{itensAtivos}</td>
                      <td>{formatMoney(pedido.valor_total)}</td>
                      <td>
                        {pedido.valor_minimo_pedido ? formatMoney(pedido.valor_minimo_pedido) : '-'}
                        {!pedido.atingiu_pedido_minimo ? (
                          <div className="text-xs font-medium text-amber-700">Nao atingido</div>
                        ) : null}
                      </td>
                      <td>
                        <StatusBadge status={formatStatusLabel(pedido.status, statusMap)} kind={statusKind(pedido.status, statusMap)} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="compras-icon-action"
                          onClick={() => navigate(`/pedidos-compra/${pedido.id}`)}
                          title="Abrir pedido"
                          aria-label={`Abrir pedido PC-${String(pedido.id).padStart(5, '0')}`}
                        >
                          <HiOutlineEye />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && pedidos.length > 0 ? (
          <div className="compras-mobile-list" aria-label="Pedidos de compra">
            {pedidos.map((pedido) => {
              const itensAtivos = pedido.itens_ativos_count
                ?? (pedido.itens || []).filter((item) => !item.removido).length;
              const codigoPedido = `PC-${String(pedido.id).padStart(5, '0')}`;

              return (
                <article key={`mobile-${pedido.id}`} className="compras-mobile-record">
                  <div className="compras-mobile-record-head">
                    <div className="compras-mobile-record-title">
                      <strong>{codigoPedido}</strong>
                      <span>{pedido.fornecedor?.nome || '-'}</span>
                    </div>
                    <StatusBadge status={formatStatusLabel(pedido.status, statusMap)} kind={statusKind(pedido.status, statusMap)} />
                  </div>
                  <div className="compras-mobile-record-grid">
                    <div className="compras-mobile-field"><span>Obra</span><strong>{pedido.obra?.nome || '-'}</strong></div>
                    <div className="compras-mobile-field"><span>Solicitacao</span><strong>SC-{String(pedido.solicitacao_compra_id || pedido.solicitacao?.id || '').padStart(5, '0')}</strong></div>
                    <div className="compras-mobile-field"><span>Itens ativos</span><strong>{itensAtivos}</strong></div>
                    <div className="compras-mobile-field"><span>Valor total</span><strong>{formatMoney(pedido.valor_total)}</strong></div>
                    <div className="compras-mobile-field"><span>Pedido minimo</span><strong>{pedido.valor_minimo_pedido ? formatMoney(pedido.valor_minimo_pedido) : '-'}</strong></div>
                  </div>
                  <div className="compras-mobile-record-actions">
                    <button type="button" className="btn btn-outline" onClick={() => navigate(`/pedidos-compra/${pedido.id}`)}>
                      Abrir pedido
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
