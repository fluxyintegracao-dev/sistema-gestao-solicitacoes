import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarPedidosCompra } from '../../../services/compras';
import { getStatusPedidosCompra } from '../../../services/configuracoesSistema';
import { getObras } from '../../../services/obras';
import { useAuth } from '../../../contexts/AuthContext';
import { canManageComprasPedidos } from '../../../utils/acessoProduto';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatStatusLabel(value, statusMap) {
  return statusMap[String(value || '').toUpperCase()]?.nome || String(value || '-').replace(/_/g, ' ').toUpperCase();
}

function statusClass(status, statusMap) {
  const config = statusMap[String(status || '').toUpperCase()];

  if (config?.bloqueia_edicao) {
    return 'app-status-pill bg-slate-100 text-slate-700';
  }

  if (String(status || '').toUpperCase() === 'ABERTO') {
    return 'app-status-pill bg-blue-100 text-blue-700';
  }

  return 'app-status-pill bg-emerald-100 text-emerald-700';
}

export default function PedidosCompra() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const podeGerenciarPedidos = canManageComprasPedidos(user);
  const [pedidos, setPedidos] = useState([]);
  const [obras, setObras] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading] = useState(false);
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
          obra_id: filtros.obra_id || undefined
        }),
        getObras(),
        getStatusPedidosCompra()
      ]);

      setPedidos(Array.isArray(dataPedidos) ? dataPedidos : []);
      setObras(Array.isArray(dataObras) ? dataObras : []);
      setStatusOptions(Array.isArray(dataStatus?.statuses) ? dataStatus.statuses : []);
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
        </div>

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

      <div className="mt-4 card sol-surface-card">
        <div className="card-header flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Lista de pedidos</h2>
          <span className="text-sm text-[var(--c-muted)]">{pedidos.length} registro(s)</span>
        </div>

        {loading ? (
          <div className="app-empty-card">Carregando...</div>
        ) : pedidos.length === 0 ? (
          <div className="app-empty-card">Nenhum pedido de compra encontrado para os filtros informados.</div>
        ) : (
          <div className="app-table-shell overflow-x-auto">
            <table className="table">
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
                  const itensAtivos = (pedido.itens || []).filter((item) => !item.removido).length;

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
                        <span className={statusClass(pedido.status, statusMap)}>
                          {formatStatusLabel(pedido.status, statusMap)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => navigate(`/pedidos-compra/${pedido.id}`)}
                        >
                          {podeGerenciarPedidos ? 'Gerenciar' : 'Abrir'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
