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

function validarFechamentoExcedenteAuditavel() {
  const resultado = validateCompraEncerrarBody({
    alocacoes: [{ resposta_item_id: 10, quantidade_alocada: '12,500' }],
    fechamento_excedente_confirmado: true,
    justificativa_excedente: 'Compra adicional para reduzir uma nova rodada de cotacao.'
  });

  assert.strictEqual(resultado.fechamento_excedente_confirmado, true);
  assert.strictEqual(
    resultado.justificativa_excedente,
    'Compra adicional para reduzir uma nova rodada de cotacao.'
  );
  assert.strictEqual(resultado.vencedores[0].quantidade_alocada, 12.5);
}

function validarPrazoGeralRespostaInterna() {
  const resultado = validateCompraCotacaoRespostaInternaBody({
    itens: [{
      item_tipo: 'CADASTRADO',
      item_referencia_id: 71,
      status_disponibilidade: 'DISPONIVEL',
      preco: '28,84',
      quantidade_disponivel: '25,500',
      ipi_valor: '12,34',
      icms_valor: '45,67',
      st_valor: '8,90'
    }],
    prazo_entrega_dias: 7,
    prazo_entrega_tipo: 'DIAS_UTEIS',
    difal_valor: '21,00',
    frete_tipo: 'TERCEIRO',
    frete_valor: '150,00',
    frete_data_vencimento: '2026-08-10',
    frete_transportador_nome: 'Transportador opcional',
    frete_transportador_cpf_cnpj: '12.345.678/0001-90',
    finalizar: true
  });

  assert.strictEqual(resultado.itens[0].status_disponibilidade, 'DISPONIVEL');
  assert.strictEqual(resultado.itens[0].quantidade_disponivel, 25.5);
  assert.strictEqual(resultado.itens[0].ipi_valor, 12.34);
  assert.strictEqual(resultado.itens[0].icms_valor, 45.67);
  assert.strictEqual(resultado.itens[0].st_valor, 8.9);
  assert.strictEqual(resultado.prazo_entrega_dias, 7);
  assert.strictEqual(resultado.prazo_entrega_tipo, 'DIAS_UTEIS');
  assert.strictEqual(resultado.difal_valor, 21);
  assert.strictEqual(resultado.frete_tipo, 'TERCEIRO');
  assert.strictEqual(resultado.frete_valor, 150);
  assert.strictEqual(resultado.frete_data_vencimento, '2026-08-10');
}

function validarCompatibilidadeDataChegadaLegada() {
  const resultado = validateCompraCotacaoRespostaInternaBody({
    itens: [{
      item_tipo: 'CADASTRADO',
      item_referencia_id: 71,
      status_disponibilidade: 'PARA_CHEGAR',
      preco: '28,84',
      quantidade_disponivel: '25,500',
      data_chegada: '2026-07-30'
    }],
    finalizar: false
  });

  assert.strictEqual(resultado.itens[0].data_chegada, '2026-07-30');
}

validarItensPorFornecedor();
validarItensGlobaisLegados();
validarFechamentoParcial();
validarFechamentoExcedenteAuditavel();
validarPrazoGeralRespostaInterna();
validarCompatibilidadeDataChegadaLegada();

console.log('Validacao do envio de cotacao concluida com sucesso.');
