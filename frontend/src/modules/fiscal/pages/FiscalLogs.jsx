import { useEffect, useState } from 'react';
import { TabelaPadrao } from '../../../components/padrao';
import {
  getFiscalCompanies,
  getFiscalDiagnostics,
  getFiscalSyncLogs,
  getFiscalSyncLogRawUrl,
  getFiscalSyncStates,
  runFiscalManualSync,
  runFiscalSyncPreflight
} from '../services/fiscalApi';

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
}

export default function FiscalLogs() {
  const [logs, setLogs] = useState([]);
  const [states, setStates] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [diagnostics, setDiagnostics] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [preflightRunning, setPreflightRunning] = useState(false);
  const [preflight, setPreflight] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [logsResult, statesResult, companiesResult, diagnosticsResult] = await Promise.all([
        getFiscalSyncLogs(),
        getFiscalSyncStates(),
        getFiscalCompanies({ ativo: true }),
        getFiscalDiagnostics()
      ]);
      const nextCompanies = companiesResult?.data || [];
      setLogs(logsResult?.data || []);
      setStates(statesResult?.data || []);
      setCompanies(nextCompanies);
      setDiagnostics(diagnosticsResult);
      setSelectedCompanyId((current) => current || String(nextCompanies.find((company) => company.modulo_fiscal_habilitado)?.id || nextCompanies[0]?.id || ''));
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
      const result = await runFiscalManualSync({
        document_type: 'nfe',
        company_id: selectedCompanyId || undefined
      });
      setMessage(result?.message || 'Tentativa de sincronizacao registrada.');
      await load();
    } catch (err) {
      setError(err.message || 'Erro ao registrar tentativa manual');
    } finally {
      setRunning(false);
    }
  };

  const runPreflight = async () => {
    setPreflightRunning(true);
    setError('');
    setMessage('');
    try {
      const result = await runFiscalSyncPreflight({
        document_type: 'nfe',
        company_id: selectedCompanyId || undefined
      });
      setPreflight(result);
      setMessage(result?.ready
        ? 'Preflight concluido. Ambiente pronto para a proxima etapa controlada.'
        : 'Preflight concluido com pendencias. Revise os checks antes de ativar SEFAZ.');
      await load();
    } catch (err) {
      setError(err.message || 'Erro ao executar preflight fiscal');
    } finally {
      setPreflightRunning(false);
    }
  };

  const openRawPayload = async (log, type) => {
    setError('');
    setMessage('');
    try {
      const result = await getFiscalSyncLogRawUrl(log.id, type);
      if (result?.url) {
        window.open(result.url, '_blank', 'noopener,noreferrer');
        setMessage(`URL assinada do ${type === 'request' ? 'request' : 'response'} gerada por tempo limitado.`);
      }
    } catch (err) {
      setError(err.message || 'Erro ao gerar URL do payload bruto fiscal');
    }
  };

  const checkBadgeClass = (status) => {
    if (status === 'OK') return 'bg-emerald-50 text-emerald-700';
    if (status === 'ERROR') return 'bg-red-50 text-red-700';
    return 'bg-amber-50 text-amber-700';
  };

  const sefazEnabled = Boolean(diagnostics?.sefaz?.enabled);
  const endpointOk = Boolean(diagnostics?.sefaz?.distribution_url_configured && diagnostics?.sefaz?.distribution_url_https);
  const manualActionLabel = sefazEnabled ? 'Sincronizar SEFAZ agora' : 'Registrar tentativa sem consultar';
  const manualActionHelp = sefazEnabled
    ? 'Executa uma chamada real ao Ambiente Nacional da NF-e para a empresa selecionada. O request e o response brutos serao armazenados no S3 fiscal privado.'
    : 'SEFAZ esta desabilitada por FISCAL_SEFAZ_ENABLED=false. O botao apenas registra uma tentativa controlada, sem chamada externa.';

  return (
    <div className="fiscal-page space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fiscal</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Logs de sincronizacao</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Auditoria tecnica das sincronizacoes fiscais. Jobs reais serao ativados em fase posterior.</p>
        </div>
        <div className="flex flex-col gap-2 md:min-w-[360px]">
          <select
            className="input"
            value={selectedCompanyId}
            onChange={(event) => setSelectedCompanyId(event.target.value)}
            disabled={loading || !companies.length || running || preflightRunning}
          >
            <option value="">Todas as empresas monitoradas</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.razao_social || company.nome_fantasia || company.cnpj}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={runPreflight} disabled={preflightRunning || !companies.length}>
              {preflightRunning ? 'Validando...' : 'Executar preflight'}
            </button>
            <button className="btn-primary" type="button" onClick={runManual} disabled={running || !companies.length || (sefazEnabled && !endpointOk)}>
              {running ? 'Executando...' : manualActionLabel}
            </button>
          </div>
          <p className={`text-xs ${sefazEnabled ? 'text-red-700' : 'text-amber-700'}`}>
            {manualActionHelp}
          </p>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">{message}</div> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">SEFAZ real</p>
            <p className={`mt-1 text-sm font-semibold ${sefazEnabled ? 'text-red-700' : 'text-slate-950 dark:text-white'}`}>
              {sefazEnabled ? 'Habilitada' : 'Desabilitada'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Endpoint</p>
            <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
              {endpointOk ? 'Configurado' : 'Pendente'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tipo documental</p>
            <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">nfe</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Escopo</p>
            <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
              {selectedCompanyId ? 'Empresa selecionada' : 'Todas monitoradas'}
            </p>
          </div>
        </div>
      </section>

      {preflight ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">Preflight da sincronizacao</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Validacao administrativa sem consulta real a SEFAZ.
              </p>
            </div>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${preflight.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {preflight.ready ? 'Pronto' : 'Com pendencias'}
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Checks gerais</p>
              <div className="mt-3 space-y-2">
                {(preflight.global_checks || []).map((check) => (
                  <div key={check.code} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950/40">
                    <div>
                      <p className="font-medium text-slate-950 dark:text-white">{check.code}</p>
                      <p className="mt-1 text-slate-500 dark:text-slate-400">{check.message}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${checkBadgeClass(check.status)}`}>{check.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Empresas</p>
              <div className="mt-3 space-y-3">
                {(preflight.companies || []).map((item) => (
                  <div key={item.company.id} className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950/40">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950 dark:text-white">{item.company.razao_social}</p>
                        <p className="text-xs text-slate-500">{item.company.cnpj} - {item.company.uf}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${item.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {item.ready ? 'Pronta' : 'Pendente'}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(item.checks || []).map((check) => (
                        <div key={`${item.company.id}-${check.code}`} className="flex items-start justify-between gap-2 text-xs">
                          <span className="text-slate-500 dark:text-slate-400">{check.message}</span>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${checkBadgeClass(check.status)}`}>{check.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">Estados de sincronizacao</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Controle de NSU por empresa, ambiente e tipo documental.</p>
        </div>
        <TabelaPadrao
          colunas={[
            {
              id: 'empresa',
              titulo: 'Empresa',
              tipo: 'identidade',
              noCard: 'titulo',
              render: (state) => state.company?.razao_social || '-'
            },
            {
              id: 'tipo',
              titulo: 'Tipo',
              tipo: 'texto',
              render: (state) => state.document_type
            },
            {
              id: 'ambiente',
              titulo: 'Ambiente',
              tipo: 'texto',
              render: (state) => state.ambiente_sefaz
            },
            {
              id: 'status',
              titulo: 'Status',
              tipo: 'status',
              render: (state) => state.status
            },
            {
              id: 'ult_nsu',
              titulo: 'Ult. NSU',
              tipo: 'numero',
              render: (state) => state.ult_nsu || '0'
            },
            {
              id: 'max_nsu',
              titulo: 'Max. NSU',
              tipo: 'numero',
              render: (state) => state.max_nsu || '0'
            },
            {
              id: 'ultima_tentativa',
              titulo: 'Ultima tentativa',
              tipo: 'data',
              render: (state) => formatDateTime(state.last_attempt_at)
            },
            {
              id: 'proxima_tentativa',
              titulo: 'Proxima tentativa',
              tipo: 'data',
              render: (state) => formatDateTime(state.next_allowed_sync_at)
            },
            {
              id: 'erro',
              titulo: 'Erro',
              tipo: 'texto',
              render: (state) => (
                <div className="text-xs text-slate-500">
                  {state.last_error_code ? <div className="font-semibold text-slate-700 dark:text-slate-200">{state.last_error_code}</div> : null}
                  <div className="line-clamp-2">{state.last_error_message || '-'}</div>
                </div>
              )
            }
          ]}
          itens={states}
          carregando={loading}
          vazio="Nenhum estado de sincronizacao registrado."
          storageKey="tabela:logs-fiscais:estados-sincronizacao"
          rotuloRolagem="Estados de sincronizacao"
        />      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">Logs recentes</h2>
        </div>
        <TabelaPadrao
          colunas={[
            {
              id: 'inicio',
              titulo: 'Inicio',
              tipo: 'data',
              render: (log) => formatDateTime(log.started_at)
            },
            {
              id: 'empresa',
              titulo: 'Empresa',
              tipo: 'identidade',
              noCard: 'titulo',
              render: (log) => log.company?.razao_social || '-'
            },
            {
              id: 'tipo',
              titulo: 'Tipo',
              tipo: 'texto',
              render: (log) => log.document_type
            },
            {
              id: 'status',
              titulo: 'Status',
              tipo: 'status',
              render: (log) => log.status
            },
            {
              id: 'mensagem',
              titulo: 'Mensagem',
              tipo: 'texto',
              render: (log) => log.response_message || log.error_message || '-'
            }
          ]}
          itens={logs}
          carregando={loading}
          vazio="Nenhum log fiscal registrado."
          storageKey="tabela:logs-fiscais:logs-recentes"
          rotuloRolagem="Logs recentes"
          acoesLinha={(log) => (
            <>
              {log.raw_request_storage_key ? (
                <button className="btn-secondary text-xs" type="button" onClick={() => openRawPayload(log, 'request')}>
                  Request
                </button>
              ) : null}
              {log.raw_response_storage_key ? (
                <button className="btn-secondary text-xs" type="button" onClick={() => openRawPayload(log, 'response')}>
                  Response
                </button>
              ) : null}
              {!log.raw_request_storage_key && !log.raw_response_storage_key ? (
                <span className="text-xs text-slate-500">-</span>
              ) : null}
            </>
          )}
        />      </div>
    </div>
  );
}
