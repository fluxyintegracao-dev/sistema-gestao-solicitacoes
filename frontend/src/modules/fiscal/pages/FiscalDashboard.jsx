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

  return (
    <div className="space-y-6">
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
        </>
      ) : null}
    </div>
  );
}
