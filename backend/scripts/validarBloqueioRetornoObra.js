'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  assertTituloDisponivelParaBaixa,
  ehPedidoObraParaSolicitacaoNoFinanceiro,
  tituloEstaBloqueado
} = require('../src/services/tituloBloqueioRetornoObraPolicy');

const backendRoot = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.resolve(backendRoot, relativePath), 'utf8');

assert.equal(ehPedidoObraParaSolicitacaoNoFinanceiro({
  setor_solicitante: 'OBRA',
  setor_atual_pedido: 'FINANCEIRO'
}), true, 'OBRA pedindo retorno ao FINANCEIRO deve bloquear');
assert.equal(ehPedidoObraParaSolicitacaoNoFinanceiro({
  setor_solicitante: 'GERENCIA DE PROCESSOS',
  setor_atual_pedido: 'FINANCEIRO'
}), false, 'outros setores nao devem acionar o bloqueio da Obra');
assert.equal(ehPedidoObraParaSolicitacaoNoFinanceiro({
  setor_solicitante: 'OBRA',
  setor_atual_pedido: 'JURIDICO'
}), false, 'retorno solicitado fora do Financeiro nao deve bloquear titulos');

assert.equal(tituloEstaBloqueado({ bloqueado_retorno_obra: 1 }), true);
assert.doesNotThrow(() => assertTituloDisponivelParaBaixa({ bloqueado_retorno_obra: false }));
assert.throws(
  () => assertTituloDisponivelParaBaixa({ bloqueado_retorno_obra: true }),
  (error) => error.statusCode === 409 && error.code === 'TITULO_BLOQUEADO_RETORNO_OBRA'
);

const retornoSource = read('src/services/solicitacaoRetornoService.js');
assert(retornoSource.includes('bloquearTitulosVinculados({'), 'pedido de retorno nao gera bloqueio financeiro');
assert(retornoSource.includes('sincronizarAposEncerramentoPedido({'), 'rejeicao/cancelamento nao libera o bloqueio');

const tituloSource = read('src/services/tituloFinanceiroService.js');
assert(tituloSource.includes('assertTituloDisponivelParaBaixa(titulo);'), 'baixa manual nao consulta o bloqueio');

const paymentSource = read('src/services/paymentBatchIntegrityService.js');
assert(paymentSource.includes('assertTituloDisponivelParaBaixa(titulo);'), 'lote bancario nao consulta o bloqueio');

const modelSource = read('src/models/TituloFinanceiro.js');
assert(modelSource.includes("titulo.changed('valor_baixado')"), 'modelo nao possui defesa contra baixa por rota alternativa');

const frontendSource = read('../frontend/src/pages/FinanceiroTitulos.jsx');
assert(frontendSource.includes('Retorno solicitado pela Obra'), 'consulta financeira nao identifica titulo bloqueado');
assert(frontendSource.includes('!isTituloBloqueadoRetornoObra(titulo)'), 'consulta financeira ainda permite selecionar titulo bloqueado');

console.log('Validacao do bloqueio financeiro por retorno solicitado pela Obra concluida com sucesso.');
