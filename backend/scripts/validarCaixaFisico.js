'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  validateFinanceCaixaMovimentoBody,
  validateFinanceCaixaMovimentoEstornoBody,
  validateFinanceCaixaMovimentoParams
} = require('../src/validators/financialValidators');

const backendRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(backendRoot, '..');

function readBackend(relativePath) {
  return fs.readFileSync(path.join(backendRoot, relativePath), 'utf8');
}

function readRepository(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

function validatePayloads() {
  const movimento = validateFinanceCaixaMovimentoBody({
    natureza: 'ENTRADA',
    data_movimento: '2026-08-16',
    valor: 150.75,
    descricao: 'Recebimento em dinheiro',
    documento_referencia: 'REC-001'
  });
  assert.strictEqual(movimento.natureza, 'ENTRADA');
  assert.strictEqual(movimento.valor, 150.75);

  const params = validateFinanceCaixaMovimentoParams({ id: '12', movimentoId: '34' });
  assert.deepStrictEqual(params, { id: 12, movimentoId: 34 });
  assert.strictEqual(
    validateFinanceCaixaMovimentoEstornoBody({ motivo: 'Lancamento duplicado' }).motivo,
    'Lancamento duplicado'
  );

  assert.throws(
    () => validateFinanceCaixaMovimentoBody({ natureza: 'AJUSTE', valor: 1 }),
    /Natureza/
  );
  assert.throws(
    () => validateFinanceCaixaMovimentoBody({ natureza: 'ENTRADA', valor: 1, campo_extra: true }),
    /nao permitidos|não permitidos/i
  );
}

function validateBackendContracts() {
  const service = readBackend('src/services/caixaFinanceiroService.js');
  const routes = readBackend('src/routes.js');
  const controller = readBackend('src/controllers/CaixaFinanceiroController.js');

  [
    "=== 'CAIXA_INTERNO'",
    'CAIXA_ENTRADA_MANUAL',
    'CAIXA_SAIDA_MANUAL',
    'sequelize.transaction',
    'lock: transaction.LOCK.UPDATE',
    'Informe uma justificativa com pelo menos 10 caracteres',
    'Somente lancamentos manuais podem ser estornados',
    'FINANCIAL_CASH_MOVEMENT_CREATED',
    'FINANCIAL_CASH_MOVEMENT_REVERSED'
  ].forEach((contract) => assert(service.includes(contract), `Regra do caixa fisico ausente: ${contract}`));

  assert(service.includes('if (!contaEhCaixaFisico(conta))'), 'Caixa fisico deve ignorar a trava de conciliacao OFX na abertura.');
  assert(service.includes('movimentoWhereVinculadoSessao'), 'Movimentos novos devem usar o vinculo canonico com a sessao do caixa.');
  assert(service.includes('movimentoWhereLegadoSessao'), 'Movimentos antigos devem manter compatibilidade por conta e periodo.');
  assert(service.includes('model: TituloFinanceiro.unscoped()'), 'Livro do caixa deve ignorar o escopo de exclusao logica do titulo opcional.');
  assert(service.includes("as: 'titulo',") && service.includes('required: false'), 'Titulo e usuario devem ser associacoes opcionais no livro do caixa.');
  assert(service.includes('const resumoAnterior = await calcularResumoSessao'), 'Movimento manual deve partir do resumo bloqueado da sessao.');
  assert(service.includes('detalheAtualizado = await montarDetalheSessaoCaixa(sessaoAudit.id);'), 'Livro do caixa deve ser recarregado somente depois do commit do movimento.');
  assert(!service.includes("Nenhum lancamento foi mantido"), 'Releitura de apresentacao nao deve provocar rollback de um INSERT valido.');
  assert(service.includes("...sessao.get({ plain: true })"), 'Detalhe do caixa deve ser serializado explicitamente para o frontend.');
  assert(service.includes('total_entradas: totalEntradas'), 'Resumo persistido deve acompanhar atomicamente o movimento criado.');
  assert(routes.includes("'/financeiro/caixas/:id/movimentos'"), 'Rota de movimento manual ausente.');
  assert(routes.includes("'/financeiro/caixas/:id/movimentos/:movimentoId/estornar'"), 'Rota de estorno manual ausente.');
  assert(routes.includes('criticalRateLimit'), 'Rotas criticas do caixa devem manter rate limit.');
  assert(controller.includes('registrarMovimentoCaixa'), 'Controller de movimento manual ausente.');
  assert(controller.includes('estornarMovimentoCaixa'), 'Controller de estorno manual ausente.');
}

function validateFrontendContracts() {
  const page = readRepository('frontend/src/pages/FinanceiroCaixas.jsx');
  const api = readRepository('frontend/src/services/financeiro.js');

  [
    'Caixas e Contas',
    'Abrir caixa',
    'Registrar entrada ou saída',
    'Livro do caixa',
    'Conferir e fechar caixa',
    'Divergências ficam registradas com justificativa',
    'overflow-x-auto'
  ].forEach((contract) => assert(page.includes(contract), `Contrato de interface ausente: ${contract}`));

  assert(page.includes("tipo_operacional || '').toUpperCase() === 'CAIXA_INTERNO'"), 'Interface deve distinguir caixa fisico de conta bancaria.');
  assert(api.includes('registrarMovimentoCaixaFinanceiro'), 'Cliente da API de movimento manual ausente.');
  assert(api.includes('estornarMovimentoCaixaFinanceiro'), 'Cliente da API de estorno manual ausente.');
}

function validateDocumentation() {
  const doc = readRepository('docs/modulos/financeiro/CAIXA_FISICO_ABERTURA_FECHAMENTO.md');
  assert(doc.includes('nao depende da conciliacao OFX'), 'Documentacao deve registrar a independencia do OFX.');
  assert(doc.includes('Matriz de smoke test'), 'Documentacao deve conter matriz de smoke test.');
}

validatePayloads();
validateBackendContracts();
validateFrontendContracts();
validateDocumentation();

console.log('Validacao do caixa fisico concluida com sucesso.');
