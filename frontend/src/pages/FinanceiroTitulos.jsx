import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTitulosFinanceiros } from '../services/financeiro';
import { getMinhasObras } from '../services/obras';
import { canViewIntegracaoSienge } from '../utils/acessoProduto';

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function statusClass(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'QUITADO') return 'app-status-pill bg-emerald-100 text-emerald-700';
  if (normalized === 'PARCIAL') return 'app-status-pill bg-amber-100 text-amber-700';
  if (normalized === 'CANCELADO' || normalized === 'ESTORNADO') return 'app-status-pill bg-rose-100 text-rose-700';
  return 'app-status-pill bg-slate-100 text-slate-700';
}

function queueStatusClass(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'SUCESSO') return 'app-status-pill bg-emerald-100 text-emerald-700';
  if (normalized === 'ERRO') return 'app-status-pill bg-rose-100 text-rose-700';
  if (normalized === 'PROCESSANDO') return 'app-status-pill bg-amber-100 text-amber-700';
  return 'app-status-pill bg-slate-100 text-slate-700';
}

function isOverdue(titulo) {
  const normalized = String(titulo?.status || '').trim().toUpperCase();
  if (!['ABERTO', 'PARCIAL'].includes(normalized)) return false;
  const today = new Date();
  const dueDate = new Date(`${titulo?.data_vencimento}T00:00:00`);
  if (Number.isNaN(dueDate.getTime())) return false;
  return dueDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

export default function FinanceiroTitulos() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ tipo: 'PAGAR', status: 'ABERTO', obra_id: '' });
  const [obras, setObras] = useState([]);
  const [titulos, setTitulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingObras, setLoadingObras] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getMinhasObras({ modo: 'FINANCEIRO' })
      .then((data) => {
        if (active) {
          setObras(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (active) {
          setObras([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingObras(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getTitulosFinanceiros(filters)
      .then((data) => {
        if (active) {
          setTitulos(Array.isArray(data) ? data : []);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err?.message || 'Erro ao carregar titulos financeiros');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [filters]);

  const resumo = useMemo(() => titulos.reduce((acc, item) => {
    acc.total += Number(item.valor_original || 0);
    acc.saldo += Number(item.valor_saldo || 0);
    acc.quantidade += 1;
    if (isOverdue(item)) {
      acc.vencido += Number(item.valor_saldo || 0);
      acc.quantidadeVencida += 1;
    }
    return acc;
  }, {
    total: 0,
    saldo: 0,
    vencido: 0,
    quantidade: 0,
    quantidadeVencida: 0
  }), [titulos]);

  const mostraColunaSienge = canViewIntegracaoSienge(user);
  const totalColunas = mostraColunaSienge ? 11 : 10;

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Titulos Financeiros</h1>
            <p className="page-subtitle">Base operacional das contas a pagar e receber.</p>
          </div>
          <div className="app-page-actions">
            <Link to="/financeiro/relatorios" className="btn btn-outline btn-sm">Relatorios</Link>
            <Link to="/financeiro/conciliacao" className="btn btn-outline btn-sm">Conciliacao OFX</Link>
            <Link to="/financeiro/cadastros" className="btn btn-outline btn-sm">Cadastros</Link>
            <Link to="/financeiro/titulos/novo?tipo=PAGAR" className="btn btn-outline btn-sm">Nova conta a pagar</Link>
            <Link to="/financeiro/titulos/novo?tipo=RECEBER" className="btn btn-primary btn-sm">Nova conta a receber</Link>
          </div>
        </div>
      </div>

      <div className="card sol-surface-card">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`btn btn-sm ${filters.tipo === 'PAGAR' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilters((current) => ({ ...current, tipo: 'PAGAR' }))}
          >
            Pagar
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filters.tipo === 'RECEBER' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilters((current) => ({ ...current, tipo: 'RECEBER' }))}
          >
            Receber
          </button>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            {[
              { label: 'Titulos', value: String(resumo.quantidade) },
              { label: 'Total', value: formatCurrency(resumo.total) },
              { label: 'Saldo', value: formatCurrency(resumo.saldo) },
              { label: 'Vencidos', value: formatCurrency(resumo.vencido), sub: `${resumo.quantidadeVencida} titulo(s)` }
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-end">
                <span className="text-[10px] uppercase tracking-wide text-[var(--c-muted)]">{item.label}</span>
                <span className="text-sm font-bold text-[var(--c-text)] tabular-nums leading-tight">{item.value}</span>
                {item.sub ? <span className="text-[10px] text-[var(--c-muted)]">{item.sub}</span> : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card sol-surface-card">
        <div className="flex flex-wrap items-end gap-3">
          <label className="app-filter-field min-w-[110px]">
            <span className="app-filter-label">Tipo</span>
            <select
              className="input w-full input-sm"
              value={filters.tipo}
              onChange={(event) => setFilters((current) => ({ ...current, tipo: event.target.value }))}
            >
              <option value="PAGAR">Pagar</option>
              <option value="RECEBER">Receber</option>
            </select>
          </label>

          <label className="app-filter-field min-w-[110px]">
            <span className="app-filter-label">Status</span>
            <select
              className="input w-full input-sm"
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="ABERTO">Aberto</option>
              <option value="PARCIAL">Parcial</option>
              <option value="QUITADO">Quitado</option>
              <option value="CANCELADO">Cancelado</option>
              <option value="ESTORNADO">Estornado</option>
            </select>
          </label>

          <label className="app-filter-field flex-1 min-w-[160px]">
            <span className="app-filter-label">Obra</span>
            <select
              className="input w-full input-sm"
              value={filters.obra_id}
              onChange={(event) => setFilters((current) => ({ ...current, obra_id: event.target.value }))}
              disabled={loadingObras}
            >
              <option value="">Todas as obras</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>{obra.nome}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error ? <div className="app-alert app-alert--error">{error}</div> : null}

      <div className="sol-surface-card card overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg)]">
                {[
                  'Tipo',
                  'Titulo',
                  'Status',
                  'Parceiro',
                  'Obra',
                  'Solicitacao',
                  'Cobranca',
                  ...(mostraColunaSienge ? ['SIENGE'] : []),
                  'Vencimento',
                  'Valor',
                  'Saldo'
                ].map((header) => (
                  <th
                    key={header}
                    className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--c-muted)] whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-border)]">
              {loading ? (
                <tr>
                  <td colSpan={totalColunas} className="px-3 py-4 text-center text-[var(--c-muted)]">
                    Carregando...
                  </td>
                </tr>
              ) : null}

              {!loading && titulos.length === 0 ? (
                <tr>
                  <td colSpan={totalColunas} className="px-3 py-4 text-center text-[var(--c-muted)]">
                    Nenhum titulo encontrado.
                  </td>
                </tr>
              ) : null}

              {!loading && titulos.map((titulo) => (
                <tr
                  key={titulo.id}
                  className={`align-top transition-colors hover:bg-[var(--c-bg)] ${isOverdue(titulo) ? 'bg-rose-50/40' : ''}`}
                >
                  <td className="px-3 py-2 font-medium text-[var(--c-muted)] whitespace-nowrap">{titulo.tipo}</td>
                  <td className="px-3 py-2 max-w-[200px]">
                    <Link
                      className="block truncate font-medium text-[var(--c-primary)] hover:underline"
                      to={`/financeiro/titulos/${titulo.id}`}
                    >
                      {titulo.descricao || `Titulo #${titulo.id}`}
                    </Link>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={statusClass(titulo.status)}>{titulo.status}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-[var(--c-text)] whitespace-nowrap">{titulo.parceiro?.nome || '-'}</div>
                    <div className="text-[10px] text-[var(--c-muted)]">{titulo.parceiro?.cpf_cnpj || ''}</div>
                  </td>
                  <td className="px-3 py-2 max-w-[140px] truncate text-[var(--c-muted)] whitespace-nowrap">
                    {titulo.obra?.nome || '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {titulo.solicitacao?.id ? (
                      <Link
                        className="text-[var(--c-primary)] hover:underline"
                        to={`/solicitacoes/${titulo.solicitacao.id}`}
                      >
                        {titulo.solicitacao.codigo || `#${titulo.solicitacao.id}`}
                      </Link>
                    ) : (
                      <span className="app-status-pill bg-sky-100 text-sky-700">MANUAL</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {titulo.tipo === 'RECEBER' && titulo.forma_cobranca ? (
                      <div>
                        <div className="font-semibold text-[var(--c-text)]">{titulo.forma_cobranca}</div>
                        <div className="text-[10px] text-[var(--c-muted)]">{titulo.status_cobranca || 'PENDENTE_EMISSAO'}</div>
                      </div>
                    ) : (
                      <span className="text-[var(--c-muted)]">-</span>
                    )}
                  </td>
                  {mostraColunaSienge ? (
                    <td className="px-3 py-2 whitespace-nowrap">
                      {String(titulo.tipo || '').trim().toUpperCase() !== 'PAGAR' ? (
                        <span className="text-[var(--c-muted)]">-</span>
                      ) : titulo.integracaoSienge ? (
                        <div>
                          <span className={queueStatusClass(titulo.integracaoSienge.status)}>
                            {titulo.integracaoSienge.status}
                          </span>
                          <div className="mt-1 text-[10px] text-[var(--c-muted)]">
                            {titulo.integracaoSienge.external_title_id
                              ? `Externo: ${titulo.integracaoSienge.external_title_id}`
                              : `Tentativas: ${titulo.integracaoSienge.tentativas || 0}`}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="app-status-pill bg-slate-100 text-slate-700">NAO ENVIADO</span>
                          <div className="mt-1 text-[10px] text-[var(--c-muted)]">Operar no detalhe do titulo</div>
                        </div>
                      )}
                    </td>
                  ) : null}
                  <td className={`px-3 py-2 whitespace-nowrap ${isOverdue(titulo) ? 'font-semibold text-rose-600' : 'text-[var(--c-text)]'}`}>
                    {formatDate(titulo.data_vencimento)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-[var(--c-text)] tabular-nums">
                    {formatCurrency(titulo.valor_original)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap font-semibold text-[var(--c-text)] tabular-nums">
                    {formatCurrency(titulo.valor_saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
