import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineCheck,
  HiOutlineExclamationTriangle,
  HiOutlineLink,
  HiOutlineMagnifyingGlass,
  HiOutlineNoSymbol,
  HiOutlineShieldCheck,
  HiOutlineXMark
} from 'react-icons/hi2';
import { useAuth } from '../contexts/AuthContext';
import {
  confirmarFinanceiroDdaSugestao,
  getFinanceiroDdaBoletos,
  getFinanceiroDdaCandidatos,
  getFinanceiroDdaResumo,
  ignorarFinanceiroDda,
  reprocessarFinanceiroDdaMatch,
  sincronizarFinanceiroDda,
  vincularFinanceiroDda
} from '../services/financeiro';
import { hasPermissao } from '../utils/acessoProduto';

const STATUS = [
  { value: '', label: 'Todos os status' },
  { value: 'MATCH_EXATO', label: 'Correspondencia exata' },
  { value: 'AMBIGUO', label: 'Mais de um titulo' },
  { value: 'SEM_TITULO', label: 'Sem titulo localizado' },
  { value: 'DIVERGENTE', label: 'Dados divergentes' },
  { value: 'VINCULADO', label: 'Vinculado' },
  { value: 'IGNORADO', label: 'Ignorado' }
];

const STATUS_LABEL = Object.fromEntries(STATUS.filter((item) => item.value).map((item) => [item.value, item.label]));

function currency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function date(value) {
  if (!value) return '-';
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('pt-BR');
}

function statusTone(status) {
  if (status === 'VINCULADO') return 'bg-emerald-100 text-emerald-800';
  if (status === 'MATCH_EXATO') return 'bg-blue-100 text-blue-800';
  if (status === 'IGNORADO') return 'bg-slate-200 text-slate-700';
  if (status === 'DIVERGENTE') return 'bg-rose-100 text-rose-800';
  return 'bg-amber-100 text-amber-800';
}

function Metric({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="min-w-0 border-r border-slate-200 px-3 py-2 last:border-r-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 truncate text-lg font-bold ${tone}`}>{value}</div>
    </div>
  );
}

export default function FinanceiroDda() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ q: '', status: '', data_inicio: '', data_fim: '', page: 1, limit: 25 });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ total: 0, valor_total: 0, por_status: {}, integracao: {} });
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [message, setMessage] = useState(null);
  const [candidateModal, setCandidateModal] = useState(null);

  const canSync = hasPermissao(user, 'financeiro.dda.sincronizar');
  const canLink = hasPermissao(user, 'financeiro.dda.vincular');
  const canIgnore = hasPermissao(user, 'financeiro.dda.ignorar');

  const requestFilters = useMemo(() => ({
    ...filters,
    q: filters.q.trim() || undefined,
    status: filters.status || undefined,
    data_inicio: filters.data_inicio || undefined,
    data_fim: filters.data_fim || undefined
  }), [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [listResult, summaryResult] = await Promise.all([
        getFinanceiroDdaBoletos(requestFilters),
        getFinanceiroDdaResumo(requestFilters)
      ]);
      setRows(listResult?.rows || []);
      setTotal(Number(listResult?.total || 0));
      setSummary(summaryResult || { total: 0, valor_total: 0, por_status: {}, integracao: {} });
    } catch (error) {
      setMessage({ tone: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, [requestFilters]);

  useEffect(() => { load(); }, [load]);

  async function runAction(id, action, successText) {
    setActionId(id);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: 'success', text: successText });
      await load();
      return true;
    } catch (error) {
      setMessage({ tone: 'error', text: error.message });
      return false;
    } finally {
      setActionId(null);
    }
  }

  async function openCandidates(row) {
    setActionId(row.id);
    try {
      const result = await getFinanceiroDdaCandidatos(row.id);
      setCandidateModal({ boleto: row, origem: result?.origem, rows: result?.rows || [] });
    } catch (error) {
      setMessage({ tone: 'error', text: error.message });
    } finally {
      setActionId(null);
    }
  }

  async function sync() {
    await runAction('sync', () => sincronizarFinanceiroDda({}), 'Sincronizacao concluida.');
  }

  async function ignore(row) {
    const motivo = window.prompt('Informe o motivo para ignorar este documento DDA:');
    if (!motivo?.trim()) return;
    await runAction(row.id, () => ignorarFinanceiroDda(row.id, motivo.trim()), 'Documento ignorado com auditoria.');
  }

  const statusCount = (status) => Number(summary?.por_status?.[status]?.quantidade || 0);
  const pages = Math.max(1, Math.ceil(total / filters.limit));

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4 px-3 py-4 sm:px-5">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Financeiro · apresentacao eletronica</div>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">DDA Banco do Brasil</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">Conferencia de boletos apresentados, correspondencia com contas a pagar e trilha de decisao.</p>
        </div>
        {canSync && (
          <button type="button" className="btn btn-primary btn-sm gap-2" onClick={sync} disabled={actionId === 'sync'}>
            <HiOutlineArrowPath className={actionId === 'sync' ? 'animate-spin' : ''} />
            Sincronizar BB
          </button>
        )}
      </header>

      <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <HiOutlineShieldCheck className="mt-0.5 shrink-0 text-lg" />
        <div><strong>Integracao externa bloqueada.</strong> A consulta real sera habilitada quando o adapter DDA estiver configurado com os endpoints e escopos liberados na aplicacao BB existente. Nenhum titulo e criado, vinculado ou pago automaticamente.</div>
      </div>

      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${message.tone === 'error' ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>
          {message.text}
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Documentos" value={summary.total || 0} />
          <Metric label="Valor apresentado" value={currency(summary.valor_total)} />
          <Metric label="Match exato" value={statusCount('MATCH_EXATO')} tone="text-blue-700" />
          <Metric label="Ambiguos" value={statusCount('AMBIGUO')} tone="text-amber-700" />
          <Metric label="Sem titulo" value={statusCount('SEM_TITULO')} tone="text-amber-700" />
          <Metric label="Divergentes" value={statusCount('DIVERGENTE')} tone="text-rose-700" />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_240px_170px_170px_auto]">
          <label className="relative block">
            <span className="sr-only">Pesquisar DDA</span>
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-3 text-slate-500" />
            <input className="input input-bordered h-10 w-full pl-9" value={filters.q} onChange={(event) => setFilters((prior) => ({ ...prior, q: event.target.value, page: 1 }))} placeholder="Beneficiario, CPF/CNPJ, nosso numero ou linha" />
          </label>
          <select className="select select-bordered h-10 min-h-0" value={filters.status} onChange={(event) => setFilters((prior) => ({ ...prior, status: event.target.value, page: 1 }))}>
            {STATUS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <input type="date" className="input input-bordered h-10" value={filters.data_inicio} onChange={(event) => setFilters((prior) => ({ ...prior, data_inicio: event.target.value, page: 1 }))} aria-label="Vencimento inicial" />
          <input type="date" className="input input-bordered h-10" value={filters.data_fim} onChange={(event) => setFilters((prior) => ({ ...prior, data_fim: event.target.value, page: 1 }))} aria-label="Vencimento final" />
          <button type="button" className="btn btn-outline btn-sm h-10" onClick={load}><HiOutlineArrowPath /> Atualizar</button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="font-bold text-slate-900">Documentos apresentados</h2>
            <p className="text-xs text-slate-500">{total} documento(s) no filtro atual</p>
          </div>
          <HiOutlineBanknotes className="text-xl text-blue-700" />
        </div>
        <div className="overflow-x-auto">
          <table className="table table-sm min-w-[1050px]">
            <thead><tr><th>Vencimento</th><th>Beneficiario</th><th>Documento</th><th>Valor</th><th>Empresa</th><th>Status</th><th>Titulo</th><th className="text-right">Acoes</th></tr></thead>
            <tbody>
              {!loading && rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap font-medium">{date(row.data_vencimento)}</td>
                  <td><div className="max-w-[260px] truncate font-semibold text-slate-900">{row.beneficiario_nome || '-'}</div><div className="text-xs text-slate-500">{row.nosso_numero || row.banco_nome || '-'}</div></td>
                  <td className="whitespace-nowrap text-xs">{row.beneficiario_documento || '-'}</td>
                  <td className="whitespace-nowrap font-bold">{currency(row.valor_atual)}</td>
                  <td className="max-w-[180px] truncate">{row.empresa?.nome || row.empresa?.razao_social || '-'}</td>
                  <td><span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-bold ${statusTone(row.status)}`}>{STATUS_LABEL[row.status] || row.status}</span></td>
                  <td>{row.titulo ? <Link className="link link-primary whitespace-nowrap" to={`/financeiro/titulos/${row.titulo.id}`}>{row.titulo.codigo || `#${row.titulo.id}`}</Link> : row.tituloSugerido ? <span className="text-xs text-blue-700">Sugestao: {row.tituloSugerido.codigo || `#${row.tituloSugerido.id}`}</span> : '-'}</td>
                  <td><div className="flex justify-end gap-1">
                    {canLink && row.status === 'MATCH_EXATO' && row.titulo_sugerido_id && <button type="button" title="Confirmar correspondencia exata" className="btn btn-ghost btn-xs" disabled={actionId === row.id} onClick={() => runAction(row.id, () => confirmarFinanceiroDdaSugestao(row.id), 'Documento vinculado ao titulo sugerido.')}><HiOutlineCheck /></button>}
                    {canLink && !['VINCULADO', 'IGNORADO'].includes(row.status) && <button type="button" title="Escolher titulo" className="btn btn-ghost btn-xs" disabled={actionId === row.id} onClick={() => openCandidates(row)}><HiOutlineLink /></button>}
                    {canLink && !['VINCULADO', 'IGNORADO'].includes(row.status) && <button type="button" title="Reprocessar correspondencia" className="btn btn-ghost btn-xs" disabled={actionId === row.id} onClick={() => runAction(row.id, () => reprocessarFinanceiroDdaMatch(row.id), 'Correspondencia reprocessada.')}><HiOutlineArrowPath /></button>}
                    {canIgnore && !['VINCULADO', 'IGNORADO'].includes(row.status) && <button type="button" title="Ignorar com justificativa" className="btn btn-ghost btn-xs text-rose-700" disabled={actionId === row.id} onClick={() => ignore(row)}><HiOutlineNoSymbol /></button>}
                  </div></td>
                </tr>
              ))}
              {!loading && rows.length === 0 && <tr><td colSpan="8"><div className="flex flex-col items-center gap-2 py-12 text-center text-slate-500"><HiOutlineExclamationTriangle className="text-2xl" /><strong className="text-slate-700">Nenhum documento DDA carregado</strong><span className="max-w-xl text-xs">A estrutura esta pronta para receber documentos, mas a sincronizacao bancaria permanece bloqueada ate a homologacao.</span></div></td></tr>}
              {loading && <tr><td colSpan="8" className="py-12 text-center text-slate-500">Carregando documentos...</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
          <span>Pagina {filters.page} de {pages}</span>
          <div className="join"><button type="button" className="btn btn-sm join-item" disabled={filters.page <= 1} onClick={() => setFilters((prior) => ({ ...prior, page: prior.page - 1 }))}>Anterior</button><button type="button" className="btn btn-sm join-item" disabled={filters.page >= pages} onClick={() => setFilters((prior) => ({ ...prior, page: prior.page + 1 }))}>Proxima</button></div>
        </div>
      </section>

      {candidateModal && (
        <div className="modal modal-open" role="dialog" aria-modal="true">
          <div className="modal-box max-w-4xl bg-white">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
              <div><h3 className="text-lg font-bold">Vincular titulo a pagar</h3><p className="text-sm text-slate-500">{candidateModal.boleto.beneficiario_nome} · {currency(candidateModal.boleto.valor_atual)} · origem {candidateModal.origem || '-'}</p></div>
              <button type="button" className="btn btn-ghost btn-sm btn-square" onClick={() => setCandidateModal(null)}><HiOutlineXMark /></button>
            </div>
            <div className="mt-3 max-h-[55vh] overflow-auto rounded-lg border border-slate-200">
              <table className="table table-sm min-w-[720px]"><thead><tr><th>Titulo</th><th>Credor</th><th>Vencimento</th><th>Saldo</th><th>Empresa</th><th /></tr></thead><tbody>
                {candidateModal.rows.map((title) => <tr key={title.id}><td>{title.codigo || `#${title.id}`}</td><td>{title.parceiro?.nome || '-'}</td><td>{date(title.data_vencimento)}</td><td>{currency(title.valor_saldo)}</td><td>{title.empresa?.nome || title.empresa?.razao_social || '-'}</td><td className="text-right"><button type="button" className="btn btn-primary btn-xs" disabled={actionId === candidateModal.boleto.id} onClick={async () => { const ok = await runAction(candidateModal.boleto.id, () => vincularFinanceiroDda(candidateModal.boleto.id, title.id), 'Documento vinculado ao titulo selecionado.'); if (ok) setCandidateModal(null); }}>Usar titulo</button></td></tr>)}
                {candidateModal.rows.length === 0 && <tr><td colSpan="6" className="py-8 text-center text-slate-500">Nenhum titulo elegivel localizado pelos dados do documento.</td></tr>}
              </tbody></table>
            </div>
          </div>
          <button type="button" className="modal-backdrop" aria-label="Fechar" onClick={() => setCandidateModal(null)}>fechar</button>
        </div>
      )}
    </div>
  );
}
