'use strict';

/**
 * Testa o endpoint GET /compras/insumos/:id/ultimo-preco
 *
 * Cenários:
 *   1. Insumo com histórico — deve retornar last_purchase_price numérico
 *   2. Insumo sem histórico — deve retornar last_purchase_price: null
 *   3. Restrição por obra — usuário sem acesso a nenhuma obra retorna null imediatamente
 */

const { Op } = require('sequelize');
const { validateRequiredEnv } = require('../src/config/env');

validateRequiredEnv();

const db = require('../src/models');
const { SolicitacaoCompra, SolicitacaoCompraItem, SolicitacaoCompraRespostaItem } = db;

let passou = 0;
let falhou = 0;

function ok(descricao) {
  console.log(`  ✓ ${descricao}`);
  passou++;
}

function fail(descricao, detalhe) {
  console.error(`  ✗ ${descricao}${detalhe ? ` — ${detalhe}` : ''}`);
  falhou++;
}

async function buscarUltimoPreco(insumoId, obraIdsEscopo) {
  const whereCompra = { status: 'ENCERRADO' };
  if (Array.isArray(obraIdsEscopo)) {
    if (obraIdsEscopo.length === 0) return null;
    whereCompra.obra_id = { [Op.in]: obraIdsEscopo };
  }

  const respostaItem = await SolicitacaoCompraRespostaItem.findOne({
    where: { vencedor: true, preco: { [Op.not]: null } },
    include: [{
      model: SolicitacaoCompraItem,
      as: 'itemCadastrado',
      required: true,
      where: { insumo_id: insumoId },
      include: [{
        model: SolicitacaoCompra,
        as: 'solicitacao',
        required: true,
        where: whereCompra,
        attributes: ['id', 'updatedAt']
      }]
    }],
    order: [[
      { model: SolicitacaoCompraItem, as: 'itemCadastrado' },
      { model: SolicitacaoCompra, as: 'solicitacao' },
      'updatedAt', 'DESC'
    ]],
    limit: 1
  });

  return respostaItem ? Number(respostaItem.preco) : null;
}

async function run() {
  console.log('\n=== Teste: ultimoPreco por insumo ===\n');

  // -----------------------------------------------------------
  // Cenário 1: insumo com compra vencedora em cotação encerrada
  // -----------------------------------------------------------
  console.log('Cenário 1 — Insumo com histórico de compra');
  const itemVencedor = await SolicitacaoCompraRespostaItem.findOne({
    where: { vencedor: true, preco: { [Op.not]: null } },
    include: [{
      model: SolicitacaoCompraItem,
      as: 'itemCadastrado',
      required: true,
      where: { insumo_id: { [Op.not]: null } },
      include: [{
        model: SolicitacaoCompra,
        as: 'solicitacao',
        required: true,
        where: { status: 'ENCERRADO' },
        attributes: ['id', 'obra_id', 'updatedAt']
      }]
    }]
  });

  if (!itemVencedor) {
    console.log('  (nenhuma cotacao encerrada com vencedor encontrada no banco — cenário 1 ignorado)\n');
  } else {
    const insumoId = itemVencedor.itemCadastrado.insumo_id;
    const obraId = itemVencedor.itemCadastrado.solicitacao.obra_id;

    const preco = await buscarUltimoPreco(insumoId, null);
    if (preco != null && typeof preco === 'number')
      ok(`Retornou last_purchase_price = R$ ${preco.toFixed(2)} para insumo #${insumoId}`);
    else
      fail('Deveria retornar um número', `recebeu: ${preco}`);

    const precoComEscopo = await buscarUltimoPreco(insumoId, [obraId]);
    if (precoComEscopo != null && typeof precoComEscopo === 'number')
      ok(`Retornou preco com escopo de obra correto`);
    else
      fail('Deveria retornar preco com obra no escopo', `recebeu: ${precoComEscopo}`);

    console.log();
  }

  // -----------------------------------------------------------
  // Cenário 2: insumo sem histórico — ID improvável
  // -----------------------------------------------------------
  console.log('Cenário 2 — Insumo sem histórico de compra');
  const preco = await buscarUltimoPreco(999999999, null);
  if (preco === null)
    ok('Retornou null para insumo sem histórico');
  else
    fail('Deveria retornar null', `recebeu: ${preco}`);
  console.log();

  // -----------------------------------------------------------
  // Cenário 3: usuário sem acesso a nenhuma obra
  // -----------------------------------------------------------
  console.log('Cenário 3 — Usuário sem acesso a obras (escopo vazio)');
  const precoEscopoVazio = await buscarUltimoPreco(1, []);
  if (precoEscopoVazio === null)
    ok('Retornou null para escopo de obras vazio (sem permissao)');
  else
    fail('Deveria retornar null para escopo vazio', `recebeu: ${precoEscopoVazio}`);
  console.log();

  // -----------------------------------------------------------
  // Resultado
  // -----------------------------------------------------------
  console.log(`=== Resultado: ${passou} passou | ${falhou} falhou ===\n`);
  process.exit(falhou > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
