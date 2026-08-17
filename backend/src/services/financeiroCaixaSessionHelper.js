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
  const valorConfigurado = conta?.exige_abertura_fechamento;
  const exigeAberturaFechamento = valorConfigurado === true ||
    Number(valorConfigurado) === 1 ||
    String(valorConfigurado || '').trim().toLowerCase() === 'true';

  return exigeAberturaFechamento ||
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
    if (!sessao.empresa_id) {
      throw createHttpError(
        400,
        `O caixa aberto da conta ${conta.nome || conta.id} nao possui empresa vinculada. Feche e reabra o caixa apos corrigir a conta financeira.`
      );
    }
    if (conta.empresa_id && Number(sessao.empresa_id) !== Number(conta.empresa_id)) {
      throw createHttpError(
        400,
        `O caixa aberto da conta ${conta.nome || conta.id} esta vinculado a empresa diferente da conta financeira. Reabra o caixa apos corrigir o cadastro.`
      );
    }
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
