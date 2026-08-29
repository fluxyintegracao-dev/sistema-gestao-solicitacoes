const { Op } = require('sequelize');
const {
  Contrato,
  Historico,
  Solicitacao,
  TituloFinanceiro
} = require('../models');

const STATUS_SOLICITACAO_PAGA = 'PAGA';
const STATUS_SOLICITACAO_PAGAMENTO_PARCIAL = 'PARCIALMENTE PAGO';
const STATUS_SOLICITACAO_PAGAMENTO_PARCIAL_LEGADO = 'PAGAMENTO PARCIAL';
const STATUS_SOLICITACAO_TITULO_CADASTRADO = 'TITULO_CADASTRADO';
const STATUS_TITULOS_IGNORADOS = ['CANCELADO', 'CANCELADA', 'ESTORNADO', 'EXCLUIDO'];

function normalizarStatus(value) {
  return String(value || '').trim().toUpperCase();
}

function roundCurrency(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function tituloQuitado(titulo) {
  const status = normalizarStatus(titulo?.status);
  if (['QUITADO', 'BAIXADO', 'PAGO', 'PAGA', 'CONCILIADO'].includes(status)) return true;
  return roundCurrency(titulo?.valor_saldo) <= 0 && roundCurrency(titulo?.valor_baixado) > 0;
}

function tituloComBaixa(titulo) {
  const status = normalizarStatus(titulo?.status);
  if (['PARCIAL', 'QUITADO', 'BAIXADO', 'PAGO', 'PAGA', 'CONCILIADO'].includes(status)) return true;
  return roundCurrency(titulo?.valor_baixado) > 0;
}

function calcularStatusSolicitacaoPorTitulos(titulos = [], statusAtual = null) {
  const titulosValidos = titulos.filter((titulo) => !STATUS_TITULOS_IGNORADOS.includes(normalizarStatus(titulo?.status)));
  if (titulosValidos.length === 0) return null;

  if (titulosValidos.every(tituloQuitado)) {
    return STATUS_SOLICITACAO_PAGA;
  }

  if (titulosValidos.some(tituloComBaixa)) {
    return STATUS_SOLICITACAO_PAGAMENTO_PARCIAL;
  }

  const statusAtualNormalizado = normalizarStatus(statusAtual).replace(/_/g, ' ');
  if ([STATUS_SOLICITACAO_PAGA, STATUS_SOLICITACAO_PAGAMENTO_PARCIAL, STATUS_SOLICITACAO_PAGAMENTO_PARCIAL_LEGADO].includes(statusAtualNormalizado)) {
    return STATUS_SOLICITACAO_TITULO_CADASTRADO;
  }

  return null;
}

async function sincronizarStatusSolicitacaoPorBaixaTitulos({
  solicitacaoId,
  usuarioId = null,
  setor = null,
  transaction = null,
  observacao = null
} = {}) {
  const id = Number(solicitacaoId || 0);
  if (!Number.isInteger(id) || id <= 0) return null;

  const solicitacao = await Solicitacao.findByPk(id, {
    attributes: ['id', 'status_global', 'area_responsavel'],
    transaction,
    lock: transaction?.LOCK?.UPDATE
  });
  if (!solicitacao) return null;

  const titulos = await TituloFinanceiro.findAll({
    where: {
      solicitacao_id: id,
      status: { [Op.notIn]: STATUS_TITULOS_IGNORADOS }
    },
    attributes: ['id', 'status', 'valor_saldo', 'valor_baixado'],
    transaction,
    lock: transaction?.LOCK?.UPDATE
  });

  // DESVIO PARA A SOLICITACAO DE CONTRATO DO FLUXO NOVO (20/08).
  //
  // Ela nao segue a regra geral: e uma solicitacao so para o contrato inteiro, e o cliente definiu
  // NEC. DE MEDICAO / APROVADA / PAGA em vez de PARCIALMENTE PAGO. Ver
  // `medicaoContratoService.calcularStatusDaSolicitacaoDoContrato`.
  //
  // O desvio mora AQUI, e nao numa segunda funcao, porque esta e chamada por CINCO caminhos de
  // baixa (pagamento, cheque, boleto, fatura de cartao, conciliacao). Uma funcao paralela seria
  // esquecida em pelo menos um deles, e o status do contrato divergiria conforme a forma de pagar.
  const contratoDoFluxoNovo = await Contrato.findOne({
    where: { solicitacao_id: id, fluxo_novo: true },
    attributes: ['id'],
    transaction
  });
  if (contratoDoFluxoNovo) {
    const { sincronizarStatusDaSolicitacaoDoContrato } = require('./medicaoContratoService');
    return sincronizarStatusDaSolicitacaoDoContrato(
      contratoDoFluxoNovo.id,
      { usuarioId, setor, motivo: observacao || 'Status atualizado apos baixa de titulo do contrato.' },
      transaction
    );
  }

  // Recarga de cartao encerra pelo valor efetivamente pago. Um titulo PARCIAL nao pode continuar
  // com saldo em aberto porque o ciclo da recarga terminou; o valor solicitado original permanece
  // na extensao auditavel do fluxo e a prestacao cobra somente o que efetivamente saiu do caixa.
  const { sincronizarCicloAposBaixa } = require('./recargaCartaoService');
  const statusRecarga = await sincronizarCicloAposBaixa({
    solicitacaoId: id,
    usuarioId,
    setor,
    transaction
  });
  if (statusRecarga) return statusRecarga;

  const statusAnterior = solicitacao.status_global || null;
  const statusNovo = calcularStatusSolicitacaoPorTitulos(titulos, statusAnterior);
  if (!statusNovo || normalizarStatus(statusAnterior) === normalizarStatus(statusNovo)) {
    return statusAnterior;
  }

  await solicitacao.update(
    { status_global: statusNovo },
    { transaction }
  );

  await Historico.create(
    {
      solicitacao_id: solicitacao.id,
      usuario_responsavel_id: usuarioId || null,
      setor: setor || solicitacao.area_responsavel || 'FINANCEIRO',
      acao: 'STATUS_ALTERADO',
      status_anterior: statusAnterior,
      status_novo: statusNovo,
      observacao: observacao || 'Status atualizado automaticamente apos baixa de titulo financeiro.'
    },
    { transaction }
  );

  return statusNovo;
}

module.exports = {
  STATUS_SOLICITACAO_PAGA,
  STATUS_SOLICITACAO_PAGAMENTO_PARCIAL,
  sincronizarStatusSolicitacaoPorBaixaTitulos
};
