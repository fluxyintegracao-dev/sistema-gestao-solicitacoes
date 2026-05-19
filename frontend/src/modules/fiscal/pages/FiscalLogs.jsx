import { useEffect, useState } from 'react';
import { getFiscalSyncLogs, getFiscalSyncStates, runFiscalManualSync } from '../services/fiscalApi';

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

export default function FiscalLogs() {
  const [logs, setLogs] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [logsResult, statesResult] = await Promise.all([
        getFiscalSyncLogs(),
        getFiscalSyncStates()
      ]);
      setLogs(logsResult?.data || []);
      setStates(statesResult?.data || []);
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
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">Estados de sincronizacao</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Controle de NSU por empresa, ambiente e tipo documental.</p>
        </div>
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950/40">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Ambiente</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ult. NSU</th>
              <th className="px-4 py-3">Max. NSU</th>
              <th className="px-4 py-3">Ultima tentativa</th>
              <th className="px-4 py-3">Proxima tentativa</th>
              <th className="px-4 py-3">Erro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td className="px-4 py-5 text-slate-500" colSpan={9}>Carregando estados...</td></tr>
            ) : states.length ? states.map((state) => (
              <tr key={state.id}>
                <td className="px-4 py-3 font-medium text-slate-950 dark:text-white">{state.company?.razao_social || '-'}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{state.document_type}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{state.ambiente_sefaz}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{state.status}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{state.ult_nsu || '0'}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{state.max_nsu || '0'}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(state.last_attempt_at)}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(state.next_allowed_sync_at)}</td>
                <td className="max-w-[260px] px-4 py-3 text-xs text-slate-500">
                  {state.last_error_code ? <div className="font-semibold text-slate-700 dark:text-slate-200">{state.last_error_code}</div> : null}
                  <div className="line-clamp-2">{state.last_error_message || '-'}</div>
                </td>
              </tr>
            )) : (
              <tr><td className="px-4 py-5 text-slate-500" colSpan={9}>Nenhum estado de sincronizacao registrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">Logs recentes</h2>
        </div>
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
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDateTime(log.started_at)}</td>
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
