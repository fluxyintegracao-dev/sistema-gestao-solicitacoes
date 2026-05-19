import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFiscalDashboard } from '../services/fiscalApi';

function MetricCard({ label, value, detail }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">{value ?? 0}</p>
      {detail ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{detail}</p> : null}
    </div>
  );
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('pt-BR');
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

function StatusList({ title, items, labelKey }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
      <div className="mt-4 space-y-2">
        {items?.length ? items.map((item) => (
          <div key={item[labelKey]} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950/40">
            <span className="text-slate-600 dark:text-slate-300">{item[labelKey] || '-'}</span>
            <strong className="text-slate-950 dark:text-white">{item.total}</strong>
          </div>
        )) : <p className="text-sm text-slate-500">Sem dados ainda.</p>}
      </div>
    </div>
  );
}

export default function FiscalDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getFiscalDashboard()
      .then((response) => {
        if (mounted) setData(response);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Erro ao carregar painel fiscal');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const resumo = data?.resumo || {};
  const modulo = data?.modulo || {};
  const documentos = data?.documentos || {};
  const sincronizacao = data?.sincronizacao || {};

  return (
    <div className="fiscal-page space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fiscal</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Painel Fiscal</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Fundacao do modulo fiscal preparada para empresas monitoradas, documentos DFe e logs de sincronizacao.
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="btn-primary" to="/fiscal/empresas">Empresas fiscais</Link>
          <Link className="btn-secondary" to="/fiscal/documentos">Documentos</Link>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {loading ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Carregando painel...</div> : null}

      {!loading ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Empresas ativas" value={resumo.empresas_ativas} />
            <MetricCard label="Documentos fiscais" value={resumo.documentos_total} />
            <MetricCard label="Pendentes" value={resumo.documentos_pendentes} />
            <MetricCard label="Divergencias abertas" value={resumo.divergencias_abertas} />
            <MetricCard label="Com divergencia" value={resumo.documentos_com_divergencia} />
            <MetricCard label="Validados" value={resumo.documentos_validados} />
            <MetricCard label="Ignorados" value={resumo.documentos_ignorados} />
            <MetricCard label="Ultimo sync" value={sincronizacao?.ultimo_log?.status || '-'} detail={formatDateTime(sincronizacao?.ultimo_log?.started_at)} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">Estado da fundacao</h2>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div>
                <span className="block text-slate-500">SEFAZ real</span>
                <strong className="text-slate-950 dark:text-white">{modulo.sefaz_enabled ? 'habilitada' : 'desabilitada'}</strong>
              </div>
              <div>
                <span className="block text-slate-500">S3 fiscal</span>
                <strong className="text-slate-950 dark:text-white">{modulo.storage_configured ? 'configurado' : 'pendente'}</strong>
              </div>
              <div>
                <span className="block text-slate-500">Prefixo S3</span>
                <strong className="text-slate-950 dark:text-white">{modulo.storage_prefix || '-'}</strong>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <StatusList title="Documentos por status" items={documentos.por_status || []} labelKey="status" />
            <StatusList title="Documentos por origem" items={documentos.por_origem || []} labelKey="source" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">Documentos recentes</h2>
              <Link className="text-sm font-semibold text-blue-600" to="/fiscal/documentos">Ver todos</Link>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950/40">
                  <tr>
                    <th className="px-4 py-3">Emissao</th>
                    <th className="px-4 py-3">Fornecedor</th>
                    <th className="px-4 py-3">Numero</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {documentos.recentes?.length ? documentos.recentes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(item.emission_date)}</td>
                      <td className="px-4 py-3">
                        <Link className="font-medium text-slate-950 hover:text-blue-600 dark:text-white" to={`/fiscal/documentos/${item.id}`}>
                          {item.issuer_name || item.issuer_cnpj || '-'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.document_number || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatMoney(item.total_value)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.document_status}</td>
                    </tr>
                  )) : (
                    <tr><td className="px-4 py-5 text-slate-500" colSpan={5}>Nenhum documento fiscal encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">Logs recentes</h2>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950/40">
                  <tr>
                    <th className="px-4 py-3">Inicio</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Docs</th>
                    <th className="px-4 py-3">Mensagem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sincronizacao.logs_recentes?.length ? sincronizacao.logs_recentes.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(log.started_at)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{log.request_type}</td>
                      <td className="px-4 py-3 font-medium text-slate-950 dark:text-white">{log.status}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{log.documents_processed || log.documents_found || 0}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{log.response_message || log.error_message || '-'}</td>
                    </tr>
                  )) : (
                    <tr><td className="px-4 py-5 text-slate-500" colSpan={5}>Nenhum log fiscal registrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
