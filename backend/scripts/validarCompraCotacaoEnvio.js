const assert = require('assert');

const {
  validateCompraCotacaoRespostaInternaBody,
  validateCompraEncerrarBody,
  validateCompraEnviarBody
} = require('../src/validators/operationalValidators');

function itemSelecionado() {
  return {
    item_tipo: 'CADASTRADO',
    item_referencia_id: 71,
    item_key: 'CADASTRADO:71',
    solicitacao_compra_item_id: 71
  };
}

function validarItensPorFornecedor() {
  const payload = {
    fornecedores: [
      { fornecedor_id: 1, itens: [itemSelecionado()] },
      { parceiro_id: 2258, itens: [itemSelecionado()] }
    ]
  };

  const primeiraValidacao = validateCompraEnviarBody(payload);
  const segundaValidacao = validateCompraEnviarBody(primeiraValidacao);

  assert.strictEqual(Object.hasOwn(primeiraValidacao, 'itens'), false);
  assert.strictEqual(Object.hasOwn(segundaValidacao, 'itens'), false);
  assert.strictEqual(segundaValidacao.fornecedores.length, 2);
  assert.strictEqual(segundaValidacao.fornecedores[0].itens.length, 1);
  assert.strictEqual(segundaValidacao.fornecedores[1].itens.length, 1);
  assert.strictEqual(segundaValidacao.fornecedores[0].itens[0].item_referencia_id, 71);
}

function validarItensGlobaisLegados() {
  const payload = {
    fornecedores: [{ fornecedor_id: 1 }],
    itens: [itemSelecionado()]
  };

  const primeiraValidacao = validateCompraEnviarBody(payload);
  const segundaValidacao = validateCompraEnviarBody(primeiraValidacao);

  assert.strictEqual(segundaValidacao.itens.length, 1);
  assert.strictEqual(segundaValidacao.itens[0].item_referencia_id, 71);
}

function validarFechamentoParcial() {
  const resultado = validateCompraEncerrarBody({
    alocacoes: [{ resposta_item_id: 10, quantidade_alocada: '8,235' }],
    fechamento_parcial_confirmado: true,
    justificativa: 'Entrega parcial priorizada pela obra.'
  });

  assert.strictEqual(resultado.fechamento_parcial_confirmado, true);
  assert.strictEqual(resultado.justificativa, 'Entrega parcial priorizada pela obra.');
  assert.strictEqual(resultado.vencedores[0].quantidade_alocada, 8.235);
}

function validarDataChegadaRespostaInterna() {
  const resultado = validateCompraCotacaoRespostaInternaBody({
    itens: [{
      item_tipo: 'CADASTRADO',
      item_referencia_id: 71,
      status_disponibilidade: 'PARA_CHEGAR',
      preco: '28,84',
      data_chegada: '2026-07-30'
    }],
    finalizar: true
  });

  assert.strictEqual(resultado.itens[0].data_chegada, '2026-07-30');
  assert.strictEqual(resultado.itens[0].status_disponibilidade, 'PARA_CHEGAR');
}

validarItensPorFornecedor();
validarItensGlobaisLegados();
validarFechamentoParcial();
validarDataChegadaRespostaInterna();

console.log('Validacao do envio de cotacao concluida com sucesso.');
