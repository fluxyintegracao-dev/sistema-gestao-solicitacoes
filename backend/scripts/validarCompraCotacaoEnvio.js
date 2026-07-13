const assert = require('assert');

const { validateCompraEnviarBody } = require('../src/validators/operationalValidators');

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

validarItensPorFornecedor();
validarItensGlobaisLegados();

console.log('Validacao do envio de cotacao concluida com sucesso.');
