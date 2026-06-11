const { getBankAccountsSnapshot } = require('../adapters/bankAccountsAdapter');
const { getBbPaymentsSnapshot } = require('../adapters/bbPaymentsAdapter');
const { getCaixaBoletosSnapshot } = require('../adapters/caixaBoletosAdapter');
const { getFinancingSnapshot } = require('../adapters/financingAdapter');
const { getMovementsSnapshot } = require('../adapters/movementsAdapter');
const { getReconciliationSnapshot } = require('../adapters/reconciliationAdapter');
const { serializeError, toNumber } = require('./bankingUtils');
const { getCnab240PaymentSpec } = require('./cnab240PaymentSpecService');

async function safeLoad(source, loader) {
  try {
    const data = await loader();
    return { ok: true, source, data };
  } catch (error) {
    return { ok: false, source, error: serializeError(error) };
  }
}

function addAlert(alerts, severity, title, description, source, value = null) {
  alerts.push({ severity, title, description, source, value });
}

function buildAlerts(snapshots) {
  const alerts = [];
  const accounts = snapshots.accounts?.data;
  const reconciliation = snapshots.reconciliation?.data;
  const bbPayments = snapshots.bbPayments?.data;
  const caixaBoletos = snapshots.caixaBoletos?.data;
  const financing = snapshots.financing?.data;

  if (accounts?.totals?.without_company) {
    addAlert(
      alerts,
      'WARNING',
      'Contas sem empresa vinculada',
      'Conta bancaria sem empresa impede leitura institucional correta por empresa do grupo.',
      'BANK_ACCOUNTS',
      accounts.totals.without_company
    );
  }

  if (reconciliation?.totals?.pending) {
    addAlert(
      alerts,
      'ACTION',
      'Conciliacoes pendentes',
      'Existem lancamentos bancarios aguardando conciliacao ou decisao operacional.',
      'OFX_RECONCILIATION',
      reconciliation.totals.pending
    );
  }

  if (bbPayments?.totals?.batches_failed) {
    addAlert(
      alerts,
      'CRITICAL',
      'Falhas em lotes bancarios',
      'Ha lotes BB com falha/rejeicao que exigem correcao ou reprocessamento.',
      'BANCO_DO_BRASIL_PAYMENTS',
      bbPayments.totals.batches_failed
    );
  }

  if (bbPayments?.totals?.awaiting_baixa) {
    addAlert(
      alerts,
      'ACTION',
      'Pagamentos aguardando baixa',
      'Pagamentos confirmados pelo fluxo bancario aguardam baixa semiautomatica pelo financeiro.',
      'BANCO_DO_BRASIL_PAYMENTS',
      bbPayments.totals.awaiting_baixa
    );
  }

  if (caixaBoletos?.totals?.ocorrencias_pendentes) {
    addAlert(
      alerts,
      'ACTION',
      'Ocorrencias Caixa pendentes',
      'Retornos CNAB Caixa possuem ocorrencias pendentes de aplicacao ou revisao.',
      'CAIXA_BOLETOS_CNAB240',
      caixaBoletos.totals.ocorrencias_pendentes
    );
  }

  if (caixaBoletos?.totals?.ocorrencias_erro) {
    addAlert(
      alerts,
      'CRITICAL',
      'Ocorrencias Caixa com erro',
      'Retornos CNAB Caixa possuem ocorrencias com erro de aplicacao.',
      'CAIXA_BOLETOS_CNAB240',
      caixaBoletos.totals.ocorrencias_erro
    );
  }

  if (financing?.totals?.draft) {
    addAlert(
      alerts,
      'INFO',
      'Financiamentos em rascunho',
      'Ha financiamentos bancarios criados ainda nao ativados.',
      'BANK_FINANCING',
      financing.totals.draft
    );
  }

  Object.values(snapshots)
    .filter((snapshot) => snapshot && !snapshot.ok)
    .forEach((snapshot) => {
      addAlert(alerts, 'CRITICAL', `Origem indisponivel: ${snapshot.source}`, snapshot.error.message, snapshot.source);
    });

  return alerts;
}

function buildTimeline(snapshots) {
  const timeline = [];

  (snapshots.bbPayments?.data?.recent_batches || []).forEach((item) => {
    timeline.push({
      source: 'BANCO_DO_BRASIL_PAYMENTS',
      type: 'PAYMENT_BATCH',
      id: item.id,
      label: item.codigo,
      status: item.status,
      amount: toNumber(item.valor_total),
      occurred_at: item.updatedAt || item.createdAt
    });
  });

  (snapshots.caixaBoletos?.data?.remessas?.recent || []).forEach((item) => {
    timeline.push({
      source: 'CAIXA_BOLETOS_CNAB240',
      type: 'BOLETO_REMESSA',
      id: item.id,
      label: item.nome_arquivo,
      status: item.status,
      amount: toNumber(item.valor_total),
      occurred_at: item.gerado_em || item.createdAt
    });
  });

  (snapshots.caixaBoletos?.data?.retornos?.recent || []).forEach((item) => {
    timeline.push({
      source: 'CAIXA_BOLETOS_CNAB240',
      type: 'BOLETO_RETORNO',
      id: item.id,
      label: item.nome_arquivo,
      status: item.status,
      amount: toNumber(item.valor_liquidado),
      occurred_at: item.processado_em || item.createdAt
    });
  });

  (snapshots.reconciliation?.data?.recent || []).forEach((item) => {
    timeline.push({
      source: 'OFX_RECONCILIATION',
      type: 'BANK_STATEMENT_MOVEMENT',
      id: item.id,
      label: item.descricao_banco || item.documento || `Conciliacao #${item.id}`,
      status: item.status,
      amount: toNumber(item.valor),
      occurred_at: item.updatedAt || item.createdAt
    });
  });

  return timeline
    .filter((item) => item.occurred_at)
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, 24);
}

async function getBankingDashboard() {
  const results = await Promise.all([
    safeLoad('accounts', getBankAccountsSnapshot),
    safeLoad('reconciliation', getReconciliationSnapshot),
    safeLoad('bbPayments', getBbPaymentsSnapshot),
    safeLoad('caixaBoletos', getCaixaBoletosSnapshot),
    safeLoad('financing', getFinancingSnapshot),
    safeLoad('movements', getMovementsSnapshot)
  ]);

  const snapshots = results.reduce((acc, item) => {
    acc[item.source] = item;
    return acc;
  }, {});

  const alerts = buildAlerts(snapshots);
  const timeline = buildTimeline(snapshots);

  return {
    generated_at: new Date().toISOString(),
    status: alerts.some((item) => item.severity === 'CRITICAL') ? 'ATTENTION' : 'OK',
    alerts,
    summary: {
      accounts: snapshots.accounts?.data?.totals || {},
      reconciliation: snapshots.reconciliation?.data?.totals || {},
      bb_payments: snapshots.bbPayments?.data?.totals || {},
      caixa_boletos: snapshots.caixaBoletos?.data?.totals || {},
      financing: snapshots.financing?.data?.totals || {},
      movements: snapshots.movements?.data?.totals || {}
    },
    snapshots: {
      accounts: snapshots.accounts,
      reconciliation: snapshots.reconciliation,
      bb_payments: snapshots.bbPayments,
      caixa_boletos: snapshots.caixaBoletos,
      financing: snapshots.financing,
      movements: snapshots.movements
    },
    timeline,
    cnab240_payments: getCnab240PaymentSpec()
  };
}

module.exports = {
  getBankingDashboard
};
