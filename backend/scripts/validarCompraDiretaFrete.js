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
    "freteTipoCompraDireta !== 'SEM_FRETE' ? freteValorCompraDireta : 0",
    "freteTipoCompraDireta === 'EMBUTIDO' ? freteValorCompraDireta : 0",
    'valorTotalFornecedorCompraDireta',
    "freteTipoCompraDireta !== 'SEM_FRETE' && freteValorCompraDireta <= 0",
    'Selecione um credor ativo para o frete pago a terceiro.',
    'Informe os dados para pagamento do frete.',
    'Informe a data de vencimento da compra direta.',
    'isFormaPagamentoFopag',
    'FOPAG nao esta disponivel para solicitacoes de compra.'
  ], 'regras backend');
  assert(
    controller.includes("arredondarMoeda(valorTotalCompraDireta + (freteTipoCompraDireta !== 'SEM_FRETE' ? freteValorCompraDireta : 0))"),
    'Backend deve somar qualquer frete informado ao total da compra direta.'
  );
  assert(
    controller.includes("arredondarMoeda(valorTotalCompraDireta + (freteTipoCompraDireta === 'EMBUTIDO' ? freteValorCompraDireta : 0))"),
    'Backend deve somar somente o frete embutido ao valor devido ao credor principal.'
  );
  assert(
    controller.includes('valor_fechado: compraDireta ? valorTotalFornecedorCompraDireta : 0'),
    'Compra direta deve persistir em valor_fechado o total devido ao credor principal.'
  );

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
  assert(
    novaCompra.includes("valorTotalCompraDireta + (freteTipo !== 'SEM_FRETE' ? freteValorNumero : 0)"),
    'Formulario deve somar frete embutido ou de terceiro ao total da compra direta.'
  );
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
