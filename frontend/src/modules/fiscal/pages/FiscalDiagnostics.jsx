import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getFiscalCompanies,
  getFiscalDiagnostics,
  runFiscalFixtureSync,
  runFiscalSyncPreflight,
  runFiscalStorageProbe
} from '../services/fiscalApi';

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

function CheckStatusBadge({ status }) {
  const normalized = String(status || 'WARN').toUpperCase();
  const classes = normalized === 'OK'
    ? 'bg-emerald-50 text-emerald-700'
    : normalized === 'ERROR'
      ? 'bg-red-50 text-red-700'
      : 'bg-amber-50 text-amber-700';
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>
      {normalized}
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
  const [fixtureLoading, setFixtureLoading] = useState(false);
  const [fixtureResult, setFixtureResult] = useState(null);
  const [fixtureError, setFixtureError] = useState('');
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [preflightResult, setPreflightResult] = useState(null);
  const [preflightError, setPreflightError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [fixtureCompanyId, setFixtureCompanyId] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      getFiscalDiagnostics(),
      getFiscalCompanies({ ativo: true })
    ])
      .then(([diagnosticsResponse, companiesResponse]) => {
        if (!mounted) return;
        const nextCompanies = companiesResponse?.data || [];
        setData(diagnosticsResponse);
        setCompanies(nextCompanies);
        setFixtureCompanyId((current) => current || String(nextCompanies.find((company) => company.modulo_fiscal_habilitado)?.id || nextCompanies[0]?.id || ''));
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

  const handleFixtureSync = async () => {
    setFixtureLoading(true);
    setFixtureError('');
    setFixtureResult(null);
    try {
      const response = await runFiscalFixtureSync({
        document_type: 'nfe',
        company_id: fixtureCompanyId || undefined
      });
      setFixtureResult(response);
      const refreshedDiagnostics = await getFiscalDiagnostics();
      setData(refreshedDiagnostics);
    } catch (err) {
      setFixtureError(err.message || 'Erro ao processar fixture fiscal');
    } finally {
      setFixtureLoading(false);
    }
  };

  const handlePreflight = async () => {
    setPreflightLoading(true);
    setPreflightError('');
    setPreflightResult(null);
    try {
      const response = await runFiscalSyncPreflight({
        document_type: 'nfe',
        company_id: fixtureCompanyId || undefined
      });
      setPreflightResult(response);
    } catch (err) {
      setPreflightError(err.message || 'Erro ao executar preflight fiscal');
    } finally {
      setPreflightLoading(false);
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

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950 dark:text-white">Ensaio local de DFe</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                  Processa uma fixture local de retorno SEFAZ para validar parser, S3 fiscal, logs e Caixa de Entrada sem consulta externa.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:min-w-[280px]">
                <select
                  className="input"
                  value={fixtureCompanyId}
                  onChange={(event) => setFixtureCompanyId(event.target.value)}
                  disabled={fixtureLoading || !companies.length}
                >
                  <option value="">Selecione a empresa fiscal</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.razao_social || company.nome_fantasia || company.cnpj}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleFixtureSync}
                  disabled={fixtureLoading || !storage.configured || !fixtureCompanyId}
                  className="btn-primary"
                >
                  {fixtureLoading ? 'Processando...' : 'Processar fixture DFe'}
                </button>
                {!dados.empresas_monitoradas ? (
                  <p className="text-xs text-amber-700">
                    A empresa selecionada precisa estar ativa e com o modulo fiscal habilitado. Se nao estiver, o backend retornara a orientacao.
                  </p>
                ) : null}
              </div>
            </div>
            {fixtureError ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{fixtureError}</div> : null}
            {fixtureResult ? (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Resultado" value={fixtureResult.status} />
                  <Field label="Log" value={fixtureResult.log_id} />
                  <Field label="Empresa" value={fixtureResult.company_id} />
                  <Field label="Documentos" value={fixtureResult.processed?.documents_processed ?? 0} />
                </div>
                {fixtureResult.processed?.items?.length ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/40">
                    <p className="font-semibold text-slate-950 dark:text-white">Documentos processados</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {fixtureResult.processed.items.map((item) => (
                        <Link
                          key={item.document_id}
                          className="btn-secondary btn-sm"
                          to={`/fiscal/documentos/${item.document_id}`}
                        >
                          NF {item.document_id}
                        </Link>
                      ))}
                      <Link className="btn-outline btn-sm" to="/fiscal/documentos">Ver caixa de entrada</Link>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <Section title="Criptografia e SEFAZ">
            <Field label="Crypto configurado" value={<StatusBadge active={crypto.configured} />} />
            <Field label="Crypto producao" value={<StatusBadge active={crypto.min_length_ok_for_production} />} />
            <Field label="SEFAZ habilitada" value={<StatusBadge active={sefaz.enabled} />} />
            <Field label="Ambiente SEFAZ" value={sefaz.ambiente} />
            <Field label="UF SEFAZ" value={sefaz.uf || 'pendente'} />
            <Field label="Endpoint distribuição" value={<StatusBadge active={sefaz.distribution_url_configured && sefaz.distribution_url_https} />} />
            <Field label="Endpoint" value={sefaz.distribution_url_masked || 'pendente'} />
            <Field label="Endpoint sugerido" value={sefaz.suggested_distribution_url || 'pendente'} />
            <Field label="Timeout SEFAZ" value={`${sefaz.request_timeout_ms || 30000}ms`} />
            <Field label="Max docs/run" value={sefaz.max_docs_per_run} />
            <Field label="Lock TTL" value={`${sefaz.lock_ttl_seconds || 900}s`} />
            <Field label="Espera sem DFe" value={`${sefaz.empty_result_wait_minutes || 60}min`} />
            <Field label="Espera consumo indevido" value={`${sefaz.consumo_indevido_wait_minutes || 60}min`} />
            <Field label="Bloqueio consumo indevido" value={sefaz.block_on_consumo_indevido ? 'Sim' : 'Nao'} />
          </Section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950 dark:text-white">Preflight SEFAZ</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                  Valida empresa, certificado, storage, endpoint e SOAP local antes de qualquer chamada real.
                </p>
              </div>
              <button
                type="button"
                onClick={handlePreflight}
                disabled={preflightLoading || !fixtureCompanyId}
                className="btn-primary"
              >
                {preflightLoading ? 'Validando...' : 'Executar preflight'}
              </button>
            </div>
            {preflightError ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{preflightError}</div> : null}
            {preflightResult ? (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Resultado" value={<StatusBadge active={preflightResult.ready} />} />
                  <Field label="SEFAZ real" value={preflightResult.sefaz_enabled ? 'Habilitada' : 'Desabilitada'} />
                  <Field label="Tipo" value={preflightResult.document_type} />
                  <Field label="Empresas" value={preflightResult.companies?.length || 0} />
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="font-semibold text-slate-950 dark:text-white">Checks globais</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {(preflightResult.global_checks || []).map((check) => (
                      <div key={check.code} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-900 dark:text-white">{check.code}</span>
                          <CheckStatusBadge status={check.status} />
                        </div>
                        <p className="mt-1 text-slate-600 dark:text-slate-300">{check.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {(preflightResult.companies || []).map((item) => (
                  <div key={item.company.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-950 dark:text-white">{item.company.razao_social}</p>
                      <CheckStatusBadge status={item.ready ? 'OK' : 'WARN'} />
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {(item.checks || []).map((check) => (
                        <div key={check.code} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium text-slate-900 dark:text-white">{check.code}</span>
                            <CheckStatusBadge status={check.status} />
                          </div>
                          <p className="mt-1 text-slate-600 dark:text-slate-300">{check.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

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
