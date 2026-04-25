import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  canManageIntegracaoSiengeConfig,
  canRetryIntegracaoSienge,
  hasEnabledModule
} from '../utils/acessoProduto';
import {
  buscarIntegracaoSiengeCredorParceiro,
  cadastrarIntegracaoSiengeCredorParceiro,
  criarIntegracaoSiengeFila,
  getIntegracaoSiengeCredorParceiroContexto,
  getIntegracaoSiengeConfig,
  getIntegracaoSiengeFila,
  getIntegracaoSiengeLogs,
  getIntegracaoSiengeSaude,
  reprocessarIntegracaoSiengeFila,
  salvarIntegracaoSiengeConfig,
  salvarIntegracaoSiengeCredorParceiroMapeamento
} from '../services/integracaoSienge';
import { buscarParceiros } from '../services/parceiros';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

function queueStatusClass(status) {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'SUCESSO') return 'app-status-pill bg-emerald-100 text-emerald-700';
  if (normalized === 'ERRO') return 'app-status-pill bg-rose-100 text-rose-700';
  if (normalized === 'PROCESSANDO') return 'app-status-pill bg-amber-100 text-amber-700';
  return 'app-status-pill bg-slate-100 text-slate-700';
}

function StatusCard({ titulo, valor, descricao }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{titulo}</p>
      <strong className="mt-2 block text-2xl font-semibold text-slate-900">{valor}</strong>
      {descricao ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">{descricao}</p>
      ) : null}
    </div>
  );
}

function buildInitialConfig(config) {
  return {
    ativo: Boolean(config?.ativo),
    base_url_override: config?.base_url_override || '',
    endpoint_titulos: config?.endpoint_titulos || '',
    documento_padrao_id: config?.documento_padrao_id || '',
    indexador_padrao_id: config?.indexador_padrao_id || '',
    auto_vincular_credor_busca_exata: Boolean(config?.auto_vincular_credor_busca_exata),
    auto_cadastrar_credor_quando_ausente: Boolean(config?.auto_cadastrar_credor_quando_ausente),
    timeout_ms: config?.timeout_ms || 20000,
    max_tentativas: config?.max_tentativas || 3,
    payload_defaults: config?.payload_defaults_json ? JSON.stringify(config.payload_defaults_json, null, 2) : '',
    observacoes: config?.observacoes || ''
  };
}

export default function IntegracaoSiengeInicio() {
  const { user } = useAuth();
  const canEditConfig = canManageIntegracaoSiengeConfig(user);
  const canOperateQueue = canRetryIntegracaoSienge(user);
  const financeiroHabilitado = hasEnabledModule(user, 'FINANCEIRO', { allowSuperadminBypass: false });
  const rhDpHabilitado = hasEnabledModule(user, 'RH_DP', { allowSuperadminBypass: false });
  const comercialHabilitado = hasEnabledModule(user, 'COMERCIAL', { allowSuperadminBypass: false });
  const comprasHabilitado = hasEnabledModule(user, 'COMPRAS', { allowSuperadminBypass: false });
  const origemModuloOptions = useMemo(() => ([
    financeiroHabilitado ? { value: 'FINANCEIRO', label: 'Financeiro' } : null,
    rhDpHabilitado ? { value: 'RH_DP', label: 'RH/DP' } : null,
    comercialHabilitado ? { value: 'COMERCIAL', label: 'Comercial' } : null,
    { value: 'SOLICITACOES', label: 'Solicitacoes' },
    comprasHabilitado ? { value: 'COMPRAS', label: 'Compras' } : null,
    { value: 'OUTROS', label: 'Outros' }
  ].filter(Boolean)), [comprasHabilitado, comercialHabilitado, financeiroHabilitado, rhDpHabilitado]);
  const origemModuloValues = useMemo(
    () => new Set(origemModuloOptions.map((item) => item.value)),
    [origemModuloOptions]
  );
  const [configForm, setConfigForm] = useState(buildInitialConfig(null));
  const [saude, setSaude] = useState(null);
  const [fila, setFila] = useState({ items: [], resumo: {} });
  const [logs, setLogs] = useState({ items: [] });
  const [carregando, setCarregando] = useState(false);
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [processandoFilaId, setProcessandoFilaId] = useState(null);
  const [termoParceiro, setTermoParceiro] = useState('');
  const [parceirosEncontrados, setParceirosEncontrados] = useState([]);
  const [carregandoParceiros, setCarregandoParceiros] = useState(false);
  const [parceiroSelecionado, setParceiroSelecionado] = useState(null);
  const [contextoCredor, setContextoCredor] = useState(null);
  const [carregandoContextoCredor, setCarregandoContextoCredor] = useState(false);
  const [credorManualId, setCredorManualId] = useState('');
  const [buscandoCredorSienge, setBuscandoCredorSienge] = useState(false);
  const [cadastrandoCredorSienge, setCadastrandoCredorSienge] = useState(false);
  const [resultadoBuscaCredor, setResultadoBuscaCredor] = useState(null);
  const [salvandoMapeamentoCredor, setSalvandoMapeamentoCredor] = useState(false);
  const [filtrosFila, setFiltrosFila] = useState({
    status: '',
    origem_modulo: '',
    titulo_financeiro_id: ''
  });
  const [enqueueForm, setEnqueueForm] = useState({
    titulo_financeiro_id: '',
    origem_modulo: '',
    processar_agora: false,
    forcar_recriar_payload: false
  });

  useEffect(() => {
    carregarTudo();
  }, []);

  useEffect(() => {
    setFiltrosFila((current) => {
      if (!current.origem_modulo || origemModuloValues.has(current.origem_modulo)) {
        return current;
      }
      return { ...current, origem_modulo: '' };
    });
    setEnqueueForm((current) => {
      if (!current.origem_modulo || origemModuloValues.has(current.origem_modulo)) {
        return current;
      }
      return { ...current, origem_modulo: '' };
    });
  }, [origemModuloValues]);

  async function carregarTudo(nextFilters = filtrosFila) {
    try {
      setCarregando(true);
      const [configData, saudeData, filaData, logsData] = await Promise.all([
        getIntegracaoSiengeConfig(),
        getIntegracaoSiengeSaude(),
        getIntegracaoSiengeFila({
          status: nextFilters.status || undefined,
          origem_modulo: nextFilters.origem_modulo || undefined,
          titulo_financeiro_id: nextFilters.titulo_financeiro_id || undefined
        }),
        getIntegracaoSiengeLogs()
      ]);

      setConfigForm(buildInitialConfig(configData));
      setSaude(saudeData);
      setFila(filaData || { items: [], resumo: {} });
      setLogs(logsData || { items: [] });
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar a Integracao SIENGE');
    } finally {
      setCarregando(false);
    }
  }

  async function carregarContextoCredor(parceiro) {
    if (!parceiro?.id) return;

    try {
      setCarregandoContextoCredor(true);
      const data = await getIntegracaoSiengeCredorParceiroContexto(parceiro.id);
      setParceiroSelecionado(parceiro);
      setContextoCredor(data);
      setCredorManualId(data?.credor_sienge?.external_creditor_id || '');
      setResultadoBuscaCredor(null);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar o contexto do credor SIENGE');
    } finally {
      setCarregandoContextoCredor(false);
    }
  }

  async function pesquisarParceirosInternos(event) {
    event?.preventDefault?.();

    try {
      setCarregandoParceiros(true);
      const data = await buscarParceiros({
        q: termoParceiro,
        limit: 12,
        ativo: 1
      });
      setParceirosEncontrados(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao buscar parceiros internos');
    } finally {
      setCarregandoParceiros(false);
    }
  }

  async function executarBuscaCredor(vincularAutomaticamente = false) {
    if (!parceiroSelecionado?.id) return;

    try {
      setBuscandoCredorSienge(true);
      const data = await buscarIntegracaoSiengeCredorParceiro(parceiroSelecionado.id, {
        vincular_automaticamente: vincularAutomaticamente,
        limit: 100,
        max_paginas: 3
      });
      setResultadoBuscaCredor(data);
      if (data?.contexto_atualizado) {
        setContextoCredor(data.contexto_atualizado);
        setCredorManualId(data.contexto_atualizado?.credor_sienge?.external_creditor_id || '');
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao buscar credor no SIENGE');
    } finally {
      setBuscandoCredorSienge(false);
    }
  }

  async function salvarMapeamentoManualCredor() {
    if (!parceiroSelecionado?.id) return;

    try {
      setSalvandoMapeamentoCredor(true);
      const data = await salvarIntegracaoSiengeCredorParceiroMapeamento(parceiroSelecionado.id, {
        external_creditor_id: credorManualId,
        ativo: true,
        metadata: {
          origem: 'VINCULACAO_MANUAL_TELA'
        }
      });
      setContextoCredor(data);
      setCredorManualId(data?.credor_sienge?.external_creditor_id || '');
      alert('Mapeamento do credor SIENGE salvo para o parceiro.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar o mapeamento do credor SIENGE');
    } finally {
      setSalvandoMapeamentoCredor(false);
    }
  }

  async function cadastrarCredorNoSienge() {
    if (!parceiroSelecionado?.id || !canEditConfig) return;

    try {
      setCadastrandoCredorSienge(true);
      const data = await cadastrarIntegracaoSiengeCredorParceiro(parceiroSelecionado.id, {
        buscar_antes_de_cadastrar: true,
        vincular_se_match_exato: true
      });

      if (data?.contexto_atualizado) {
        setContextoCredor(data.contexto_atualizado);
        setCredorManualId(data.contexto_atualizado?.credor_sienge?.external_creditor_id || '');
      } else {
        await carregarContextoCredor(parceiroSelecionado);
      }

      const acao = data?.acao || 'CONCLUIDO';
      if (acao === 'VINCULO_EXISTENTE') {
        alert('Credor existente encontrado no SIENGE e vinculado ao parceiro.');
      } else if (acao === 'JA_VINCULADO') {
        alert('Este parceiro ja possui `creditorId` vinculado no FLUXY.');
      } else {
        alert('Credor cadastrado no SIENGE e vinculado ao parceiro.');
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao cadastrar credor no SIENGE');
    } finally {
      setCadastrandoCredorSienge(false);
    }
  }

  async function salvarConfig(event) {
    event.preventDefault();
    if (!canEditConfig) {
      return;
    }

    try {
      setSalvandoConfig(true);
      const payload = {
        ativo: Boolean(configForm.ativo),
        base_url_override: configForm.base_url_override || '',
        endpoint_titulos: configForm.endpoint_titulos || '',
        documento_padrao_id: configForm.documento_padrao_id ? Number(configForm.documento_padrao_id) : null,
        indexador_padrao_id: configForm.indexador_padrao_id ? Number(configForm.indexador_padrao_id) : null,
        auto_vincular_credor_busca_exata: Boolean(configForm.auto_vincular_credor_busca_exata),
        auto_cadastrar_credor_quando_ausente: Boolean(configForm.auto_cadastrar_credor_quando_ausente),
        timeout_ms: Number(configForm.timeout_ms || 20000),
        max_tentativas: Number(configForm.max_tentativas || 3),
        payload_defaults: configForm.payload_defaults ? JSON.parse(configForm.payload_defaults) : null,
        observacoes: configForm.observacoes || ''
      };

      await salvarIntegracaoSiengeConfig(payload);
      await carregarTudo();
      alert('Configuracao da Integracao SIENGE salva.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar configuracao da Integracao SIENGE');
    } finally {
      setSalvandoConfig(false);
    }
  }

  async function prepararFila(event) {
    event.preventDefault();

    try {
      await criarIntegracaoSiengeFila({
        titulo_financeiro_id: Number(enqueueForm.titulo_financeiro_id),
        origem_modulo: enqueueForm.origem_modulo || undefined,
        processar_agora: Boolean(enqueueForm.processar_agora),
        forcar_recriar_payload: Boolean(enqueueForm.forcar_recriar_payload)
      });
      setEnqueueForm({
        titulo_financeiro_id: '',
        origem_modulo: '',
        processar_agora: false,
        forcar_recriar_payload: false
      });
      await carregarTudo();
      alert('Titulo preparado na fila da Integracao SIENGE.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao preparar item da fila SIENGE');
    }
  }

  async function reprocessar(item) {
    try {
      setProcessandoFilaId(item.id);
      await reprocessarIntegracaoSiengeFila(item.id, {
        forcar_recriar_payload: true
      });
      await carregarTudo();
      alert('Item da fila SIENGE reprocessado.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao reprocessar item da fila SIENGE');
    } finally {
      setProcessandoFilaId(null);
    }
  }

  async function aplicarFiltrosFila() {
    await carregarTudo(filtrosFila);
  }

  const resumoFila = useMemo(() => {
    return {
      total: Number(fila?.resumo?.total || 0),
      pendentes: Number(fila?.resumo?.pendentes || 0),
      sucesso: Number(fila?.resumo?.sucesso || 0),
      erro: Number(fila?.resumo?.erro || 0)
    };
  }, [fila]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-sky-100 bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.45),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(186,230,253,0.45),_transparent_24%),linear-gradient(135deg,_rgba(255,255,255,0.94),_rgba(239,246,255,0.9))] px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-4xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Gateway tecnico</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Integracao SIENGE</h1>
            <p className="text-sm leading-6 text-slate-600">
              Esta fase abre a fundacao do gateway tecnico: configuracao local da instalacao, avaliacao de prontidao,
              fila persistida por titulo financeiro central, logs e reprocessamento.
            </p>
          </div>
          <div className="app-page-actions">
            {financeiroHabilitado && (
              <Link to="/financeiro/titulos" className="btn btn-outline">
                Titulos financeiros
              </Link>
            )}
            {rhDpHabilitado && financeiroHabilitado && (
              <Link to="/rh-dp/fechamentos" className="btn btn-outline">
                Fechamentos RH/DP
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatusCard titulo="Fila total" valor={resumoFila.total} />
        <StatusCard titulo="Pendentes" valor={resumoFila.pendentes} />
        <StatusCard titulo="Sucesso" valor={resumoFila.sucesso} />
        <StatusCard titulo="Erro" valor={resumoFila.erro} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="sol-surface-card rounded-xl p-4 md:p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Configuracao da instalacao</h2>
            <p className="text-sm text-slate-500">
              Os segredos e defaults tecnicos podem ficar no `backend/.env`. Aqui ficam overrides locais, defaults funcionais e comportamento da fila.
            </p>
          </div>

          <form className="space-y-4" onSubmit={salvarConfig}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="sol-filter-field">
                <span className="sol-filter-label">Gateway ativo</span>
                <select
                  className="input w-full"
                  value={configForm.ativo ? '1' : '0'}
                  onChange={(event) => setConfigForm((current) => ({ ...current, ativo: event.target.value === '1' }))}
                  disabled={!canEditConfig}
                >
                  <option value="0">Nao</option>
                  <option value="1">Sim</option>
                </select>
              </label>

              <label className="sol-filter-field">
                <span className="sol-filter-label">Endpoint de titulos</span>
                <input
                  className="input w-full"
                  value={configForm.endpoint_titulos}
                  onChange={(event) => setConfigForm((current) => ({ ...current, endpoint_titulos: event.target.value }))}
                  placeholder="accounts-payable/bills"
                  disabled={!canEditConfig}
                />
              </label>

              <label className="sol-filter-field">
                <span className="sol-filter-label">Base URL override</span>
                <input
                  className="input w-full"
                  value={configForm.base_url_override}
                  onChange={(event) => setConfigForm((current) => ({ ...current, base_url_override: event.target.value }))}
                  placeholder="https://api.sienge.com.br/constsulcapixaba/public/api/v1"
                  disabled={!canEditConfig}
                />
              </label>

              <label className="sol-filter-field">
                <span className="sol-filter-label">Timeout (ms)</span>
                <input
                  type="number"
                  className="input w-full"
                  value={configForm.timeout_ms}
                  onChange={(event) => setConfigForm((current) => ({ ...current, timeout_ms: event.target.value }))}
                  disabled={!canEditConfig}
                />
              </label>

              <label className="sol-filter-field">
                <span className="sol-filter-label">Documento padrao</span>
                <input
                  type="number"
                  className="input w-full"
                  value={configForm.documento_padrao_id}
                  onChange={(event) => setConfigForm((current) => ({ ...current, documento_padrao_id: event.target.value }))}
                  disabled={!canEditConfig}
                />
              </label>

              <label className="sol-filter-field">
                <span className="sol-filter-label">Indexador padrao</span>
                <input
                  type="number"
                  className="input w-full"
                  value={configForm.indexador_padrao_id}
                  onChange={(event) => setConfigForm((current) => ({ ...current, indexador_padrao_id: event.target.value }))}
                  disabled={!canEditConfig}
                />
              </label>

              <label className="sol-filter-field">
                <span className="sol-filter-label">Max. tentativas</span>
                <input
                  type="number"
                  className="input w-full"
                  value={configForm.max_tentativas}
                  onChange={(event) => setConfigForm((current) => ({ ...current, max_tentativas: event.target.value }))}
                  disabled={!canEditConfig}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="sol-filter-field">
                <span className="sol-filter-label">Auto vincular credor por busca exata</span>
                <select
                  className="input w-full"
                  value={configForm.auto_vincular_credor_busca_exata ? '1' : '0'}
                  onChange={(event) => setConfigForm((current) => ({
                    ...current,
                    auto_vincular_credor_busca_exata: event.target.value === '1'
                  }))}
                  disabled={!canEditConfig}
                >
                  <option value="0">Nao</option>
                  <option value="1">Sim</option>
                </select>
              </label>

              <label className="sol-filter-field">
                <span className="sol-filter-label">Auto cadastrar credor quando ausente</span>
                <select
                  className="input w-full"
                  value={configForm.auto_cadastrar_credor_quando_ausente ? '1' : '0'}
                  onChange={(event) => setConfigForm((current) => ({
                    ...current,
                    auto_cadastrar_credor_quando_ausente: event.target.value === '1'
                  }))}
                  disabled={!canEditConfig}
                >
                  <option value="0">Nao</option>
                  <option value="1">Sim</option>
                </select>
                <span className="mt-1 text-xs text-slate-500">
                  Quando habilitado, o gateway pode tentar `POST /creditors` antes de enviar o titulo, usando o template ou defaults configurados em `payload_defaults`.
                </span>
              </label>
            </div>

            <label className="sol-filter-field">
              <span className="sol-filter-label">Payload defaults (JSON)</span>
              <textarea
                className="input min-h-[140px] w-full"
                value={configForm.payload_defaults}
                onChange={(event) => setConfigForm((current) => ({ ...current, payload_defaults: event.target.value }))}
                placeholder='{"empresaId": 1}'
                disabled={!canEditConfig}
              />
            </label>

            <label className="sol-filter-field">
              <span className="sol-filter-label">Observacoes</span>
              <textarea
                className="input min-h-[96px] w-full"
                value={configForm.observacoes}
                onChange={(event) => setConfigForm((current) => ({ ...current, observacoes: event.target.value }))}
                disabled={!canEditConfig}
              />
            </label>

            <div className="app-page-actions">
              <button type="submit" className="btn btn-primary" disabled={!canEditConfig || salvandoConfig}>
                {salvandoConfig ? 'Salvando...' : 'Salvar configuracao'}
              </button>
              {!canEditConfig ? (
                <span className="text-xs text-slate-500">
                  Somente usuarios com capacidade de configuracao podem alterar a configuracao da instalacao.
                </span>
              ) : null}
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Recomendado: usar `SIENGE_API_HOST` + `SIENGE_API_SUBDOMAIN` + `SIENGE_API_BASE_PATH` e `SIENGE_ENDPOINT_TITULOS`
              no `backend/.env`. Use `base_url_override` e `endpoint_titulos` aqui apenas quando esta instalacao precisar fugir do padrao.
            </p>
            <p className="text-xs leading-5 text-slate-500">
              A automacao de credor e opcional por instalacao. O padrao do sistema permanece conservador: sem vinculo automatico
              e sem cadastro automatico enquanto a administracao nao habilitar explicitamente esse comportamento.
            </p>
            <p className="text-xs leading-5 text-slate-500">
              Para `POST /creditors`, use `payload_defaults` com `siengeCredorTemplate` ou `siengeCredorDefaults`. O campo
              `municipalityId` precisa estar presente no payload final antes do cadastro automatico.
            </p>
          </form>
        </div>

        <div className="sol-surface-card rounded-xl p-4 md:p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Prontidao tecnica</h2>
            <p className="text-sm text-slate-500">
              Esta leitura mostra se a instalacao tem o minimo necessario para tentar envio real.
            </p>
          </div>

          {carregando && !saude ? (
            <p className="text-sm text-slate-500">Carregando prontidao...</p>
          ) : (
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <span>Gateway ativo</span>
                <span className={queueStatusClass(saude?.ativo ? 'SUCESSO' : 'ERRO')}>
                  {saude?.ativo ? 'SIM' : 'NAO'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <span>Pronto para envio</span>
                <span className={queueStatusClass(saude?.pronto_para_envio ? 'SUCESSO' : 'ERRO')}>
                  {saude?.pronto_para_envio ? 'SIM' : 'NAO'}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="font-medium text-slate-700">Base URL efetiva</p>
                <p className="mt-1 break-all text-slate-500">{saude?.base_url_efetiva || '-'}</p>
                <p className="mt-1 text-xs text-slate-400">Origem: {saude?.base_url_origem || 'AUSENTE'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="font-medium text-slate-700">Endpoint efetivo</p>
                <p className="mt-1 break-all text-slate-500">{saude?.endpoint_titulos_efetivo || '-'}</p>
                <p className="mt-1 text-xs text-slate-400">Origem: {saude?.endpoint_titulos_origem || 'AUSENTE'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="font-medium text-slate-700">Catalogo de credores</p>
                <div className="mt-2 space-y-2 text-xs text-slate-500">
                  <div>
                    <strong className="text-slate-700">Lista/inclusao:</strong>{' '}
                    <span className="break-all">{saude?.endpoints_credor?.templates?.endpoint_credores || '-'}</span>
                  </div>
                  <div>
                    <strong className="text-slate-700">Detalhe:</strong>{' '}
                    <span className="break-all">{saude?.endpoints_credor?.templates?.endpoint_credor_detalhe || '-'}</span>
                  </div>
                  <div>
                    <strong className="text-slate-700">Dados bancarios:</strong>{' '}
                    <span className="break-all">{saude?.endpoints_credor?.templates?.endpoint_credor_bank_informations || '-'}</span>
                  </div>
                  <div>
                    <strong className="text-slate-700">PIX:</strong>{' '}
                    <span className="break-all">{saude?.endpoints_credor?.templates?.endpoint_credor_pix_informations || '-'}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="font-medium text-slate-700">Autenticacao</p>
                <p className="mt-1 text-slate-500">{saude?.auth_mode || 'NONE'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="font-medium text-slate-700">Politica de automacao de credor</p>
                <div className="mt-2 space-y-2 text-xs text-slate-500">
                  <div>
                    <strong className="text-slate-700">Auto vincular por busca exata:</strong>{' '}
                    {saude?.automacoes_credor?.auto_vincular_credor_busca_exata ? 'SIM' : 'NAO'}
                  </div>
                  <div>
                    <strong className="text-slate-700">Auto cadastrar quando ausente:</strong>{' '}
                    {saude?.automacoes_credor?.auto_cadastrar_credor_quando_ausente ? 'SIM' : 'NAO'}
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="font-medium text-slate-700">Pendencias</p>
                {Array.isArray(saude?.pendencias_prontidao) && saude.pendencias_prontidao.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-rose-600">
                    {saude.pendencias_prontidao.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-slate-500">Nenhuma pendencia estrutural.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="sol-surface-card rounded-xl p-4 md:p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Parceiro interno</h2>
            <p className="text-sm text-slate-500">
              Busque o parceiro interno para avaliar prontidao, consultar credor no SIENGE e vincular o `creditorId` externo.
            </p>
          </div>

          <form className="space-y-4" onSubmit={pesquisarParceirosInternos}>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Nome ou CPF/CNPJ</span>
              <input
                className="input w-full"
                value={termoParceiro}
                onChange={(event) => setTermoParceiro(event.target.value)}
                placeholder="Ex.: Construtora XPTO ou 12345678901"
              />
            </label>

            <div className="app-page-actions">
              <button type="submit" className="btn btn-primary" disabled={carregandoParceiros}>
                {carregandoParceiros ? 'Buscando...' : 'Buscar parceiros'}
              </button>
            </div>
          </form>

          <div className="mt-4 space-y-2">
            {!parceirosEncontrados.length ? (
              <p className="text-sm text-slate-500">Nenhum parceiro carregado ainda.</p>
            ) : (
              parceirosEncontrados.map((parceiro) => (
                <button
                  key={parceiro.id}
                  type="button"
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    parceiroSelecionado?.id === parceiro.id
                      ? 'border-sky-300 bg-sky-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                  onClick={() => carregarContextoCredor(parceiro)}
                >
                  <div className="font-medium text-slate-900">{parceiro.nome}</div>
                  <div className="text-xs text-slate-500">{parceiro.cpf_cnpj || '-'}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="sol-surface-card rounded-xl p-4 md:p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Contexto de credor SIENGE</h2>
            <p className="text-sm text-slate-500">
              Esta area mostra o mapeamento atual, o rascunho interno e a busca operacional de credor no SIENGE.
            </p>
          </div>

          {carregandoContextoCredor ? (
            <p className="text-sm text-slate-500">Carregando contexto do parceiro...</p>
          ) : !parceiroSelecionado ? (
            <p className="text-sm text-slate-500">Selecione um parceiro para avaliar o contexto de credor.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{contextoCredor?.parceiro?.nome || parceiroSelecionado.nome}</p>
                    <p className="text-sm text-slate-500">{contextoCredor?.parceiro?.cpf_cnpj || parceiroSelecionado.cpf_cnpj || '-'}</p>
                  </div>
                  <span className={queueStatusClass(contextoCredor?.credor_sienge?.vinculado ? 'SUCESSO' : 'PENDENTE')}>
                    {contextoCredor?.credor_sienge?.vinculado ? 'Vinculado' : 'Sem vinculo'}
                  </span>
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  <p>
                    <strong>Pronto para busca:</strong>{' '}
                    {contextoCredor?.prontidao?.pronto_para_busca_ou_vinculo ? 'Sim' : 'Nao'}
                  </p>
                  {Array.isArray(contextoCredor?.prontidao?.pendencias) && contextoCredor.prontidao.pendencias.length ? (
                    <p className="mt-1 text-rose-600">
                      Pendencias: {contextoCredor.prontidao.pendencias.join(', ')}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Mapeamento manual</h3>
                  <div className="mt-3 space-y-3">
                    <label className="sol-filter-field">
                      <span className="sol-filter-label">Credor externo no SIENGE</span>
                      <input
                        className="input w-full"
                        value={credorManualId}
                        onChange={(event) => setCredorManualId(event.target.value)}
                        placeholder="Ex.: 1101"
                        disabled={!canEditConfig}
                      />
                    </label>
                    <div className="app-page-actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={salvarMapeamentoManualCredor}
                        disabled={!canEditConfig || !credorManualId || salvandoMapeamentoCredor}
                      >
                        {salvandoMapeamentoCredor ? 'Salvando...' : 'Salvar creditorId'}
                      </button>
                    </div>
                    <p className="text-xs leading-5 text-slate-500">
                      Use este campo quando o `creditorId` ja for conhecido no SIENGE.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Busca operacional no SIENGE</h3>
                  <div className="mt-3 app-page-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => executarBuscaCredor(false)}
                      disabled={!canOperateQueue || buscandoCredorSienge}
                    >
                      {buscandoCredorSienge ? 'Consultando...' : 'Buscar credor'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => executarBuscaCredor(true)}
                      disabled={!canOperateQueue || buscandoCredorSienge}
                    >
                      {buscandoCredorSienge ? 'Consultando...' : 'Buscar e vincular se unico'}
                    </button>
                  </div>

                  {resultadoBuscaCredor ? (
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <p>
                          <strong>Paginas consultadas:</strong> {resultadoBuscaCredor?.consulta?.paginas_consultadas || 0}
                        </p>
                        <p>
                          <strong>Total avaliado:</strong> {resultadoBuscaCredor?.consulta?.total_avaliado || 0}
                        </p>
                        <p>
                          <strong>Match exato unico:</strong>{' '}
                          {resultadoBuscaCredor?.match_exato_unico?.external_creditor_id || 'Nao'}
                        </p>
                      </div>

                      {resultadoBuscaCredor?.candidatos?.length ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 text-left text-slate-500">
                                <th className="px-3 py-2 font-medium">Credor</th>
                                <th className="px-3 py-2 font-medium">Documento</th>
                                <th className="px-3 py-2 font-medium">Nome</th>
                                <th className="px-3 py-2 font-medium">Score</th>
                              </tr>
                            </thead>
                            <tbody>
                              {resultadoBuscaCredor.candidatos.map((item) => (
                                <tr key={`${item.external_creditor_id}-${item.documento || item.nome}`} className="border-b border-slate-100">
                                  <td className="px-3 py-2">{item.external_creditor_id}</td>
                                  <td className="px-3 py-2">{item.documento || '-'}</td>
                                  <td className="px-3 py-2">
                                    {item.nome || '-'}
                                    {item.nome_fantasia ? (
                                      <div className="text-xs text-slate-400">Fantasia: {item.nome_fantasia}</div>
                                    ) : null}
                                  </td>
                                  <td className="px-3 py-2">
                                    {item.score}
                                    {(item.documento_exato || item.nome_exato || item.nome_fantasia_exato) ? (
                                      <div className="text-xs text-emerald-600">
                                        {[
                                          item.documento_exato ? 'documento' : null,
                                          item.nome_exato ? 'nome' : null,
                                          item.nome_fantasia_exato ? 'fantasia' : null
                                        ].filter(Boolean).join(' + ')}
                                      </div>
                                    ) : null}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">Nenhum candidato retornado nas paginas consultadas.</p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      A busca consulta `GET /creditors` com paginacao controlada e tenta localizar correspondencia exata por documento e nome.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Cadastro de credor</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      O cadastro manual usa `POST /creditors` e tenta evitar duplicidade consultando primeiro o recurso de credores.
                    </p>
                  </div>
                  <div className="app-page-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={cadastrarCredorNoSienge}
                      disabled={!canEditConfig || cadastrandoCredorSienge}
                    >
                      {cadastrandoCredorSienge ? 'Cadastrando...' : 'Cadastrar credor no SIENGE'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                    <p>
                      <strong>Payload pronto:</strong>{' '}
                      {Array.isArray(contextoCredor?.pendencias_payload_credor_sienge) && !contextoCredor.pendencias_payload_credor_sienge.length
                        ? 'Sim'
                        : 'Nao'}
                    </p>
                    {Array.isArray(contextoCredor?.pendencias_payload_credor_sienge) && contextoCredor.pendencias_payload_credor_sienge.length ? (
                      <p className="mt-2 text-rose-600">
                        Pendencias do payload: {contextoCredor.pendencias_payload_credor_sienge.join(', ')}
                      </p>
                    ) : (
                      <p className="mt-2 text-emerald-700">O rascunho atual tem os campos minimos que o gateway consegue validar localmente.</p>
                    )}
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Se o ambiente SIENGE exigir um schema diferente, ajuste `payload_defaults` com `siengeCredorTemplate` ou
                      `siengeCredorDefaults` antes de usar a automacao.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-950 px-3 py-3 text-xs text-slate-100">
                    <p className="mb-2 font-semibold uppercase tracking-[0.18em] text-slate-300">Rascunho do payload</p>
                    <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap break-words">
                      {JSON.stringify(contextoCredor?.rascunho_payload_credor_sienge || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="sol-surface-card rounded-xl p-4 md:p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Preparar titulo na fila</h2>
            <p className="text-sm text-slate-500">
              Use o ID do titulo financeiro central. O envio real continua restrito ao payload e endpoint definidos.
            </p>
          </div>

          <form className="space-y-4" onSubmit={prepararFila}>
            <label className="sol-filter-field">
              <span className="sol-filter-label">Titulo financeiro ID</span>
              <input
                type="number"
                className="input w-full"
                value={enqueueForm.titulo_financeiro_id}
                onChange={(event) => setEnqueueForm((current) => ({ ...current, titulo_financeiro_id: event.target.value }))}
                required
              />
            </label>

            <label className="sol-filter-field">
              <span className="sol-filter-label">Origem do modulo</span>
              <select
                className="input w-full"
                value={enqueueForm.origem_modulo}
                onChange={(event) => setEnqueueForm((current) => ({ ...current, origem_modulo: event.target.value }))}
              >
                <option value="">Inferir automaticamente</option>
                {origemModuloOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={enqueueForm.processar_agora}
                onChange={(event) => setEnqueueForm((current) => ({ ...current, processar_agora: event.target.checked }))}
              />
              Processar imediatamente
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={enqueueForm.forcar_recriar_payload}
                onChange={(event) => setEnqueueForm((current) => ({ ...current, forcar_recriar_payload: event.target.checked }))}
              />
              Forcar recriacao do payload
            </label>

            <div className="app-page-actions">
              <button type="submit" className="btn btn-primary" disabled={!canOperateQueue}>
                Preparar fila
              </button>
            </div>
          </form>
        </div>

        <div className="sol-surface-card rounded-xl p-4 md:p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Fila de integracao</h2>
              <p className="text-sm text-slate-500">
                Os itens da fila sempre apontam para o titulo financeiro central. Nao existe copia paralela do titulo.
              </p>
            </div>
            <button type="button" className="btn btn-outline" onClick={aplicarFiltrosFila} disabled={carregando}>
              Atualizar fila
            </button>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <label className="sol-filter-field">
              <span className="sol-filter-label">Status</span>
              <select
                className="input w-full"
                value={filtrosFila.status}
                onChange={(event) => setFiltrosFila((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="">Todos</option>
                <option value="PENDENTE">Pendente</option>
                <option value="PROCESSANDO">Processando</option>
                <option value="SUCESSO">Sucesso</option>
                <option value="ERRO">Erro</option>
              </select>
            </label>

            <label className="sol-filter-field">
              <span className="sol-filter-label">Origem</span>
              <select
                className="input w-full"
                value={filtrosFila.origem_modulo}
                onChange={(event) => setFiltrosFila((current) => ({ ...current, origem_modulo: event.target.value }))}
              >
                <option value="">Todas</option>
                {origemModuloOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <label className="sol-filter-field">
              <span className="sol-filter-label">Titulo financeiro ID</span>
              <input
                type="number"
                className="input w-full"
                value={filtrosFila.titulo_financeiro_id}
                onChange={(event) => setFiltrosFila((current) => ({ ...current, titulo_financeiro_id: event.target.value }))}
              />
            </label>
          </div>

          {carregando ? (
            <p className="text-sm text-slate-500">Carregando fila SIENGE...</p>
          ) : !fila?.items?.length ? (
            <p className="text-sm text-slate-500">Nenhum item na fila para os filtros atuais.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Fila</th>
                    <th className="px-3 py-2 font-medium">Titulo</th>
                    <th className="px-3 py-2 font-medium">Origem</th>
                    <th className="px-3 py-2 font-medium">Parceiro</th>
                    <th className="px-3 py-2 font-medium">Valor</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Tentativas</th>
                    <th className="px-3 py-2 font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {fila.items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-800">#{item.id}</div>
                        <div className="text-xs text-slate-400">{formatDateTime(item.createdAt)}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-800">#{item.tituloFinanceiro?.id}</div>
                        <div className="text-xs text-slate-500">{item.tituloFinanceiro?.descricao || '-'}</div>
                        <div className="text-xs text-slate-400">
                          Doc: {item.tituloFinanceiro?.numero_documento || '-'} | Venc.: {item.tituloFinanceiro?.data_vencimento || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-3">{item.origem_modulo || '-'}</td>
                      <td className="px-3 py-3">
                        {item.tituloFinanceiro?.parceiro?.nome || '-'}
                        <div className="text-xs text-slate-400">{item.tituloFinanceiro?.parceiro?.cpf_cnpj || '-'}</div>
                      </td>
                      <td className="px-3 py-3">{formatCurrency(item.tituloFinanceiro?.valor_original)}</td>
                      <td className="px-3 py-3">
                        <span className={queueStatusClass(item.status)}>{item.status}</span>
                        {item.ultimo_erro ? (
                          <div className="mt-2 max-w-xs text-xs text-rose-600">{item.ultimo_erro}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">{item.tentativas || 0}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => reprocessar(item)}
                            disabled={!canOperateQueue || processandoFilaId === item.id}
                          >
                            {processandoFilaId === item.id ? 'Processando...' : 'Reprocessar'}
                          </button>
                          <Link to={`/financeiro/titulos/${item.tituloFinanceiro?.id}`} className="btn btn-outline btn-sm">
                            Abrir titulo
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="sol-surface-card rounded-xl p-4 md:p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Logs recentes</h2>
          <p className="text-sm text-slate-500">
            Toda tentativa relevante da fundacao SIENGE fica auditada aqui para facilitar diagnostico e reprocessamento.
          </p>
        </div>

        {carregando ? (
          <p className="text-sm text-slate-500">Carregando logs SIENGE...</p>
        ) : !logs?.items?.length ? (
          <p className="text-sm text-slate-500">Nenhum log registrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 font-medium">Fila</th>
                  <th className="px-3 py-2 font-medium">Acao</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {logs.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-3">{formatDateTime(item.createdAt)}</td>
                    <td className="px-3 py-3">#{item.fila?.id || '-'}</td>
                    <td className="px-3 py-3">{item.acao || '-'}</td>
                    <td className="px-3 py-3">
                      <span className={queueStatusClass(item.status)}>{item.status}</span>
                    </td>
                    <td className="px-3 py-3">{item.mensagem || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
