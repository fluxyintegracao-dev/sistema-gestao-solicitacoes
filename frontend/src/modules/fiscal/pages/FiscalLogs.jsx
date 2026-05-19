import { useEffect, useState } from 'react';
import { getFiscalSyncLogs, runFiscalManualSync } from '../services/fiscalApi';

export default function FiscalLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getFiscalSyncLogs();
      setLogs(result?.data || []);
    } catch (err) {
      setError(err.message || 'Erro ao buscar logs fiscais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    load().finally(() => {
      if (!mounted) return;
    });
    return () => {
      mounted = false;
    };
  }, []);

  const runManual = async () => {
    setRunning(true);
    setError('');
    setMessage('');
    try {
      const result = await runFiscalManualSync({ document_type: 'nfe' });
      setMessage(result?.message || 'Tentativa de sincronizacao registrada.');
      await load();
    } catch (err) {
      setError(err.message || 'Erro ao registrar tentativa manual');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fiscal</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Logs de sincronizacao</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Auditoria tecnica das sincronizacoes fiscais. Jobs reais serao ativados em fase posterior.</p>
        </div>
        <button className="btn-primary" type="button" onClick={runManual} disabled={running}>
          {running ? 'Registrando...' : 'Registrar tentativa manual'}
        </button>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">{message}</div> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950/40">
            <tr>
              <th className="px-4 py-3">Inicio</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Mensagem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td className="px-4 py-5 text-slate-500" colSpan={5}>Carregando logs...</td></tr>
            ) : logs.length ? logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{log.started_at ? new Date(log.started_at).toLocaleString('pt-BR') : '-'}</td>
                <td className="px-4 py-3 font-medium text-slate-950 dark:text-white">{log.company?.razao_social || '-'}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{log.document_type}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{log.status}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{log.response_message || log.error_message || '-'}</td>
              </tr>
            )) : (
              <tr><td className="px-4 py-5 text-slate-500" colSpan={5}>Nenhum log fiscal registrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
