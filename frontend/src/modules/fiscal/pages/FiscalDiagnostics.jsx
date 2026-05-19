import { useEffect, useState } from 'react';
import { getFiscalDiagnostics, runFiscalStorageProbe } from '../services/fiscalApi';

function Field({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-950 dark:text-white">{value ?? '-'}</p>
    </div>
  );
}

function StatusBadge({ active }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      {active ? 'OK' : 'Pendente'}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

export default function FiscalDiagnostics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [probeLoading, setProbeLoading] = useState(false);
  const [probeResult, setProbeResult] = useState(null);
  const [probeError, setProbeError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getFiscalDiagnostics()
      .then((response) => {
        if (mounted) setData(response);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Erro ao carregar diagnostico fiscal');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const modulo = data?.modulo || {};
  const storage = data?.storage || {};
  const crypto = data?.crypto || {};
  const sefaz = data?.sefaz || {};
  const dados = data?.dados || {};
  const ultimoLog = data?.ultimo_log || null;

  const handleStorageProbe = async () => {
    setProbeLoading(true);
    setProbeError('');
    setProbeResult(null);
    try {
      const response = await runFiscalStorageProbe();
      setProbeResult(response);
    } catch (err) {
      setProbeError(err.message || 'Erro ao testar storage fiscal');
    } finally {
      setProbeLoading(false);
    }
  };

  return (
    <div className="fiscal-page space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fiscal</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Diagnostico fiscal</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Verificacao administrativa de configuracoes sensiveis sem expor senha, certificado ou credenciais.
        </p>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {loading ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Carregando diagnostico...</div> : null}

      {!loading && data ? (
        <>
          <Section title="Modulo">
            <Field label="Fiscal habilitado" value={<StatusBadge active={modulo.enabled} />} />
            <Field label="Ambiente Fiscal" value={modulo.env} />
            <Field label="NODE_ENV" value={modulo.node_env} />
          </Section>

          <Section title="Storage S3 fiscal">
            <Field label="Storage configurado" value={<StatusBadge active={storage.configured} />} />
            <Field label="Bucket" value={storage.bucket_masked || (storage.bucket_configured ? 'configurado' : 'pendente')} />
            <Field label="Regiao" value={storage.region || 'pendente'} />
            <Field label="Prefixo" value={storage.prefix} />
            <Field label="URL expira em" value={`${storage.presigned_expires_seconds || 300}s`} />
          </Section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950 dark:text-white">Teste manual de storage</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                  Cria um arquivo pequeno e sem dados fiscais no bucket configurado para validar permissao de escrita do backend.
                </p>
              </div>
              <button
                type="button"
                onClick={handleStorageProbe}
                disabled={probeLoading || !storage.configured}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {probeLoading ? 'Testando...' : 'Testar storage'}
              </button>
            </div>
            {probeError ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{probeError}</div> : null}
            {probeResult ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Resultado" value={<StatusBadge active={probeResult.ok} />} />
                <Field label="Bucket" value={probeResult.bucket_masked || 'configurado'} />
                <Field label="Chave criada" value={probeResult.key} />
                <Field label="Hash" value={probeResult.hash} />
              </div>
            ) : null}
          </section>

          <Section title="Criptografia e SEFAZ">
            <Field label="Crypto configurado" value={<StatusBadge active={crypto.configured} />} />
            <Field label="Crypto producao" value={<StatusBadge active={crypto.min_length_ok_for_production} />} />
            <Field label="SEFAZ habilitada" value={<StatusBadge active={sefaz.enabled} />} />
            <Field label="Ambiente SEFAZ" value={sefaz.ambiente} />
            <Field label="UF SEFAZ" value={sefaz.uf || 'pendente'} />
            <Field label="Max docs/run" value={sefaz.max_docs_per_run} />
            <Field label="Lock TTL" value={`${sefaz.lock_ttl_seconds || 900}s`} />
            <Field label="Bloqueio consumo indevido" value={sefaz.block_on_consumo_indevido ? 'Sim' : 'Nao'} />
          </Section>

          <Section title="Dados fiscais">
            <Field label="Empresas cadastradas" value={dados.empresas_total} />
            <Field label="Empresas monitoradas" value={dados.empresas_monitoradas} />
            <Field label="Certificados" value={dados.certificados_total} />
            <Field label="Certificados ativos" value={dados.certificados_ativos} />
            <Field label="Estados sync" value={dados.sync_states_total} />
            <Field label="Locks ativos" value={dados.sync_states_locked} />
          </Section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">Ultimo log</h2>
            {ultimoLog ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field label="ID" value={ultimoLog.id} />
                <Field label="Inicio" value={ultimoLog.started_at ? new Date(ultimoLog.started_at).toLocaleString('pt-BR') : '-'} />
                <Field label="Status" value={ultimoLog.status} />
                <Field label="Tipo" value={ultimoLog.request_type} />
                <Field label="Codigo" value={ultimoLog.response_code} />
                <Field label="Mensagem" value={ultimoLog.response_message || ultimoLog.error_message || '-'} />
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Nenhum log fiscal registrado.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
