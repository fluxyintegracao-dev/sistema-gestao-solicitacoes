const {
  Historico,
  PedidoCompra,
  PedidoCompraFrete,
  PedidoCompraFreteRateio,
  PedidoCompraItem,
  SolicitacaoCompraAlocacao,
  SolicitacaoCompraFornecedor,
  sequelize
} = require('../src/models');
const { registrarLogSolicitacaoCompra } = require('../src/services/comprasCotacao');
const { sincronizarTotaisFretePedido } = require('../src/services/pedidoCompraTotaisService');
const { calcularRateiosMonetarios } = require('../src/services/pedidoCompraService');

function parseArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function asNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  return Number(asNumber(value).toFixed(2));
}

function isGlobal(value) {
  return String(value || '').trim().toUpperCase() === 'GLOBAL';
}

async function carregarCorrecao(pedidoId, transaction) {
  const pedido = await PedidoCompra.findByPk(pedidoId, { transaction });
  if (!pedido) throw new Error(`Pedido ${pedidoId} nao encontrado.`);

  const frete = await PedidoCompraFrete.findOne({
    where: { pedido_compra_id: pedido.id },
    order: [['id', 'ASC']],
    transaction,
    lock: transaction?.LOCK.UPDATE
  });
  if (!frete?.origem_cotacao_fornecedor_id) {
    throw new Error('O pedido nao possui frete originado em cotacao para corrigir.');
  }
  if (frete.titulo_financeiro_id || ['TITULO_GERADO', 'CANCELADO'].includes(String(frete.status_financeiro || '').toUpperCase())) {
    throw new Error('O frete possui titulo financeiro ou esta cancelado; nao pode ser corrigido por esta rotina.');
  }

  const cotacao = await SolicitacaoCompraFornecedor.findByPk(frete.origem_cotacao_fornecedor_id, {
    transaction,
    lock: transaction?.LOCK.UPDATE
  });
  if (!cotacao || !isGlobal(cotacao.frete_modo)) {
    throw new Error('Esta rotina aceita apenas frete global originado em cotacao.');
  }
  const freteCotado = roundMoney(cotacao.frete_valor);
  if (freteCotado <= 0) throw new Error('A cotacao nao possui frete global positivo para aplicar.');

  const itens = await PedidoCompraItem.findAll({
    where: { pedido_compra_id: pedido.id, removido: false },
    order: [['id', 'ASC']],
    transaction,
    lock: transaction?.LOCK.UPDATE
  });
  if (!itens.length) throw new Error('O pedido nao possui itens ativos para ratear o frete.');

  const alocacoes = await SolicitacaoCompraAlocacao.findAll({
    where: { pedido_compra_id: pedido.id, status: 'ATIVA' },
    order: [['id', 'ASC']],
    transaction,
    lock: transaction?.LOCK.UPDATE
  });
  const alocacaoPorItem = new Map(alocacoes.map((alocacao) => [Number(alocacao.pedido_compra_item_id), alocacao]));
  if (alocacoes.length !== itens.length || itens.some((item) => !alocacaoPorItem.has(Number(item.id)))) {
    throw new Error('O pedido possui alocacoes divergentes; esta rotina so corrige pedidos com uma alocacao ativa por item.');
  }

  const bases = itens.map((item) => roundMoney(item.valor_mercadoria || item.valor_total));
  if (roundMoney(bases.reduce((total, valor) => total + valor, 0)) <= 0) {
    throw new Error('Os itens ativos nao possuem base monetaria para ratear o frete.');
  }
  const rateios = calcularRateiosMonetarios(freteCotado, bases, { limitarAoTotalBase: false });
  return { pedido, frete, cotacao, itens, alocacaoPorItem, freteCotado, rateios };
}

async function executar() {
  const pedidoId = Number(parseArgument('--pedido-id') || 0);
  const usuarioId = Number(parseArgument('--usuario-id') || 0);
  const aplicar = process.argv.includes('--apply');
  if (!pedidoId) throw new Error('Informe --pedido-id.');
  if (aplicar && !usuarioId) throw new Error('Informe --usuario-id para registrar a correcao na auditoria.');

  await sequelize.authenticate();
  try {
    const resultado = await sequelize.transaction(async (transaction) => {
      const dados = await carregarCorrecao(pedidoId, transaction);
      const resumo = {
        pedido_id: dados.pedido.id,
        frete_id: dados.frete.id,
        cotacao_fornecedor_id: dados.cotacao.id,
        frete_anterior: roundMoney(dados.frete.valor_total),
        frete_corrigido: dados.freteCotado,
        rateios: dados.itens.map((item, index) => ({
          pedido_compra_item_id: item.id,
          descricao: item.descricao,
          base: roundMoney(item.valor_mercadoria || item.valor_total),
          frete_anterior: roundMoney(item.frete_rateado),
          frete_corrigido: dados.rateios[index]
        }))
      };
      if (!aplicar) return resumo;

      await dados.frete.update({ valor_total: dados.freteCotado }, { transaction });
      await PedidoCompraFreteRateio.destroy({ where: { frete_id: dados.frete.id }, transaction });
      await PedidoCompraFreteRateio.bulkCreate(
        dados.itens.map((item, index) => ({
          frete_id: dados.frete.id,
          pedido_compra_id: dados.pedido.id,
          pedido_compra_item_id: item.id,
          solicitacao_compra_item_id: item.solicitacao_compra_item_id || null,
          solicitacao_compra_item_manual_id: item.solicitacao_compra_item_manual_id || null,
          obra_id: dados.pedido.obra_id || null,
          valor_item_base: roundMoney(item.valor_mercadoria || item.valor_total),
          percentual_rateio: Number(((dados.rateios[index] / dados.freteCotado) * 100).toFixed(6)),
          valor_rateado: dados.rateios[index],
          manual: false
        })),
        { transaction }
      );

      for (const [index, item] of dados.itens.entries()) {
        await item.update({ frete_rateado: dados.rateios[index] }, { transaction });
      }
      for (const [index, item] of dados.itens.entries()) {
        await dados.alocacaoPorItem.get(Number(item.id)).update(
          { frete_rateado: dados.rateios[index] },
          { transaction }
        );
      }
      await sincronizarTotaisFretePedido(dados.pedido.id, transaction);

      await registrarLogSolicitacaoCompra({
        solicitacaoCompraId: dados.pedido.solicitacao_compra_id,
        usuarioId,
        fornecedorCompraId: dados.pedido.fornecedor_compra_id,
        tipoAcao: 'FRETE_PEDIDO_CORRIGIDO_RATEIO_GLOBAL',
        descricao: `Frete global da cotacao corrigido no pedido PC-${String(dados.pedido.id).padStart(5, '0')}`,
        metadados: resumo,
        transaction
      });
      if (dados.frete.solicitacao_id) {
        await Historico.create({
          solicitacao_id: dados.frete.solicitacao_id,
          usuario_responsavel_id: usuarioId,
          setor: 'COMPRAS',
          acao: 'FRETE_PEDIDO_CORRIGIDO_RATEIO_GLOBAL',
          observacao: `Frete global corrigido de R$ ${resumo.frete_anterior.toFixed(2)} para R$ ${resumo.frete_corrigido.toFixed(2)} no pedido PC-${String(dados.pedido.id).padStart(5, '0')}.`,
          descricao: 'Correcao auditavel do teto indevido no rateio de frete global.',
          metadata: JSON.stringify(resumo)
        }, { transaction });
      }
      return resumo;
    });
    console.log(JSON.stringify({ aplicado: aplicar, ...resultado }, null, 2));
  } finally {
    await sequelize.close();
  }
}

executar().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
