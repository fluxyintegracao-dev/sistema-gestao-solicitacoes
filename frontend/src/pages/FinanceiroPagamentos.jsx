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
  { id: 'baixas', label: 'Confirmar baixa' }
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

function getTituloCodigo(titulo) {
  return titulo?.codigo || `#${titulo?.id}`;
}

function getBeneficiaryLabel(titulo) {
  const beneficiary = titulo?.favorecido_pagamento;
  if (!beneficiary) return 'Sem favorecido';
  return `${beneficiary.nome || 'Favorecido'} - ${beneficiary.pix_tipo_chave || 'PIX'} ${beneficiary.pix_chave || ''}`;
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
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      setBatches(Array.isArray(batchesData) ? batchesData : []);
      setAwaitingBaixa(Array.isArray(baixaData) ? baixaData : []);
      setBbHealth(bbHealthData);
      setBatchForm((current) => ({
        ...current,
        payment_account_id: current.payment_account_id || String(accountsData?.[0]?.id || '')
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
      const data = await getPaymentEligibleTitulos(compactFilters(filters));
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

  async function refreshAfterAction(batchId = selectedBatch?.id) {
    await loadBase();
    if (batchId) await loadBatch(batchId);
  }

  useEffect(() => {
    loadBase();
  }, []);

  const selectedTotal = useMemo(() => {
    const selected = new Set(selectedIds.map(String));
    return titulos.reduce((acc, titulo) => selected.has(String(titulo.id)) ? acc + Number(titulo.valor_saldo || 0) : acc, 0);
  }, [selectedIds, titulos]);

  const validApprovals = useMemo(() => (
    Array.isArray(selectedBatch?.approvals)
      ? selectedBatch.approvals.filter((approval) => approval.acao === 'APPROVE' && approval.status === 'APROVADO')
      : []
  ), [selectedBatch]);

  function toggleTitulo(id) {
    setSelectedIds((current) => (
      current.map(String).includes(String(id))
        ? current.filter((item) => String(item) !== String(id))
        : [...current, id]
    ));
  }

  async function handleCriarLote() {
    try {
      if (!selectedIds.length) {
        setError('Selecione ao menos um titulo elegivel.');
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
    const justificativa = window.prompt('Informe o motivo do cancelamento do lote:');
    if (justificativa === null) return;
    runBatchAction('cancelar', (id) => cancelarPaymentBatch(id, {
      justificativa: justificativa.trim() || 'Cancelado pela operacao financeira.'
    }));
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
              <span className={bbHealth?.sandboxRealEnabled ? 'app-status-pill bg-emerald-100 text-emerald-700' : 'app-status-pill bg-slate-100 text-slate-700'}>
                {bbHealth?.sandboxRealEnabled ? 'BB SANDBOX' : 'MOCK'}
              </span>
              <Link to="/financeiro/titulos" className="btn btn-outline">Titulos</Link>
              <Link to="/financeiro/cadastros" className="btn btn-outline">Cadastros</Link>
            </div>
        </div>
      </div>

      {error && <div className="app-alert app-alert--error">{error}</div>}

      <div className="solicitacoes-toolbar">
        <div className="finance-category-toggle-group" role="tablist" aria-label="Navegacao de pagamentos">
          {TABS.map((tab) => (
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
                    <select className="input w-full" value={batchForm.payment_account_id} onChange={(e) => setBatchForm((c) => ({ ...c, payment_account_id: e.target.value }))}>
                      <option value="">Selecione</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.contaBancaria?.nome || `Conta ${account.id}`} - CNPJ {account.cnpj_pagador} - Conv. {account.convenio || '-'}
                        </option>
                      ))}
                    </select>
                    <span className="app-note mt-2">
                      Cadastre em Financeiro &gt; Cadastros Financeiros &gt; Contas pagadoras BB.
                    </span>
                  </label>
                  <label className="sol-filter-field xl:col-span-2">
                    <span className="sol-filter-label">Data pagamento</span>
                    <input className="input w-full" type="date" value={batchForm.data_programada} onChange={(e) => setBatchForm((c) => ({ ...c, data_programada: e.target.value }))} />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="btn btn-primary" onClick={loadTitulos} disabled={!canPrepare || actionLoading === 'titulos'}>
                    <HiOutlineClock className="h-4 w-4" />
                    {actionLoading === 'titulos' ? 'Buscando...' : 'Buscar elegiveis'}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={handleCriarLote} disabled={!canPrepare || !selectedIds.length || !batchForm.payment_account_id || actionLoading === 'criar-lote'}>
                    <HiOutlineBanknotes className="h-4 w-4" />
                    {actionLoading === 'criar-lote' ? 'Gerando...' : `Gerar lote (${selectedIds.length})`}
                  </button>
                  <span className="app-status-pill bg-slate-100 text-slate-700">{formatCurrency(selectedTotal)}</span>
                </div>
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
                        {titulos.map((titulo) => (
                          <tr key={titulo.id} className={titulo.elegivel_pagamento ? '' : 'bg-amber-50/50'}>
                            <td className="px-3 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.map(String).includes(String(titulo.id))}
                                disabled={!titulo.elegivel_pagamento}
                                onChange={() => toggleTitulo(titulo.id)}
                              />
                            </td>
                            <td className="px-3 py-3">
                              <Link to={`/financeiro/titulos/${titulo.id}`} className="font-medium text-[var(--c-primary)]">
                                {getTituloCodigo(titulo)}
                              </Link>
                              <div className="text-xs text-[var(--c-muted)]">{titulo.numero_documento || 'Sem documento'}</div>
                            </td>
                            <td className="px-3 py-3">{titulo.parceiro?.nome || '-'}</td>
                            <td className="px-3 py-3">{getBeneficiaryLabel(titulo)}</td>
                            <td className="px-3 py-3">{formatDate(titulo.data_vencimento)}</td>
                            <td className="px-3 py-3 text-right font-medium">{formatCurrency(titulo.valor_saldo)}</td>
                            <td className="px-3 py-3">
                              {titulo.elegivel_pagamento ? (
                                <span className="app-status-pill bg-emerald-100 text-emerald-700">ELEGIVEL</span>
                              ) : (
                                <span className="text-xs text-amber-700">{(titulo.pendencias_pagamento || []).join(' ')}</span>
                              )}
                            </td>
                          </tr>
                        ))}
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
                        <button type="button" className="btn btn-outline" onClick={() => runBatchAction('rejeitar', (id) => rejeitarPaymentBatch(id, { justificativa: 'Rejeitado pela operacao financeira.' }))} disabled={!canApprove || !['PENDENTE_APROVACAO', 'APROVADO'].includes(selectedBatch.status) || actionLoading === 'rejeitar'}>
                          <HiOutlineXCircle className="h-4 w-4" />
                          Rejeitar
                        </button>
                        <button type="button" className="btn btn-outline" onClick={handleCancelBatch} disabled={!canCancel || !['RASCUNHO', 'EM_REVISAO', 'PENDENTE_APROVACAO', 'APROVADO'].includes(selectedBatch.status) || actionLoading === 'cancelar'}>
                          <HiOutlineXCircle className="h-4 w-4" />
                          Cancelar
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => runBatchAction('enviar', (id) => enviarPaymentBatchBanco(id, { codigo_mfa: mfaCode }))} disabled={!canSend || selectedBatch.status !== 'APROVADO' || !mfaCode || actionLoading === 'enviar'}>
                          <HiOutlinePaperAirplane className="h-4 w-4" />
                          Enviar mock
                        </button>
                        {bbHealth?.sandboxRealEnabled && (
                          <button type="button" className="btn btn-primary" onClick={() => runBatchAction('enviar-bb', (id) => enviarPaymentBatchBbSandbox(id, { codigo_mfa: mfaCode }))} disabled={!canSend || selectedBatch.status !== 'APROVADO' || !mfaCode || actionLoading === 'enviar-bb'}>
                            <HiOutlinePaperAirplane className="h-4 w-4" />
                            Enviar BB Sandbox
                          </button>
                        )}
                        <button type="button" className="btn btn-outline" onClick={() => runBatchAction('sync-bb', (id) => sincronizarPaymentBatchStatusBb(id))} disabled={!canAudit || !bbHealth?.sandboxRealEnabled || !['ENVIADO_AO_BANCO', 'PROCESSANDO_BANCO', 'FALHA_INTEGRACAO', 'AGUARDANDO_CONFIRMACAO_BAIXA'].includes(selectedBatch.status) || actionLoading === 'sync-bb'}>
                          <HiOutlineArrowPath className="h-4 w-4" />
                          Sincronizar BB
                        </button>
                        <button type="button" className="btn btn-outline" onClick={handleReprocessBatch} disabled={!canReprocess || !['FALHA_INTEGRACAO', 'REJEITADO', 'PARCIALMENTE_REJEITADO'].includes(selectedBatch.status) || !mfaCode || actionLoading === 'reprocessar'}>
                          <HiOutlineArrowPath className="h-4 w-4" />
                          Reprocessar
                        </button>
                        <button type="button" className="btn btn-outline" onClick={() => runBatchAction('retorno', (id) => simularRetornoPaymentBatch(id, { resultado: 'CONFIRMADO' }))} disabled={!canSend || !['ENVIADO_AO_BANCO', 'PROCESSANDO_BANCO'].includes(selectedBatch.status) || actionLoading === 'retorno'}>
                          Confirmar banco
                        </button>
                        <button type="button" className="btn btn-outline" onClick={() => runBatchAction('falha-mock', (id) => simularRetornoPaymentBatch(id, { resultado: 'FALHA' }))} disabled={!canSend || !['ENVIADO_AO_BANCO', 'PROCESSANDO_BANCO'].includes(selectedBatch.status) || actionLoading === 'falha-mock'}>
                          Falha mock
                        </button>
                      </div>
                    </div>

                    <div className="app-note">
                      Modo BB: {bbHealth?.sandboxRealEnabled ? 'sandbox real habilitado' : 'mock ativo'}
                      {bbHealth?.sandboxRealEnabled && (
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
        </>
      )}
    </div>
  );
}
