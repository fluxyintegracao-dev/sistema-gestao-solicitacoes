const assert = require('assert');

const {
  validateCompraCotacaoRespostaInternaBody,
  validateCompraEncerrarBody,
  validateCompraEncerrarSemPedidoBody,
  validateCompraEnviarBody
} = require('../src/validators/operationalValidators');
const { ALL_PERMISSION_KEYS } = require('../src/constants/moduloPermissoes');
const {
  calcularDisponibilidadeFornecedorItem,
  calcularNovaDisponibilidadeLiberada,
  montarMapaAlocacoesAtivasPorFornecedorItem,
  montarMapaAlocacoesAtivasPorItem
} = require('../src/services/comprasDisponibilidadeService');

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

function validarEncerramentoSemPedido() {
  const resultado = validateCompraEncerrarSemPedidoBody({
    confirmado: true,
    justificativa: 'O saldo restante nao sera mais necessario para a obra.'
  });

  assert.strictEqual(resultado.confirmado, true);
  assert.strictEqual(
    resultado.justificativa,
    'O saldo restante nao sera mais necessario para a obra.'
  );
  assert.throws(
    () => validateCompraEncerrarSemPedidoBody({ confirmado: false, justificativa: 'Motivo suficientemente detalhado.' }),
    /Confirme que o saldo restante nao sera comprado/
  );
  assert.throws(
    () => validateCompraEncerrarSemPedidoBody({ confirmado: true, justificativa: 'Curto' }),
    /ao menos 10 caracteres/
  );
}

function validarPermissaoEncerramentoSemPedido() {
  assert.strictEqual(ALL_PERMISSION_KEYS.has('compras.cotacoes.encerrar_sem_pedido'), true);
  assert.strictEqual(ALL_PERMISSION_KEYS.size, 275);
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

function validarDisponibilidadeHistoricaPorFornecedorItem() {
  const item = {
    item_tipo: 'CADASTRADO',
    item_referencia_id: 71
  };
  const alocacoes = [
    {
      fornecedor_compra_id: 10,
      item_tipo: 'CADASTRADO',
      solicitacao_compra_item_id: 71,
      quantidade_alocada: 10,
      status: 'ATIVA'
    },
    {
      fornecedor_compra_id: 10,
      item_tipo: 'CADASTRADO',
      solicitacao_compra_item_id: 71,
      quantidade_alocada: 3,
      status: 'CANCELADA'
    }
  ];
  const mapaFornecedorItem = montarMapaAlocacoesAtivasPorFornecedorItem(alocacoes);
  const mapaItem = montarMapaAlocacoesAtivasPorItem(alocacoes);

  const mesmoFornecedorAposEdicao = calcularDisponibilidadeFornecedorItem({
    fornecedorCompraId: 10,
    item,
    quantidadeDisponivel: 20,
    mapaAlocacoesFornecedorItem: mapaFornecedorItem
  });
  const outroFornecedor = calcularDisponibilidadeFornecedorItem({
    fornecedorCompraId: 11,
    item,
    quantidadeDisponivel: 8,
    mapaAlocacoesFornecedorItem: mapaFornecedorItem
  });

  assert.strictEqual(mesmoFornecedorAposEdicao.quantidade_alocada, 10);
  assert.strictEqual(mesmoFornecedorAposEdicao.saldo_disponivel, 10);
  assert.strictEqual(outroFornecedor.quantidade_alocada, 0);
  assert.strictEqual(outroFornecedor.saldo_disponivel, 8);
  assert.strictEqual(mapaItem.get('CADASTRADO:71'), 10);

  const novaDisponibilidade = calcularNovaDisponibilidadeLiberada({
    fornecedorCompraId: 10,
    respostasAnteriores: [{ ...item, quantidade_disponivel: 10 }],
    respostasNovas: [{ ...item, quantidade_disponivel: 20 }],
    mapaAlocacoesFornecedorItem: mapaFornecedorItem
  });
  const semAumento = calcularNovaDisponibilidadeLiberada({
    fornecedorCompraId: 10,
    respostasAnteriores: [{ ...item, quantidade_disponivel: 20 }],
    respostasNovas: [{ ...item, quantidade_disponivel: 20 }],
    mapaAlocacoesFornecedorItem: mapaFornecedorItem
  });

  assert.strictEqual(novaDisponibilidade.quantidade_liberada_total, 10);
  assert.strictEqual(novaDisponibilidade.itens[0].disponibilidade_anterior, 0);
  assert.strictEqual(novaDisponibilidade.itens[0].disponibilidade_nova, 10);
  assert.strictEqual(semAumento.quantidade_liberada_total, 0);
}

validarItensPorFornecedor();
validarItensGlobaisLegados();
validarFechamentoParcial();
validarFechamentoExcedenteAuditavel();
validarEncerramentoSemPedido();
validarPermissaoEncerramentoSemPedido();
validarPrazoGeralRespostaInterna();
validarCompatibilidadeDataChegadaLegada();
validarDisponibilidadeHistoricaPorFornecedorItem();

console.log('Validacao do envio de cotacao concluida com sucesso.');
