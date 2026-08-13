'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendRoot, '..');

function read(relativePath) {
  return fs.readFileSync(path.resolve(repoRoot, relativePath), 'utf8');
}

function includesAll(source, markers, label) {
  markers.forEach((marker) => {
    assert(source.includes(marker), `${label}: marcador ausente: ${marker}`);
  });
}

function run() {
  const migration = read('backend/migrations/202608130001_compra_direta_frete.js');
  const model = read('backend/src/models/SolicitacaoCompra.js');
  const associations = read('backend/src/models/index.js');
  const validator = read('backend/src/validators/operationalValidators.js');
  const controller = read('backend/src/controllers/SolicitacaoCompraController.js');
  const solicitacaoController = read('backend/src/controllers/SolicitacaoController.js');
  const novaCompra = read('frontend/src/modules/solicitacao-compra/pages/NovaSolicitacaoCompra.jsx');
  const revisao = read('frontend/src/modules/solicitacao-compra/pages/RevisarSolicitacaoCompra.jsx');
  const financeiro = read('frontend/src/pages/SolicitacaoDetalhe/FinanceiroCard.jsx');

  const campos = [
    'frete_tipo',
    'frete_valor',
    'frete_data_vencimento',
    'frete_parceiro_id',
    'frete_dados_pagamento'
  ];
  includesAll(migration, campos, 'migration');
  includesAll(model, campos, 'model');
  includesAll(validator, campos, 'validator');
  includesAll(controller, campos, 'controller');
  includesAll(solicitacaoController, campos, 'detalhe da solicitacao');
  assert(associations.includes("as: 'freteCredor'"), 'Associacao do credor do frete ausente.');

  includesAll(controller, [
    "['SEM_FRETE', 'EMBUTIDO', 'TERCEIRO']",
    "freteTipoCompraDireta === 'TERCEIRO' ? freteValorCompraDireta : 0",
    "freteTipoCompraDireta !== 'SEM_FRETE' && freteValorCompraDireta <= 0",
    'Selecione um credor ativo para o frete pago a terceiro.',
    'Informe os dados para pagamento do frete.',
    'Informe a data de vencimento da compra direta.',
    'isFormaPagamentoFopag',
    'FOPAG nao esta disponivel para solicitacoes de compra.'
  ], 'regras backend');

  includesAll(novaCompra, [
    'Condições comerciais e comprovantes',
    'Embutido',
    'Pago a terceiro',
    'Credor do frete *',
    'Dados para pagamento do frete *',
    'Comprovantes da Despesa',
    'resumoFormasPagamento',
    'formaPagamentoEhFopag',
    'Informe um valor maior que zero para o frete embutido.',
    'Informe a data de vencimento.'
  ], 'formulario');
  includesAll(revisao, ['Credor do frete', 'Valor total da solicitação'], 'revisao');
  includesAll(financeiro, [
    'getFreteTerceiroCompraDireta',
    'freteTerceiro.freteCredor',
    'Frete pago a terceiro. Dados para pagamento',
    'freteTerceiroObrigatorio',
    'Obrigatorio para separar a compra do frete pago ao terceiro.'
  ], 'financeiro');

  console.log('Validacao da Compra Direta com frete concluida com sucesso.');
}

run();
