const {
  MovimentoFinanceiro,
  PaymentAccount,
  PaymentIntent,
  PaymentReconciliation,
  TituloFinanceiro,
  sequelize
} = require('../models');
const { registrarEventoSeguranca } = require('./securityLogService');

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function calcularStatusTitulo({ valorOriginal, valorBaixado }) {
  const saldo = roundCurrency(valorOriginal - valorBaixado);
  if (saldo <= 0) {
    return { status: 'QUITADO', valor_saldo: 0 };
  }
  return { status: 'PARCIAL', valor_saldo: saldo };
}

async function listPaymentsAwaitingBaixaConfirmation(req) {
  return PaymentIntent.findAll({
    where: { status: 'AGUARDANDO_CONFIRMACAO_BAIXA' },
    include: [
      { model: TituloFinanceiro, as: 'titulo' },
      { model: PaymentAccount, as: 'paymentAccount' }
    ],
    order: [['confirmado_banco_em', 'ASC'], ['id', 'ASC']]
  });
}

async function confirmBaixaFromPaymentIntent(req, id, payload = {}) {
  return sequelize.transaction(async (transaction) => {
    const intent = await PaymentIntent.findByPk(id, {
      include: [{ model: PaymentAccount, as: 'paymentAccount' }],
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!intent) throw createHttpError(404, 'Intencao de pagamento nao encontrada.');
    if (String(intent.status || '').toUpperCase() !== 'AGUARDANDO_CONFIRMACAO_BAIXA') {
      throw createHttpError(400, 'Pagamento nao esta aguardando confirmacao de baixa.');
    }

    const existing = await PaymentReconciliation.findOne({
      where: { payment_intent_id: intent.id },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (existing?.movimento_financeiro_id) {
      throw createHttpError(409, 'Pagamento ja possui baixa vinculada.');
    }

    const titulo = await TituloFinanceiro.findByPk(intent.titulo_financeiro_id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!titulo) throw createHttpError(404, 'Titulo financeiro nao encontrado.');
    if (!['ABERTO', 'PARCIAL'].includes(String(titulo.status || '').toUpperCase())) {
      throw createHttpError(400, 'Titulo nao permite baixa neste status.');
    }

    const valorBaixa = roundCurrency(intent.valor);
    const saldoAtual = roundCurrency(titulo.valor_saldo);
    if (valorBaixa <= 0 || valorBaixa > saldoAtual) {
      throw createHttpError(400, 'Valor do pagamento incompativel com saldo do titulo.');
    }

    const dataMovimento = payload.data_movimento || today();
    const novoValorBaixado = roundCurrency(Number(titulo.valor_baixado || 0) + valorBaixa);
    const novoEstado = calcularStatusTitulo({
      valorOriginal: Number(titulo.valor_original || 0),
      valorBaixado: novoValorBaixado
    });

    const movimento = await MovimentoFinanceiro.create({
      titulo_financeiro_id: titulo.id,
      conta_bancaria_id: intent.paymentAccount?.conta_bancaria_id || null,
      forma_recebimento: 'PIX',
      documento_referencia: intent.correlation_id,
      tipo_movimento: 'BAIXA',
      status: 'ATIVO',
      valor: valorBaixa,
      juros: 0,
      multa: 0,
      desconto: 0,
      valor_quitacao: valorBaixa,
      data_movimento: dataMovimento,
      observacoes: payload.observacoes || 'Baixa confirmada a partir de pagamento bancario mockado.',
      criado_por: req.user?.id || null
    }, { transaction });

    await titulo.update({
      valor_baixado: novoValorBaixado,
      valor_saldo: novoEstado.valor_saldo,
      status: novoEstado.status,
      data_quitacao: novoEstado.status === 'QUITADO' ? dataMovimento : null,
      atualizado_por: req.user?.id || null
    }, { transaction });

    await intent.update({
      status: 'BAIXADO',
      baixa_confirmada_em: new Date(),
      baixa_confirmada_por: req.user?.id || null,
      updated_by: req.user?.id || null
    }, { transaction });

    await PaymentReconciliation.create({
      payment_intent_id: intent.id,
      movimento_financeiro_id: movimento.id,
      conciliacao_bancaria_id: null,
      status: 'BAIXADO',
      matched_by: 'MANUAL_FINANCEIRO',
      matched_at: new Date(),
      created_by: req.user?.id || null
    }, { transaction });

    await registrarEventoSeguranca({
      req,
      usuarioId: req.user?.id || null,
      tipoEvento: 'PAYMENT_INTENT_BAIXA_CONFIRMED',
      recursoTipo: 'PAYMENT_INTENT',
      recursoId: intent.id,
      status: 'SUCCESS',
      descricao: 'Baixa semiautomatica confirmada',
      metadata: { titulo_financeiro_id: titulo.id, movimento_financeiro_id: movimento.id }
    });

    return { intent, titulo, movimento };
  });
}

module.exports = {
  confirmBaixaFromPaymentIntent,
  listPaymentsAwaitingBaixaConfirmation
};
