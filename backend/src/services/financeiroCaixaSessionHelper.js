const { CaixaFinanceiroSessao, ContaBancaria } = require('../models');

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function contaExigeSessao(conta) {
  return Boolean(conta?.exige_abertura_fechamento) ||
    String(conta?.tipo_operacional || '').toUpperCase() === 'CAIXA_INTERNO';
}

async function carregarContaBancaria(contaBancariaId, { transaction = null } = {}) {
  const id = Number(contaBancariaId || 0);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, 'Conta financeira invalida.');
  }

  const conta = await ContaBancaria.findByPk(id, { transaction });
  if (!conta || conta.ativo === false) {
    throw createHttpError(400, 'Conta financeira invalida ou inativa.');
  }
  return conta;
}

async function obterSessaoAbertaParaConta(contaOrId, dataMovimento = today(), { transaction = null, exigir = false } = {}) {
  const conta = typeof contaOrId === 'object' && contaOrId !== null
    ? contaOrId
    : await carregarContaBancaria(contaOrId, { transaction });

  const sessao = await CaixaFinanceiroSessao.findOne({
    where: {
      conta_bancaria_id: conta.id,
      status: 'ABERTO'
    },
    order: [['data_abertura', 'DESC'], ['id', 'DESC']],
    transaction,
    lock: transaction?.LOCK?.UPDATE
  });

  if (sessao && String(sessao.data_abertura || '') <= String(dataMovimento || today())) {
    return sessao;
  }

  if (exigir || contaExigeSessao(conta)) {
    throw createHttpError(
      400,
      `Abra o caixa da conta ${conta.nome || conta.id} antes de registrar movimentacoes nessa data.`
    );
  }

  return null;
}

module.exports = {
  carregarContaBancaria,
  contaExigeSessao,
  obterSessaoAbertaParaConta
};
