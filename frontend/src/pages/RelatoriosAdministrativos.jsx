import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listarAuditoriaItensPedidoCompra } from '../services/compras';
import { getMinhasObras } from '../services/obras';

const DEFAULT_FILTERS = {
  obra_id: '',
  pedido_id: '',
  item_id: '',
  acao: '',
  q: ''
};

const ACTION_OPTIONS = [
  { value: '', label: 'Todas as acoes' },
  { value: 'AJUSTE_MANUAL', label: 'Ajuste manual' },
  { value: 'ITEM_ADICIONADO', label: 'Item adicionado' },
  { value: 'ITEM_ADICIONADO_FORNECEDOR', label: 'Item adicionado do fornecedor' },
  { value: 'ITEM_ADICIONADO_MANUAL', label: 'Item adicionado manualmente' },
  { value: 'GERADO_DA_COTACAO', label: 'Gerado da cotacao' },
  { value: 'REMOVIDO', label: 'Item removido' }
];

const ACTION_LABELS = Object.fromEntries(
  ACTION_OPTIONS.filter((item) => item.value).map((item) => [item.value, item.label])
);

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString('pt-BR');
}

function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '-';
  }

  return numeric.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
    maximumFractionDigits: 2
  });
}

function parseJson(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function formatActionLabel(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return ACTION_LABELS[normalized] || normalized.replace(/_/g, ' ') || '-';
}

function readFilters(searchParams) {
  return {
    obra_id: searchParams.get('obra_id') || '',
    pedido_id: searchParams.get('pedido_id') || '',
    item_id: searchParams.get('item_id') || '',
    acao: searchParams.get('acao') || '',
    q: searchParams.get('q') || ''
  };
}

function buildSearchParams(filters) {
  const params = new URLSearchParams();

  Object.entries(filters || {}).forEach(([key, value]) => {
    const normalized = String(value || '').trim();
    if (normalized) {
      params.set(key, normalized);
    }
  });

  return params;
}

function actionClassName(value) {
  switch (String(value || '').toUpperCase()) {
    case 'AJUSTE_MANUAL':
      return 'app-status-pill bg-blue-100 text-blue-700';
    case 'REMOVIDO':
      return 'app-status-pill bg-slate-100 text-slate-700';
    default:
      return 'app-status-pill bg-emerald-100 text-emerald-700';
  }
}

function formatFieldValue(field, value) {
  if (value == null || value === '') {
    return '-';
  }

  if (field === 'preco_unitario') {
    return formatMoney(value);
  }

  if (field === 'quantidade_pedido') {
    return formatNumber(value);
  }

  return String(value);
}

function buildChangeSummary(registro) {
  const anteriores = parseJson(registro?.dados_anteriores);
  const novos = parseJson(registro?.dados_novos);
  const parts = [];

  ['quantidade_pedido', 'preco_unitario', 'observacoes'].forEach((field) => {
    const before = anteriores?.[field];
    const after = novos?.[field];

    if (before == null && after == null) {
      return;
    }

    if (before === after) {
      parts.push(`${field}: ${formatFieldValue(field, after)}`);
      return;
    }

    parts.push(`${field}: ${formatFieldValue(field, before)} -> ${formatFieldValue(field, after)}`);
  });

  if (!parts.length && novos?.resposta_item_id) {
    parts.push(`Resposta vinculada: ${novos.resposta_item_id}`);
  }

  if (!parts.length && (anteriores || novos)) {
    parts.push(JSON.stringify(novos || anteriores));
  }

  return parts.join(' | ') || '-';
}

function normalizeAuditErrorMessage(error) {
  const message = String(error?.message || '').trim();

  if (/Cannot GET\s+\/api\/compras\/relatorios\/auditoria-itens-pedido/i.test(message)) {
    return 'A API de auditoria ainda nao esta disponivel no backend em execucao. Reinicie o backend para carregar a nova rota de auditoria de compras.';
  }

  if (/404/.test(message) && /auditoria-itens-pedido/i.test(message)) {
    return 'A rota de auditoria de compras nao foi encontrada no backend em execucao. Reinicie o backend para aplicar a nova rota.';
  }

  return message || 'Erro ao carregar auditoria de compras';
}

export default function RelatoriosAdministrativos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtros, setFiltros] = useState(() => readFilters(searchParams));
  const [obras, setObras] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState('');

  useEffect(() => {
    let ativo = true;

    getMinhasObras()
      .then((data) => {
        if (!ativo) {
          return;
        }
        setObras(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error(error);
      });

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
        setErroCarregamento('');
        const data = await listarAuditoriaItensPedidoCompra(filtrosAtivos);
        if (!ativo) {
          return;
        }
        setRegistros(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        if (ativo) {
          setRegistros([]);
          setErroCarregamento(normalizeAuditErrorMessage(error));
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

  const resumo = useMemo(() => {
    const pedidos = new Set();
    const itens = new Set();

    registros.forEach((registro) => {
      if (registro?.pedido?.id) {
        pedidos.add(registro.pedido.id);
      }
      if (registro?.item?.id) {
        itens.add(registro.item.id);
      }
    });

    return {
      total: registros.length,
      pedidos: pedidos.size,
      itens: itens.size,
      ultimaMovimentacao: registros[0]?.createdAt || null
    };
  }, [registros]);

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
            <h1 className="page-title">Relatorios Administrativos</h1>
            <p className="page-subtitle">
              Painel central do ADMINISTRADOR para auditoria e relatorios da operacao. A primeira entrega concentra a
              auditoria dos itens de pedidos de compra.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/pedidos-compra" className="btn btn-outline">
              Voltar aos pedidos
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card solicitacoes-filtros app-filters-card">
        <div className="sol-filtros-head">
          <div>
            <h2 className="font-semibold text-[var(--c-text)]">Auditoria de compras</h2>
            <p className="text-sm text-[var(--c-muted)]">
              Consulte alteracoes por obra, pedido, item, acao ou qualquer termo do historico registrado.
            </p>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={aplicarFiltros}>
          <div className="app-filters-grid">
            <label className="app-filter-field">
              <span className="app-filter-label">Obra</span>
              <select
                className="input"
                value={filtros.obra_id}
                onChange={(event) => setFiltros((current) => ({ ...current, obra_id: event.target.value }))}
              >
                <option value="">Todas as obras</option>
                {obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Pedido</span>
              <input
                className="input"
                inputMode="numeric"
                placeholder="Ex.: 12"
                value={filtros.pedido_id}
                onChange={(event) => setFiltros((current) => ({ ...current, pedido_id: event.target.value }))}
              />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Item</span>
              <input
                className="input"
                inputMode="numeric"
                placeholder="Ex.: 381"
                value={filtros.item_id}
                onChange={(event) => setFiltros((current) => ({ ...current, item_id: event.target.value }))}
              />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Acao</span>
              <select
                className="input"
                value={filtros.acao}
                onChange={(event) => setFiltros((current) => ({ ...current, acao: event.target.value }))}
              >
                {ACTION_OPTIONS.map((option) => (
                  <option key={option.value || 'ALL'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Busca geral</span>
              <input
                className="input"
                placeholder="Pedido, item, obra, usuario ou descricao"
                value={filtros.q}
                onChange={(event) => setFiltros((current) => ({ ...current, q: event.target.value }))}
              />
            </label>
          </div>

          <div className="app-page-actions justify-end">
            <button type="button" className="btn btn-outline" onClick={limparFiltros}>
              Limpar filtros
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 app-summary-grid">
        <div className="app-summary-card">
          <span className="app-summary-label">Registros</span>
          <strong className="app-summary-value">{resumo.total}</strong>
          <span className="app-summary-subvalue">Movimentacoes listadas</span>
        </div>
        <div className="app-summary-card">
          <span className="app-summary-label">Pedidos afetados</span>
          <strong className="app-summary-value">{resumo.pedidos}</strong>
          <span className="app-summary-subvalue">Pedidos com log visivel</span>
        </div>
        <div className="app-summary-card">
          <span className="app-summary-label">Itens afetados</span>
          <strong className="app-summary-value">{resumo.itens}</strong>
          <span className="app-summary-subvalue">Itens com historico no filtro</span>
        </div>
        <div className="app-summary-card">
          <span className="app-summary-label">Ultima movimentacao</span>
          <strong className="app-summary-value text-base">{formatDateTime(resumo.ultimaMovimentacao)}</strong>
          <span className="app-summary-subvalue">Ordenacao decrescente por data</span>
        </div>
      </div>

      <div className="mt-4 card sol-surface-card">
        <div className="card-header flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Historico de alteracoes</h2>
            <p className="text-sm text-[var(--c-muted)]">
              Esta area sera expandida para relatorios operacionais, de compras e financeiros sem misturar o fluxo
              transacional das telas operacionais.
            </p>
          </div>
          <span className="text-sm text-[var(--c-muted)]">{registros.length} registro(s)</span>
        </div>

        {erroCarregamento ? (
          <div className="app-alert mb-4">
            {erroCarregamento}
          </div>
        ) : null}

        {loading ? (
          <div className="app-empty-card">Carregando...</div>
        ) : erroCarregamento ? (
          <div className="app-empty-card">
            A tela esta pronta, mas a consulta depende do backend com a rota de auditoria ativa.
          </div>
        ) : registros.length === 0 ? (
          <div className="app-empty-card">Nenhum registro de auditoria encontrado para os filtros informados.</div>
        ) : (
          <div className="app-table-shell overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Acao</th>
                  <th>Pedido / obra</th>
                  <th>Item</th>
                  <th>Usuario</th>
                  <th>Detalhes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {registros.map((registro) => (
                  <tr key={registro.id}>
                    <td className="whitespace-nowrap">{formatDateTime(registro.createdAt)}</td>
                    <td className="whitespace-nowrap">
                      <span className={actionClassName(registro.acao)}>{formatActionLabel(registro.acao)}</span>
                    </td>
                    <td>
                      <div className="font-medium">{registro.pedido?.codigo || '-'}</div>
                      <div className="text-xs text-[var(--c-muted)]">
                        {registro.pedido?.obra?.nome || '-'}
                        {registro.pedido?.obra?.codigo ? ` - ${registro.pedido.obra.codigo}` : ''}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium">{registro.item?.descricao || '-'}</div>
                      <div className="text-xs text-[var(--c-muted)]">
                        {registro.item?.origem || '-'}
                        {registro.item?.unidade ? ` - ${registro.item.unidade}` : ''}
                      </div>
                    </td>
                    <td>{registro.usuario?.nome || 'Sistema'}</td>
                    <td className="max-w-[420px] whitespace-normal">
                      <div>{registro.descricao || '-'}</div>
                      <div className="mt-1 text-xs text-[var(--c-muted)]">{buildChangeSummary(registro)}</div>
                    </td>
                    <td className="whitespace-nowrap">
                      {registro.pedido?.id ? (
                        <Link to={`/pedidos-compra/${registro.pedido.id}`} className="btn btn-outline">
                          Abrir pedido
                        </Link>
                      ) : (
                        <span className="text-xs text-[var(--c-muted)]">Sem pedido</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
