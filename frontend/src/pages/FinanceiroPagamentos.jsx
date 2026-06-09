import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineArrowPath,
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlinePaperAirplane,
  HiOutlineShieldCheck,
  HiOutlineXCircle
} from 'react-icons/hi2';
import {
  aprovarPaymentBatch,
  cancelarPaymentBatch,
  confirmarBaixaPaymentIntent,
  criarPaymentBatch,
  enviarPaymentBatchBanco,
  enviarPaymentBatchBbSandbox,
  getBbPaymentsHealth,
  getPaymentAccounts,
  getPaymentBatch,
  getPaymentBatchBbTransactions,
  getPaymentBatches,
  getPaymentEligibleTitulos,
  getPaymentEvents,
  getPaymentsAwaitingBaixa,
  rejeitarPaymentBatch,
  reprocessarPaymentBatch,
  sincronizarPaymentBatchStatusBb,
  simularRetornoPaymentBatch,
  submeterPaymentBatch
} from '../services/financeiro';
import { useAuth } from '../contexts/AuthContext';
import {
  canApprovePagamentos,
  canAuditPagamentos,
  canCancelPagamentos,
  canConfirmarBaixaPagamento,
  canPreparePagamentos,
  canReprocessPagamentos,
  canSendPagamentosBanco
} from '../utils/acessoProduto';

const TABS = [
  { id: 'titulos', label: 'Titulos elegiveis' },
  { id: 'lotes', label: 'Lotes' },
  { id: 'baixas', label: 'Confirmar baixa' },
  { id: 'auditoria', label: 'Auditoria tecnica', requiresAudit: true }
];

const PAYMENT_EVENT_TYPES = [
  'BB_WEBHOOK_RECEIVED',
  'BB_BATCH_STATUS_SYNCED',
  'BB_SUBMIT_PIX_BATCH_RESPONSE',
  'BB_RELEASE_BATCH_RESPONSE'
];

const PAYMENT_EVENT_STATUSES = ['PENDENTE', 'PROCESSADO', 'ERRO'];

const BATCH_STEPS = [
  { statuses: ['RASCUNHO'], label: 'Rascunho' },
  { statuses: ['PENDENTE_APROVACAO'], label: 'Aprovacao' },
  { statuses: ['APROVADO'], label: 'Aprovado' },
  { statuses: ['ENVIADO_AO_BANCO', 'PROCESSANDO_BANCO'], label: 'Banco' },
  { statuses: ['AGUARDANDO_CONFIRMACAO_BAIXA', 'BAIXADO'], label: 'Baixa' }
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

function statusClass(status) {
  const normalized = String(status || '').toUpperCase();
  if (['APROVADO', 'CONFIRMADO_BANCO', 'BAIXADO', 'SUCESSO'].includes(normalized)) {
    return 'app-status-pill bg-emerald-100 text-emerald-700';
  }
  if (['PENDENTE_APROVACAO', 'ENVIADO_AO_BANCO', 'AGUARDANDO_CONFIRMACAO_BAIXA', 'ENFILEIRADO'].includes(normalized)) {
    return 'app-status-pill bg-amber-100 text-amber-700';
  }
  if (['REJEITADO', 'REJEITADO_BANCO', 'FALHA_INTEGRACAO', 'CANCELADO', 'ERRO'].includes(normalized)) {
    return 'app-status-pill bg-rose-100 text-rose-700';
  }
  return 'app-status-pill bg-slate-100 text-slate-700';
}

function compactFilters(filters = {}) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
  );
}

function sumBy(list, fieldName) {
  return (Array.isArray(list) ? list : []).reduce((acc, item) => acc + Number(item?.[fieldName] || 0), 0);
}

function normalizeStatus(value) {
  return String(value || '').toUpperCase();
}

function getTituloCodigo(titulo) {
  return titulo?.codigo || `#${titulo?.id}`;
}

function getBeneficiaryLabel(titulo) {
  const beneficiary = titulo?.favorecido_pagamento;
  if (!beneficiary) return 'Sem favorecido';
  return `${beneficiary.nome || 'Favorecido'} - ${beneficiary.pix_tipo_chave || 'PIX'} ${beneficiary.pix_chave || ''}`;
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function getPaymentAccountPendencies(account = {}) {
  const pendencies = [];
  if (account?.ativo === false) pendencies.push('Conta inativa.');
  if (!account?.empresa_id && !account?.empresa?.id) pendencies.push('Empresa pagadora pendente.');
  if (account?.contaBancaria && !account.contaBancaria.empresa_id) pendencies.push('Conta bancaria interna sem empresa vinculada.');
  if (account?.empresa_id && account?.contaBancaria?.empresa_id && Number(account.empresa_id) !== Number(account.contaBancaria.empresa_id)) {
    pendencies.push('Empresa da conta bancaria diverge da empresa pagadora.');
  }
  if (onlyDigits(account?.cnpj_pagador).length !== 14) pendencies.push('CNPJ pagador incompleto.');
  if (!account?.banco_codigo) pendencies.push('Banco pendente.');
  if (!account?.agencia) pendencies.push('Agencia pendente.');
  if (!account?.conta) pendencies.push('Conta pendente.');
  if (!account?.tipo_conta) pendencies.push('Tipo de conta pendente.');
  if (!account?.convenio) pendencies.push('Convenio pendente.');
  return pendencies;
}

function getPaymentAccountEmpresaId(account = {}) {
  return Number(account?.empresa_id || account?.empresa?.id || 0);
}

function getTituloEmpresaId(titulo = {}) {
  return Number(titulo?.empresa_id || titulo?.empresa?.id || 0);
}

function getTituloEmpresaLabel(titulo = {}) {
  return titulo?.empresa?.nome || titulo?.empresa?.razao_social || (titulo?.empresa_id ? `Empresa #${titulo.empresa_id}` : 'Empresa pendente');
}

function getAccountLabel(account = {}) {
  return account?.contaBancaria?.nome || account?.empresa?.nome || account?.empresa?.razao_social || (account?.id ? `Conta pagadora #${account.id}` : 'Conta pagadora pendente');
}

function getTituloPaymentAccountPendencies(titulo = {}, account = null) {
  const pendencies = [];
  const tituloEmpresaId = getTituloEmpresaId(titulo);
  const accountEmpresaId = getPaymentAccountEmpresaId(account);

  if (!tituloEmpresaId) {
    pendencies.push('Titulo sem empresa pagadora.');
  }
  if (!accountEmpresaId) {
    pendencies.push('Selecione uma conta pagadora completa.');
  }
  if (tituloEmpresaId && accountEmpresaId && tituloEmpresaId !== accountEmpresaId) {
    pendencies.push('Empresa do titulo diferente da conta pagadora.');
  }

  return pendencies;
}

function buildBatchGuidance(batch, approvalsCount, isBbSandbox) {
  const status = normalizeStatus(batch?.status);
  if (!batch) {
    return {
      eyebrow: 'Revisao de lote',
      title: 'Selecione um lote para continuar',
      body: 'Escolha um lote na lista para conferir itens, aprovacoes e historico tecnico.',
      targetTab: 'lotes',
      actionLabel: 'Ver lotes'
    };
  }
  if (status === 'RASCUNHO') {
    return {
      eyebrow: 'Proximo passo',
      title: 'Submeter o lote para aprovacao',
      body: 'Confira conta pagadora, valor total e favorecidos antes de iniciar a dupla aprovacao.'
    };
  }
  if (status === 'PENDENTE_APROVACAO') {
    return {
      eyebrow: 'Aprovacao',
      title: `${approvalsCount}/2 aprovacoes registradas`,
      body: 'Cada aprovador deve conferir os itens e informar MFA proprio. O criador do lote nao aprova o proprio lote.'
    };
  }
  if (status === 'APROVADO') {
    return {
      eyebrow: 'Envio bancario',
      title: isBbSandbox ? 'Enviar para BB Sandbox' : 'Enviar em modo mock',
      body: 'Depois do envio, aguarde retorno bancario. A baixa financeira ainda nao deve ser feita nesta etapa.'
    };
  }
  if (['ENVIADO_AO_BANCO', 'PROCESSANDO_BANCO'].includes(status)) {
    return {
      eyebrow: 'Retorno bancario',
      title: 'Acompanhar retorno do banco',
      body: isBbSandbox ? 'Use a sincronizacao BB para atualizar as transacoes.' : 'Use o retorno mock para simular confirmacao ou falha.'
    };
  }
  if (status === 'AGUARDANDO_CONFIRMACAO_BAIXA') {
    return {
      eyebrow: 'Baixa financeira',
      title: 'Confirmar baixa dos pagamentos liquidados',
      body: 'Somente pagamentos confirmados pelo banco devem virar baixa financeira no titulo.',
      targetTab: 'baixas',
      actionLabel: 'Ver baixas pendentes'
    };
  }
  if (['REJEITADO', 'FALHA_INTEGRACAO', 'PARCIALMENTE_REJEITADO'].includes(status)) {
    return {
      eyebrow: 'Correcao',
      title: 'Corrigir causa antes de reprocessar',
      body: 'Revise favorecido, conta pagadora, retorno tecnico e justificativas antes de gerar novo envio.'
    };
  }
  return {
    eyebrow: 'Status do lote',
    title: batch.status || 'Lote selecionado',
    body: 'Confira historico, itens e transacoes para definir a proxima acao operacional.'
  };
}

function getBatchStepIndex(status) {
  const normalized = normalizeStatus(status);
  const index = BATCH_STEPS.findIndex((step) => step.statuses.includes(normalized));
  return index >= 0 ? index : -1;
}

function getEventPayloadSummary(event = {}) {
  const payload = event.payload || {};
  const candidates = [
    payload.status,
    payload.estado,
    payload.situacao,
    payload.codigoEstado,
    payload.mensagem,
    payload.error?.message
  ].filter(Boolean);
  return candidates.length ? candidates.join(' - ') : 'Payload preservado para auditoria tecnica.';
}

export default function FinanceiroPagamentos() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('titulos');
  const [accounts, setAccounts] = useState([]);
  const [titulos, setTitulos] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [bbHealth, setBbHealth] = useState(null);
  const [bbTransactions, setBbTransactions] = useState([]);
  const [paymentEvents, setPaymentEvents] = useState([]);
  const [awaitingBaixa, setAwaitingBaixa] = useState([]);
  const [filters, setFilters] = useState({
    vencimento_inicial: '',
    vencimento_final: '',
    parceiro_id: '',
    obra_id: '',
    categoria_financeira_id: ''
  });
  const [batchForm, setBatchForm] = useState({
    payment_account_id: '',
    data_programada: today()
  });
  const [eventFilters, setEventFilters] = useState({
    status: '',
    event_type: '',
    provider_event_id: '',
    payment_batch_id: '',
    payment_intent_id: '',
    data_inicio: '',
    data_fim: '',
    limit: '50'
  });
  const [mfaCode, setMfaCode] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canPrepare = useMemo(() => canPreparePagamentos(user), [user]);
  const canApprove = useMemo(() => canApprovePagamentos(user), [user]);
  const canSend = useMemo(() => canSendPagamentosBanco(user), [user]);
  const canAudit = useMemo(() => canAuditPagamentos(user), [user]);
  const canCancel = useMemo(() => canCancelPagamentos(user), [user]);
  const canReprocess = useMemo(() => canReprocessPagamentos(user), [user]);
  const canConfirmBaixa = useMemo(() => canConfirmarBaixaPagamento(user), [user]);
  const isBbSandbox = Boolean(bbHealth?.sandboxRealEnabled);
  const visibleTabs = useMemo(() => TABS.filter((tab) => !tab.requiresAudit || canAudit), [canAudit]);

  async function loadBase() {
    try {
      setLoading(true);
      setError('');
      const [accountsData, batchesData, baixaData, bbHealthData] = await Promise.all([
        getPaymentAccounts().catch(() => []),
        getPaymentBatches().catch(() => []),
        getPaymentsAwaitingBaixa().catch(() => []),
        getBbPaymentsHealth().catch(() => null)
      ]);
      const accountList = Array.isArray(accountsData) ? accountsData : [];
      const firstOperationalAccount = accountList.find((account) => getPaymentAccountPendencies(account).length === 0);
      setAccounts(accountList);
      setBatches(Array.isArray(batchesData) ? batchesData : []);
      setAwaitingBaixa(Array.isArray(baixaData) ? baixaData : []);
      setBbHealth(bbHealthData);
      setBatchForm((current) => ({
        ...current,
        payment_account_id: current.payment_account_id || String(firstOperationalAccount?.id || '')
      }));
    } catch (err) {
      setError(err?.message || 'Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  }

  async function loadTitulos() {
    try {
      setActionLoading('titulos');
      setError('');
      const accountEmpresaId = getPaymentAccountEmpresaId(selectedPaymentAccount);
      const data = await getPaymentEligibleTitulos(compactFilters({
        ...filters,
        empresa_id: accountEmpresaId || ''
      }));
      setTitulos(Array.isArray(data) ? data : []);
      setSelectedIds([]);
    } catch (err) {
      setError(err?.message || 'Erro ao buscar titulos elegiveis');
    } finally {
      setActionLoading('');
    }
  }

  async function loadBatch(id) {
    if (!id) return;
    try {
      setActionLoading(`batch-${id}`);
      setError('');
      const data = await getPaymentBatch(id);
      setSelectedBatch(data);
      const transactionsData = await getPaymentBatchBbTransactions(id).catch(() => []);
      setBbTransactions(Array.isArray(transactionsData) ? transactionsData : []);
    } catch (err) {
      setError(err?.message || 'Erro ao carregar lote');
    } finally {
      setActionLoading('');
    }
  }

  async function loadPaymentEvents() {
    try {
      setActionLoading('eventos');
      setError('');
      const data = await getPaymentEvents(compactFilters(eventFilters));
      setPaymentEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Erro ao buscar eventos tecnicos de pagamento');
    } finally {
      setActionLoading('');
    }
  }

  async function refreshAfterAction(batchId = selectedBatch?.id) {
    await loadBase();
    if (batchId) await loadBatch(batchId);
    if (activeTab === 'auditoria' && canAudit) await loadPaymentEvents();
  }

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    if (activeTab === 'auditoria' && canAudit && paymentEvents.length === 0) {
      loadPaymentEvents();
    }
  }, [activeTab, canAudit]);

  const selectedTotal = useMemo(() => {
    const selected = new Set(selectedIds.map(String));
    return titulos.reduce((acc, titulo) => selected.has(String(titulo.id)) ? acc + Number(titulo.valor_saldo || 0) : acc, 0);
  }, [selectedIds, titulos]);

  const validApprovals = useMemo(() => (
    Array.isArray(selectedBatch?.approvals)
      ? selectedBatch.approvals.filter((approval) => approval.acao === 'APPROVE' && approval.status === 'APROVADO')
      : []
  ), [selectedBatch]);

  const paymentOverview = useMemo(() => {
    const activeAccounts = accounts.filter((account) => getPaymentAccountPendencies(account).length === 0);
    const pendingApproval = batches.filter((batch) => normalizeStatus(batch?.status) === 'PENDENTE_APROVACAO');
    const bankProcessing = batches.filter((batch) => ['ENVIADO_AO_BANCO', 'PROCESSANDO_BANCO', 'FALHA_INTEGRACAO'].includes(normalizeStatus(batch?.status)));

    return {
      activeAccounts: activeAccounts.length,
      totalAccounts: accounts.length,
      pendingApprovalCount: pendingApproval.length,
      pendingApprovalValue: sumBy(pendingApproval, 'valor_total'),
      bankProcessingCount: bankProcessing.length,
      bankProcessingValue: sumBy(bankProcessing, 'valor_total'),
      awaitingBaixaCount: awaitingBaixa.length,
      awaitingBaixaValue: sumBy(awaitingBaixa, 'valor'),
      certificateConfigured: Boolean(bbHealth?.certificateConfigured),
      modeLabel: isBbSandbox ? 'BB Sandbox' : 'Mock interno'
    };
  }, [accounts, awaitingBaixa, batches, bbHealth, isBbSandbox]);

  const selectedPaymentAccount = useMemo(() => (
    accounts.find((account) => String(account.id) === String(batchForm.payment_account_id))
  ), [accounts, batchForm.payment_account_id]);

  const selectedPaymentAccountPendencies = useMemo(
    () => (selectedPaymentAccount ? getPaymentAccountPendencies(selectedPaymentAccount) : []),
    [selectedPaymentAccount]
  );

  const selectedTitulosAccountPendencies = useMemo(() => {
    const selected = new Set(selectedIds.map(String));
    return titulos
      .filter((titulo) => selected.has(String(titulo.id)))
      .map((titulo) => ({
        titulo,
        pendencias: getTituloPaymentAccountPendencies(titulo, selectedPaymentAccount)
      }))
      .filter((item) => item.pendencias.length > 0);
  }, [selectedIds, selectedPaymentAccount, titulos]);

  const titulosOverview = useMemo(() => {
    const eligible = titulos.filter((titulo) => titulo.elegivel_pagamento);
    const compatible = eligible.filter((titulo) => getTituloPaymentAccountPendencies(titulo, selectedPaymentAccount).length === 0);
    return {
      total: titulos.length,
      eligibleCount: eligible.length,
      compatibleCount: compatible.length,
      blockedCount: Math.max(titulos.length - eligible.length, 0),
      companyBlockedCount: Math.max(eligible.length - compatible.length, 0),
      selectedCount: selectedIds.length,
      selectedTotal,
      selectedCompanyBlockedCount: selectedTitulosAccountPendencies.length
    };
  }, [selectedIds.length, selectedPaymentAccount, selectedTitulosAccountPendencies.length, selectedTotal, titulos]);

  const pageGuidance = useMemo(() => {
    if (activeTab === 'titulos') {
      if (paymentOverview.activeAccounts === 0) {
        return {
          eyebrow: 'Preparacao',
          title: 'Cadastre uma conta pagadora completa',
          body: 'Sem empresa pagadora, CNPJ, dados bancarios e convenio, o financeiro nao consegue montar lote com informacoes reais.',
          targetTab: 'titulos',
          actionLabel: 'Selecionar titulos'
        };
      }
      if (!titulosOverview.total) {
        return {
          eyebrow: 'Preparacao',
          title: 'Busque os titulos elegiveis',
          body: 'Use os filtros para montar uma lista curta e conferir favorecidos antes de gerar o lote.'
        };
      }
      if (titulosOverview.selectedCount > 0) {
        return {
          eyebrow: 'Lote em montagem',
          title: `${titulosOverview.selectedCount} titulo(s) selecionado(s)`,
          body: titulosOverview.selectedCompanyBlockedCount
            ? `${titulosOverview.selectedCompanyBlockedCount} titulo(s) selecionado(s) nao pertencem a empresa da conta pagadora.`
            : `${formatCurrency(titulosOverview.selectedTotal)} pronto para gerar lote, desde que conta pagadora e data estejam corretas.`
        };
      }
      return {
        eyebrow: 'Conferencia',
        title: `${titulosOverview.compatibleCount} titulo(s) pronto(s) para a conta selecionada`,
        body: titulosOverview.blockedCount || titulosOverview.companyBlockedCount
          ? `${titulosOverview.blockedCount} com pendencias cadastrais e ${titulosOverview.companyBlockedCount} de outra empresa para esta conta.`
          : 'Selecione os titulos que realmente devem ser pagos neste lote.'
      };
    }

    if (activeTab === 'lotes') {
      return buildBatchGuidance(selectedBatch, validApprovals.length, isBbSandbox);
    }

    if (activeTab === 'auditoria') {
      return {
        eyebrow: 'Auditoria tecnica',
        title: `${paymentEvents.length} evento(s) tecnico(s) na consulta`,
        body: 'Use essa leitura para investigar webhook, polling, respostas do provider e status de processamento. Evento tecnico nao substitui baixa financeira.'
      };
    }

    if (awaitingBaixa.length > 0) {
      return {
        eyebrow: 'Baixa financeira',
        title: `${awaitingBaixa.length} pagamento(s) aguardando baixa`,
        body: `${formatCurrency(sumBy(awaitingBaixa, 'valor'))} ja foi confirmado pelo banco e precisa de baixa operacional.`
      };
    }

    return {
      eyebrow: 'Baixa financeira',
      title: 'Nenhuma baixa pendente',
      body: 'Quando o banco confirmar pagamentos, eles aparecerao aqui para baixa semiautomatica.'
    };
  }, [activeTab, awaitingBaixa, isBbSandbox, paymentEvents.length, paymentOverview.activeAccounts, selectedBatch, titulosOverview, validApprovals.length]);

  const selectedBatchStepIndex = useMemo(() => getBatchStepIndex(selectedBatch?.status), [selectedBatch?.status]);
  const cancelRequiresMfa = ['PENDENTE_APROVACAO', 'APROVADO'].includes(String(selectedBatch?.status || '').toUpperCase());

  function toggleTitulo(id) {
    setSelectedIds((current) => (
      current.map(String).includes(String(id))
        ? current.filter((item) => String(item) !== String(id))
        : [...current, id]
    ));
  }

  function handlePaymentAccountChange(value) {
    setBatchForm((current) => ({ ...current, payment_account_id: value }));
    setSelectedIds([]);
  }

  async function handleCriarLote() {
    try {
      if (!selectedIds.length) {
        setError('Selecione ao menos um titulo elegivel.');
        return;
      }
      if (selectedTitulosAccountPendencies.length > 0) {
        setError('Remova da selecao os titulos cuja empresa diverge da conta pagadora.');
        return;
      }
      setActionLoading('criar-lote');
      setError('');
      const data = await criarPaymentBatch({
        titulo_ids: selectedIds,
        payment_account_id: Number(batchForm.payment_account_id),
        data_programada: batchForm.data_programada
      });
      setSelectedIds([]);
      setActiveTab('lotes');
      await refreshAfterAction(data?.id);
    } catch (err) {
      setError(err?.message || 'Erro ao criar lote');
    } finally {
      setActionLoading('');
    }
  }

  async function runBatchAction(name, callback) {
    if (!selectedBatch?.id) return;
    try {
      setActionLoading(name);
      setError('');
      await callback(selectedBatch.id);
      setMfaCode('');
      await refreshAfterAction(selectedBatch.id);
    } catch (err) {
      setError(err?.message || 'Erro ao executar acao do lote');
    } finally {
      setActionLoading('');
    }
  }

  async function handleConfirmBaixa(intentId) {
    try {
      setActionLoading(`baixa-${intentId}`);
      setError('');
      await confirmarBaixaPaymentIntent(intentId, {});
      await refreshAfterAction();
    } catch (err) {
      setError(err?.message || 'Erro ao confirmar baixa');
    } finally {
      setActionLoading('');
    }
  }

  function handleCancelBatch() {
    if (!selectedBatch?.id) return;
    if (cancelRequiresMfa && !String(mfaCode || '').trim()) {
      setError('Informe o codigo MFA para cancelar lote pendente de aprovacao ou aprovado.');
      return;
    }
    const justificativa = window.prompt('Informe o motivo do cancelamento do lote:');
    if (justificativa === null) return;
    runBatchAction('cancelar', (id) => cancelarPaymentBatch(id, {
      justificativa: justificativa.trim() || 'Cancelado pela operacao financeira.',
      codigo_mfa: cancelRequiresMfa ? mfaCode : undefined
    }));
  }

  function handleRejectBatch() {
    if (!selectedBatch?.id) return;
    const justificativa = window.prompt('Informe o motivo da rejeicao do lote:');
    if (justificativa === null) return;
    const motivo = justificativa.trim();
    if (!motivo) {
      setError('Informe uma justificativa para rejeitar o lote.');
      return;
    }
    runBatchAction('rejeitar', (id) => rejeitarPaymentBatch(id, { justificativa: motivo }));
  }

  function handleReprocessBatch() {
    if (!selectedBatch?.id) return;
    const justificativa = window.prompt('Informe o motivo do reprocessamento do lote:');
    if (justificativa === null) return;
    runBatchAction('reprocessar', (id) => reprocessarPaymentBatch(id, {
      codigo_mfa: mfaCode,
      justificativa: justificativa.trim() || 'Reprocessamento solicitado pela operacao financeira.'
    }));
  }

  function handleMockBankReturn(resultado) {
    if (!selectedBatch?.id) return;
    if (!String(mfaCode || '').trim()) {
      setError('Informe o codigo MFA para registrar retorno bancario mockado.');
      return;
    }
    const justificativa = window.prompt(
      resultado === 'CONFIRMADO'
        ? 'Informe a justificativa/evidencia para confirmar o retorno bancario mockado:'
        : 'Informe a justificativa/evidencia para registrar falha no retorno bancario mockado:'
    );
    if (justificativa === null) return;
    const motivo = justificativa.trim();
    if (!motivo) {
      setError('Informe uma justificativa para registrar o retorno bancario mockado.');
      return;
    }
    runBatchAction(resultado === 'CONFIRMADO' ? 'retorno' : 'falha-mock', (id) => simularRetornoPaymentBatch(id, {
      resultado,
      codigo_mfa: mfaCode,
      justificativa: motivo
    }));
  }

  return (
    <div className="page solicitacoes-page">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
              <h1 className="text-xl font-semibold md:text-2xl">Pagamentos em Massa</h1>
              <p className="page-subtitle">
                Motor interno para lotes PIX por chave, com dupla aprovacao, sandbox BB e baixa semiautomatica.
              </p>
            </div>
            <div className="app-page-actions">
              <span className={isBbSandbox ? 'app-status-pill bg-emerald-100 text-emerald-700' : 'app-status-pill bg-slate-100 text-slate-700'}>
                {isBbSandbox ? 'BB SANDBOX' : 'MOCK'}
              </span>
              <Link to="/financeiro/titulos" className="btn btn-outline">Titulos</Link>
              <Link to="/financeiro/cadastros" className="btn btn-outline">Cadastros</Link>
            </div>
        </div>
      </div>

      {error && <div className="app-alert app-alert--error">{error}</div>}

      <div className="solicitacoes-toolbar">
        <div className="finance-category-toggle-group" role="tablist" aria-label="Navegacao de pagamentos">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`finance-category-toggle ${activeTab === tab.id ? 'finance-category-toggle--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-outline" onClick={loadBase} disabled={loading}>
          <HiOutlineArrowPath className="h-4 w-4" />
          Atualizar
        </button>
      </div>

      {!loading && (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            className="card sol-surface-card text-left transition hover:-translate-y-0.5 hover:border-[var(--c-primary)]"
            onClick={() => setActiveTab('titulos')}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">Conta pagadora</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--c-text)]">
              {paymentOverview.activeAccounts}/{paymentOverview.totalAccounts}
            </p>
            <p className="mt-1 text-sm text-[var(--c-muted)]">
              {paymentOverview.activeAccounts > 0 ? 'Conta ativa pronta para preparar lotes.' : 'Cadastre uma conta ativa antes de gerar lote.'}
            </p>
          </button>
          <button
            type="button"
            className="card sol-surface-card text-left transition hover:-translate-y-0.5 hover:border-[var(--c-primary)]"
            onClick={() => setActiveTab(canAudit ? 'auditoria' : 'lotes')}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">Aguardando aprovacao</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--c-text)]">{paymentOverview.pendingApprovalCount}</p>
            <p className="mt-1 text-sm text-[var(--c-muted)]">{formatCurrency(paymentOverview.pendingApprovalValue)} pendente de dupla conferencia.</p>
          </button>
          <button
            type="button"
            className="card sol-surface-card text-left transition hover:-translate-y-0.5 hover:border-[var(--c-primary)]"
            onClick={() => setActiveTab('lotes')}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">Banco / retorno</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--c-text)]">{paymentOverview.bankProcessingCount}</p>
            <p className="mt-1 text-sm text-[var(--c-muted)]">
              {paymentOverview.modeLabel} - {isBbSandbox ? (paymentOverview.certificateConfigured ? 'certificado configurado' : 'certificado pendente') : 'retorno simulado'}
            </p>
            <p className="mt-1 text-xs font-medium text-[var(--c-muted)]">{formatCurrency(paymentOverview.bankProcessingValue)} em acompanhamento.</p>
          </button>
          <button
            type="button"
            className="card sol-surface-card text-left transition hover:-translate-y-0.5 hover:border-[var(--c-primary)]"
            onClick={() => setActiveTab('baixas')}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">Baixa pendente</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--c-text)]">{paymentOverview.awaitingBaixaCount}</p>
            <p className="mt-1 text-sm text-[var(--c-muted)]">{formatCurrency(paymentOverview.awaitingBaixaValue)} confirmado pelo banco aguardando baixa.</p>
          </button>
        </section>
      )}

      {!loading && (
        <section className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--c-muted)]">{pageGuidance.eyebrow}</p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--c-text)]">{pageGuidance.title}</h2>
              <p className="mt-1 text-sm text-[var(--c-muted)]">{pageGuidance.body}</p>
            </div>
            {pageGuidance.targetTab && pageGuidance.targetTab !== activeTab && (
              <button type="button" className="btn btn-outline" onClick={() => setActiveTab(pageGuidance.targetTab)}>
                {pageGuidance.actionLabel || 'Abrir etapa'}
              </button>
            )}
          </div>
        </section>
      )}

      {loading ? (
        <div className="app-empty-card">Carregando pagamentos...</div>
      ) : (
        <>
          {activeTab === 'titulos' && (
            <section className="space-y-4">
              <div className="card sol-surface-card">
                <div className="sol-filtros-head">
                  <div>
                    <p className="sol-filtros-title">Selecao para lote</p>
                    <p className="sol-filtros-subtitle">Somente contas a pagar abertas/parciais e com favorecido PIX completo entram no lote.</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
                  <label className="sol-filter-field xl:col-span-2">
                    <span className="sol-filter-label">Vencimento inicio</span>
                    <input className="input w-full" type="date" value={filters.vencimento_inicial} onChange={(e) => setFilters((c) => ({ ...c, vencimento_inicial: e.target.value }))} />
                  </label>
                  <label className="sol-filter-field xl:col-span-2">
                    <span className="sol-filter-label">Vencimento fim</span>
                    <input className="input w-full" type="date" value={filters.vencimento_final} onChange={(e) => setFilters((c) => ({ ...c, vencimento_final: e.target.value }))} />
                  </label>
                  <label className="sol-filter-field xl:col-span-2">
                    <span className="sol-filter-label">Parceiro ID</span>
                    <input className="input w-full" inputMode="numeric" value={filters.parceiro_id} onChange={(e) => setFilters((c) => ({ ...c, parceiro_id: e.target.value }))} />
                  </label>
                  <label className="sol-filter-field xl:col-span-2">
                    <span className="sol-filter-label">Obra ID</span>
                    <input className="input w-full" inputMode="numeric" value={filters.obra_id} onChange={(e) => setFilters((c) => ({ ...c, obra_id: e.target.value }))} />
                  </label>
                  <label className="sol-filter-field xl:col-span-2">
                    <span className="sol-filter-label">Conta pagadora</span>
                    <select className="input w-full" value={batchForm.payment_account_id} onChange={(e) => handlePaymentAccountChange(e.target.value)}>
                      <option value="">Selecione</option>
                      {accounts.map((account) => {
                        const pendencies = getPaymentAccountPendencies(account);
                        return (
                          <option key={account.id} value={account.id} disabled={pendencies.length > 0}>
                            {account.contaBancaria?.nome || `Conta ${account.id}`} - {account.empresa?.nome || 'Empresa pendente'} - CNPJ {account.cnpj_pagador || '-'} - Conv. {account.convenio || '-'}{pendencies.length ? ' - INCOMPLETA' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {selectedPaymentAccountPendencies.length > 0 && (
                      <span className="mt-2 block text-xs font-medium text-rose-700">
                        {selectedPaymentAccountPendencies.join(' ')}
                      </span>
                    )}
                    <span className="app-note mt-2">
                      Cadastre em Financeiro &gt; Cadastros Financeiros &gt; Contas pagadoras BB.
                    </span>
                  </label>
                  <label className="sol-filter-field xl:col-span-2">
                    <span className="sol-filter-label">Data pagamento</span>
                    <input className="input w-full" type="date" min={today()} value={batchForm.data_programada} onChange={(e) => setBatchForm((c) => ({ ...c, data_programada: e.target.value }))} />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary" onClick={loadTitulos} disabled={!canPrepare || actionLoading === 'titulos'}>
                    <HiOutlineClock className="h-4 w-4" />
                    {actionLoading === 'titulos' ? 'Buscando...' : 'Buscar elegiveis'}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={handleCriarLote} disabled={!canPrepare || !selectedIds.length || !batchForm.payment_account_id || selectedPaymentAccountPendencies.length > 0 || selectedTitulosAccountPendencies.length > 0 || actionLoading === 'criar-lote'}>
                    <HiOutlineBanknotes className="h-4 w-4" />
                    {actionLoading === 'criar-lote' ? 'Gerando...' : `Gerar lote (${selectedIds.length})`}
                  </button>
                  <span className="app-status-pill bg-slate-100 text-slate-700">{formatCurrency(selectedTotal)}</span>
                </div>
                {selectedTitulosAccountPendencies.length > 0 && (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    Remova da selecao os titulos de outra empresa antes de gerar o lote:
                    {' '}
                    {selectedTitulosAccountPendencies.map(({ titulo }) => getTituloCodigo(titulo)).join(', ')}.
                  </div>
                )}
                {titulosOverview.total > 0 && (
                  <div className="mt-4 grid gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-sm md:grid-cols-5">
                    <div>
                      <span className="block text-xs uppercase tracking-[0.14em] text-[var(--c-muted)]">Listados</span>
                      <strong className="text-[var(--c-text)]">{titulosOverview.total}</strong>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-[0.14em] text-[var(--c-muted)]">Elegiveis</span>
                      <strong className="text-emerald-700">{titulosOverview.eligibleCount}</strong>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-[0.14em] text-[var(--c-muted)]">Para esta conta</span>
                      <strong className={titulosOverview.companyBlockedCount ? 'text-amber-700' : 'text-emerald-700'}>{titulosOverview.compatibleCount}</strong>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-[0.14em] text-[var(--c-muted)]">Com pendencia</span>
                      <strong className={titulosOverview.blockedCount ? 'text-amber-700' : 'text-[var(--c-text)]'}>{titulosOverview.blockedCount}</strong>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-[0.14em] text-[var(--c-muted)]">Selecionado</span>
                      <strong className="text-[var(--c-primary)]">{formatCurrency(titulosOverview.selectedTotal)}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="card sol-surface-card">
                {titulos.length === 0 ? (
                  <div className="app-empty-card">Busque titulos a pagar para montar o primeiro lote.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-xs uppercase text-[var(--c-muted)]">
                        <tr>
                          <th className="px-3 py-2">Selecionar</th>
                          <th className="px-3 py-2">Titulo</th>
                          <th className="px-3 py-2">Credor</th>
                          <th className="px-3 py-2">Favorecido PIX</th>
                          <th className="px-3 py-2">Vencimento</th>
                          <th className="px-3 py-2 text-right">Saldo</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {titulos.map((titulo) => {
                          const accountPendencies = getTituloPaymentAccountPendencies(titulo, selectedPaymentAccount);
                          const canSelectTitulo = titulo.elegivel_pagamento && accountPendencies.length === 0;
                          return (
                          <tr key={titulo.id} className={canSelectTitulo ? '' : 'bg-amber-50/50'}>
                            <td className="px-3 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.map(String).includes(String(titulo.id))}
                                disabled={!canSelectTitulo}
                                onChange={() => toggleTitulo(titulo.id)}
                              />
                            </td>
                            <td className="px-3 py-3">
                              <Link to={`/financeiro/titulos/${titulo.id}`} className="font-medium text-[var(--c-primary)]">
                                {getTituloCodigo(titulo)}
                              </Link>
                              <div className="text-xs text-[var(--c-muted)]">{titulo.numero_documento || 'Sem documento'}</div>
                              <div className="text-xs text-[var(--c-muted)]">{getTituloEmpresaLabel(titulo)}</div>
                            </td>
                            <td className="px-3 py-3">{titulo.parceiro?.nome || '-'}</td>
                            <td className="px-3 py-3">{getBeneficiaryLabel(titulo)}</td>
                            <td className="px-3 py-3">{formatDate(titulo.data_vencimento)}</td>
                            <td className="px-3 py-3 text-right font-medium">{formatCurrency(titulo.valor_saldo)}</td>
                            <td className="px-3 py-3">
                              {canSelectTitulo ? (
                                <span className="app-status-pill bg-emerald-100 text-emerald-700">ELEGIVEL</span>
                              ) : (
                                <span className="text-xs text-amber-700">{[...(titulo.pendencias_pagamento || []), ...accountPendencies].join(' ')}</span>
                              )}
                            </td>
                          </tr>
                        );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'lotes' && (
            <section className="grid gap-4 xl:grid-cols-[minmax(280px,420px)_1fr]">
              <div className="card sol-surface-card">
                <h2 className="text-lg font-semibold text-[var(--c-text)]">Lotes recentes</h2>
                <div className="mt-4 app-list-stack">
                  {batches.length === 0 ? (
                    <p className="text-sm text-[var(--c-muted)]">Nenhum lote criado.</p>
                  ) : batches.map((batch) => (
                    <button
                      key={batch.id}
                      type="button"
                      className="app-list-card text-left"
                      onClick={() => loadBatch(batch.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-[var(--c-text)]">{batch.codigo}</div>
                          <div className="text-xs text-[var(--c-muted)]">
                            {batch.quantidade_itens} item(ns) - {formatCurrency(batch.valor_total)}
                          </div>
                        </div>
                        <span className={statusClass(batch.status)}>{batch.status}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="card sol-surface-card">
                {!selectedBatch ? (
                  <div className="app-empty-card">Selecione um lote para revisar aprovacoes, envio e itens.</div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-[var(--c-text)]">{selectedBatch.codigo}</h2>
                        <p className="text-sm text-[var(--c-muted)]">
                          {selectedBatch.paymentAccount?.contaBancaria?.nome || 'Conta pagadora'} - {selectedBatch.paymentAccount?.cnpj_pagador || 'CNPJ nao informado'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={statusClass(selectedBatch.status)}>{selectedBatch.status}</span>
                        <span className="app-status-pill bg-slate-100 text-slate-700">{formatCurrency(selectedBatch.valor_total)}</span>
                        <span className="app-status-pill bg-slate-100 text-slate-700">{validApprovals.length}/2 aprovacoes</span>
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-5">
                      {BATCH_STEPS.map((step, index) => {
                        const isCurrent = index === selectedBatchStepIndex;
                        const isDone = selectedBatchStepIndex > index;
                        const tone = isCurrent
                          ? 'border-[var(--c-primary)] bg-blue-50 text-[var(--c-primary)]'
                          : isDone
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-500';
                        return (
                          <div key={step.label} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${tone}`}>
                            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-xs">{index + 1}</span>
                            {step.label}
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid gap-3 md:grid-cols-[minmax(180px,260px)_1fr]">
                      <input
                        className="input w-full"
                        placeholder="Codigo MFA"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value)}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn btn-outline" onClick={() => runBatchAction('submeter', (id) => submeterPaymentBatch(id))} disabled={!canPrepare || selectedBatch.status !== 'RASCUNHO' || actionLoading === 'submeter'}>
                          <HiOutlineShieldCheck className="h-4 w-4" />
                          Submeter
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => runBatchAction('aprovar', (id) => aprovarPaymentBatch(id, { codigo_mfa: mfaCode }))} disabled={!canApprove || selectedBatch.status !== 'PENDENTE_APROVACAO' || !mfaCode || actionLoading === 'aprovar'}>
                          <HiOutlineCheckCircle className="h-4 w-4" />
                          Aprovar
                        </button>
                        <button type="button" className="btn btn-outline" onClick={handleRejectBatch} disabled={!canApprove || !['PENDENTE_APROVACAO', 'APROVADO'].includes(selectedBatch.status) || actionLoading === 'rejeitar'}>
                          <HiOutlineXCircle className="h-4 w-4" />
                          Rejeitar
                        </button>
                        <button type="button" className="btn btn-outline" onClick={handleCancelBatch} disabled={!canCancel || !['RASCUNHO', 'EM_REVISAO', 'PENDENTE_APROVACAO', 'APROVADO'].includes(selectedBatch.status) || actionLoading === 'cancelar'}>
                          <HiOutlineXCircle className="h-4 w-4" />
                          {cancelRequiresMfa ? 'Cancelar com MFA' : 'Cancelar'}
                        </button>
                        {!isBbSandbox && (
                          <button type="button" className="btn btn-primary" onClick={() => runBatchAction('enviar', (id) => enviarPaymentBatchBanco(id, { codigo_mfa: mfaCode }))} disabled={!canSend || selectedBatch.status !== 'APROVADO' || !mfaCode || actionLoading === 'enviar'}>
                            <HiOutlinePaperAirplane className="h-4 w-4" />
                            Enviar mock
                          </button>
                        )}
                        {isBbSandbox && (
                          <button type="button" className="btn btn-primary" onClick={() => runBatchAction('enviar-bb', (id) => enviarPaymentBatchBbSandbox(id, { codigo_mfa: mfaCode }))} disabled={!canSend || selectedBatch.status !== 'APROVADO' || !mfaCode || actionLoading === 'enviar-bb'}>
                            <HiOutlinePaperAirplane className="h-4 w-4" />
                            Enviar BB Sandbox
                          </button>
                        )}
                        <button type="button" className="btn btn-outline" onClick={() => runBatchAction('sync-bb', (id) => sincronizarPaymentBatchStatusBb(id))} disabled={!canAudit || !isBbSandbox || !['ENVIADO_AO_BANCO', 'PROCESSANDO_BANCO', 'FALHA_INTEGRACAO', 'AGUARDANDO_CONFIRMACAO_BAIXA'].includes(selectedBatch.status) || actionLoading === 'sync-bb'}>
                          <HiOutlineArrowPath className="h-4 w-4" />
                          Sincronizar BB
                        </button>
                        <button type="button" className="btn btn-outline" onClick={handleReprocessBatch} disabled={!canReprocess || !['FALHA_INTEGRACAO', 'REJEITADO', 'PARCIALMENTE_REJEITADO'].includes(selectedBatch.status) || !mfaCode || actionLoading === 'reprocessar'}>
                          <HiOutlineArrowPath className="h-4 w-4" />
                          Reprocessar
                        </button>
                        {!isBbSandbox && (
                          <>
                            <button type="button" className="btn btn-outline" onClick={() => handleMockBankReturn('CONFIRMADO')} disabled={!canSend || !['ENVIADO_AO_BANCO', 'PROCESSANDO_BANCO'].includes(selectedBatch.status) || !mfaCode || actionLoading === 'retorno'}>
                              Confirmar banco com MFA
                            </button>
                            <button type="button" className="btn btn-outline" onClick={() => handleMockBankReturn('FALHA')} disabled={!canSend || !['ENVIADO_AO_BANCO', 'PROCESSANDO_BANCO'].includes(selectedBatch.status) || !mfaCode || actionLoading === 'falha-mock'}>
                              Falha mock com MFA
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="app-note">
                      Modo BB: {isBbSandbox ? 'sandbox real habilitado' : 'mock ativo'}
                      {isBbSandbox && (
                        <> - {bbHealth?.baseURL || 'URL sandbox nao informada'} - certificado {bbHealth?.certificateConfigured ? 'configurado' : 'pendente'}</>
                      )}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--c-text)]">Aprovacoes</h3>
                        <div className="mt-2 app-list-stack">
                          {(selectedBatch.approvals || []).length === 0 ? (
                            <div className="app-note">Nenhuma aprovacao registrada.</div>
                          ) : selectedBatch.approvals.map((approval) => (
                            <div key={approval.id} className="app-list-card text-sm">
                              <div className="flex justify-between gap-3">
                                <span>{approval.acao} por usuario #{approval.aprovado_por}</span>
                                <span className={statusClass(approval.status)}>{approval.status}</span>
                              </div>
                              <div className="text-xs text-[var(--c-muted)]">{formatDateTime(approval.aprovado_em || approval.createdAt)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--c-text)]">Tentativas tecnicas</h3>
                        <div className="mt-2 app-list-stack">
                          {(bbTransactions.length ? bbTransactions : selectedBatch.transactions || []).length === 0 ? (
                            <div className="app-note">Nenhuma tentativa registrada.</div>
                          ) : (bbTransactions.length ? bbTransactions : selectedBatch.transactions || []).map((transaction) => (
                            <div key={transaction.id} className="app-list-card text-sm">
                              <div className="flex justify-between gap-3">
                                <span>{transaction.provider_batch_id || transaction.correlation_id}</span>
                                <span className={statusClass(transaction.status)}>{transaction.status}</span>
                              </div>
                              <div className="text-xs text-[var(--c-muted)]">HTTP {transaction.http_status || '-'} - {formatDateTime(transaction.finished_at)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="text-xs uppercase text-[var(--c-muted)]">
                          <tr>
                            <th className="px-3 py-2">Item</th>
                            <th className="px-3 py-2">Titulo</th>
                            <th className="px-3 py-2">Favorecido</th>
                            <th className="px-3 py-2 text-right">Valor</th>
                            <th className="px-3 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(selectedBatch.items || []).map((item) => (
                            <tr key={item.id}>
                              <td className="px-3 py-3">{item.sequencia}</td>
                              <td className="px-3 py-3">{getTituloCodigo(item.intent?.titulo)}</td>
                              <td className="px-3 py-3">
                                {item.intent?.beneficiary?.nome || '-'}
                                <div className="text-xs text-[var(--c-muted)]">{item.intent?.beneficiary?.pix_chave || '-'}</div>
                              </td>
                              <td className="px-3 py-3 text-right font-medium">{formatCurrency(item.valor)}</td>
                              <td className="px-3 py-3"><span className={statusClass(item.status)}>{item.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'baixas' && (
            <section className="card sol-surface-card">
              {awaitingBaixa.length === 0 ? (
                <div className="app-empty-card">Nenhum pagamento confirmado pelo banco aguardando baixa.</div>
              ) : (
                <div className="app-list-stack">
                  {awaitingBaixa.map((intent) => (
                    <div key={intent.id} className="app-list-card">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-medium text-[var(--c-text)]">
                            {getTituloCodigo(intent.titulo)} - {formatCurrency(intent.valor)}
                          </div>
                          <div className="text-sm text-[var(--c-muted)]">
                            Confirmado pelo banco em {formatDateTime(intent.confirmado_banco_em)}
                          </div>
                          <div className="mt-1 text-xs text-[var(--c-muted)]">
                            Empresa: {getTituloEmpresaLabel(intent.titulo)} - Conta: {getAccountLabel(intent.paymentAccount)}
                          </div>
                          <div className="text-xs text-[var(--c-muted)]">
                            Favorecido: {intent.beneficiary?.nome || 'Favorecido pendente'} {intent.beneficiary?.pix_chave ? `- ${intent.beneficiary.pix_chave}` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleConfirmBaixa(intent.id)}
                          disabled={!canConfirmBaixa || actionLoading === `baixa-${intent.id}`}
                        >
                          <HiOutlineCheckCircle className="h-4 w-4" />
                          {actionLoading === `baixa-${intent.id}` ? 'Confirmando...' : 'Confirmar baixa'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'auditoria' && canAudit && (
            <section className="space-y-4">
              <div className="card sol-surface-card">
                <div className="sol-filtros-head">
                  <div>
                    <p className="sol-filtros-title">Eventos tecnicos</p>
                    <p className="sol-filtros-subtitle">Consulta para investigar provider, webhook, polling e respostas bancarias sem acionar baixa financeira.</p>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
                  <label className="sol-filter-field xl:col-span-2">
                    <span className="sol-filter-label">Status</span>
                    <select className="input w-full" value={eventFilters.status} onChange={(e) => setEventFilters((c) => ({ ...c, status: e.target.value }))}>
                      <option value="">Todos</option>
                      {PAYMENT_EVENT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">Tipo de evento</span>
                    <select className="input w-full" value={eventFilters.event_type} onChange={(e) => setEventFilters((c) => ({ ...c, event_type: e.target.value }))}>
                      <option value="">Todos</option>
                      {PAYMENT_EVENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                  <label className="sol-filter-field xl:col-span-3">
                    <span className="sol-filter-label">ID evento provedor</span>
                    <input className="input w-full" value={eventFilters.provider_event_id} onChange={(e) => setEventFilters((c) => ({ ...c, provider_event_id: e.target.value }))} />
                  </label>
                  <label className="sol-filter-field xl:col-span-1">
                    <span className="sol-filter-label">Lote</span>
                    <input className="input w-full" inputMode="numeric" value={eventFilters.payment_batch_id} onChange={(e) => setEventFilters((c) => ({ ...c, payment_batch_id: e.target.value }))} />
                  </label>
                  <label className="sol-filter-field xl:col-span-1">
                    <span className="sol-filter-label">Intent</span>
                    <input className="input w-full" inputMode="numeric" value={eventFilters.payment_intent_id} onChange={(e) => setEventFilters((c) => ({ ...c, payment_intent_id: e.target.value }))} />
                  </label>
                  <label className="sol-filter-field xl:col-span-1">
                    <span className="sol-filter-label">Limite</span>
                    <input className="input w-full" inputMode="numeric" value={eventFilters.limit} onChange={(e) => setEventFilters((c) => ({ ...c, limit: e.target.value }))} />
                  </label>
                  <label className="sol-filter-field xl:col-span-2">
                    <span className="sol-filter-label">Recebido de</span>
                    <input className="input w-full" type="date" value={eventFilters.data_inicio} onChange={(e) => setEventFilters((c) => ({ ...c, data_inicio: e.target.value }))} />
                  </label>
                  <label className="sol-filter-field xl:col-span-2">
                    <span className="sol-filter-label">Recebido ate</span>
                    <input className="input w-full" type="date" value={eventFilters.data_fim} onChange={(e) => setEventFilters((c) => ({ ...c, data_fim: e.target.value }))} />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary" onClick={loadPaymentEvents} disabled={actionLoading === 'eventos'}>
                    <HiOutlineArrowPath className="h-4 w-4" />
                    {actionLoading === 'eventos' ? 'Consultando...' : 'Consultar eventos'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setEventFilters({
                        status: '',
                        event_type: '',
                        provider_event_id: '',
                        payment_batch_id: '',
                        payment_intent_id: '',
                        data_inicio: '',
                        data_fim: '',
                        limit: '50'
                      });
                    }}
                  >
                    Limpar
                  </button>
                  <span className="app-status-pill bg-slate-100 text-slate-700">{paymentEvents.length} evento(s)</span>
                </div>
              </div>

              <div className="card sol-surface-card">
                {paymentEvents.length === 0 ? (
                  <div className="app-empty-card">Nenhum evento tecnico encontrado para os filtros atuais.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-xs uppercase text-[var(--c-muted)]">
                        <tr>
                          <th className="px-3 py-2">Recebido</th>
                          <th className="px-3 py-2">Evento</th>
                          <th className="px-3 py-2">Provider</th>
                          <th className="px-3 py-2">Referencia</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Resumo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paymentEvents.map((event) => (
                          <tr key={event.id}>
                            <td className="px-3 py-3 whitespace-nowrap">{formatDateTime(event.received_at)}</td>
                            <td className="px-3 py-3">
                              <span className="font-medium text-[var(--c-text)]">{event.event_type}</span>
                              <div className="text-xs text-[var(--c-muted)]">Evento #{event.id}</div>
                            </td>
                            <td className="px-3 py-3">
                              {event.provider?.codigo || `Provider #${event.provider_id}`}
                              <div className="text-xs text-[var(--c-muted)]">{event.provider?.ambiente || '-'}</div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="font-medium text-[var(--c-text)]">{event.provider_event_id || '-'}</div>
                              <div className="text-xs text-[var(--c-muted)]">
                                {event.batch ? `Lote ${event.batch.codigo}` : event.payment_batch_id ? `Lote #${event.payment_batch_id}` : 'Sem lote'}
                                {event.intent ? ` - Intent #${event.intent.id}` : event.payment_intent_id ? ` - Intent #${event.payment_intent_id}` : ''}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className={statusClass(event.processing_status)}>{event.processing_status}</span>
                              {event.processing_error && <div className="mt-1 text-xs text-rose-700">{event.processing_error}</div>}
                            </td>
                            <td className="px-3 py-3 max-w-xl text-[var(--c-muted)]">{getEventPayloadSummary(event)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
