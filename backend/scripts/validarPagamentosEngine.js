const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  validatePaymentAccountBody,
  validatePaymentBatchCreateBody,
  validatePaymentBeneficiaryCreateBody,
  validatePaymentCancelBody,
  validatePaymentMfaBody,
  validatePaymentMockReturnBody
} = require('../src/validators/paymentValidators');
const bancoDoBrasilProvider = require('../src/services/paymentProviderBancoDoBrasil');
const { ValidationError } = require('../src/middlewares/validation');

const projectRoot = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function expectValidationError(fn, expectedMessage) {
  let thrown = null;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }

  assert(thrown instanceof ValidationError, 'Esperava ValidationError.');
  if (expectedMessage) {
    assert(
      String(thrown.message || '').includes(expectedMessage),
      `Mensagem inesperada: ${thrown.message}`
    );
  }
}

function validateBeneficiaryPayload() {
  const data = validatePaymentBeneficiaryCreateBody({
    parceiro_id: '10',
    nome: 'Fornecedor Teste',
    cpf_cnpj: '12345678000199',
    pix_tipo_chave: 'cnpj',
    pix_chave: '12345678000199',
    ativo: 'true'
  });

  assert.strictEqual(data.parceiro_id, 10);
  assert.strictEqual(data.nome, 'Fornecedor Teste');
  assert.strictEqual(data.metodo_preferencial, 'PIX_CHAVE');
  assert.strictEqual(data.pix_tipo_chave, 'CNPJ');
  assert.strictEqual(data.ativo, true);

  expectValidationError(
    () => validatePaymentBeneficiaryCreateBody({
      parceiro_id: 1,
      nome: 'Sem PIX',
      cpf_cnpj: '12345678901'
    }),
    'Tipo de chave PIX e obrigatorio'
  );

  expectValidationError(
    () => validatePaymentBeneficiaryCreateBody({
      parceiro_id: 1,
      nome: 'Fornecedor',
      cpf_cnpj: '12345678901',
      pix_tipo_chave: 'CPF',
      pix_chave: '12345678901',
      client_secret: 'nao permitido'
    }),
    'campos nao permitidos'
  );
}

function validateBatchPayloads() {
  const batch = validatePaymentBatchCreateBody({
    titulo_ids: ['1', 2],
    payment_account_id: '3',
    data_programada: '2026-05-08'
  });

  assert.deepStrictEqual(batch.titulo_ids, [1, 2]);
  assert.strictEqual(batch.payment_account_id, 3);
  assert.strictEqual(batch.data_programada, '2026-05-08');

  expectValidationError(
    () => validatePaymentBatchCreateBody({ titulo_ids: [], payment_account_id: 3, data_programada: '2026-05-08' }),
    'Informe ao menos um titulo'
  );

  expectValidationError(
    () => validatePaymentBatchCreateBody({ titulo_ids: [1], payment_account_id: 3, data_programada: '08/05/2026' }),
    'Data programada invalido'
  );
}

function validateSensitiveActionsPayloads() {
  const mfa = validatePaymentMfaBody({
    codigo_mfa: '123456',
    justificativa: 'Aprovacao controlada'
  });
  assert.strictEqual(mfa.codigo_mfa, '123456');
  assert.strictEqual(mfa.justificativa, 'Aprovacao controlada');

  expectValidationError(
    () => validatePaymentMfaBody({ codigo_mfa: '123456', token: 'indevido' }),
    'campos nao permitidos'
  );

  const cancel = validatePaymentCancelBody({ justificativa: 'Cancelamento operacional' });
  assert.strictEqual(cancel.justificativa, 'Cancelamento operacional');

  const retornoPadrao = validatePaymentMockReturnBody({});
  assert.strictEqual(retornoPadrao.resultado, 'CONFIRMADO');

  const retornoFalha = validatePaymentMockReturnBody({ resultado: 'falha' });
  assert.strictEqual(retornoFalha.resultado, 'FALHA');

  expectValidationError(
    () => validatePaymentMockReturnBody({ resultado: 'PAGO' }),
    'Resultado invalido'
  );
}

function validatePaymentAccountPayload() {
  const account = validatePaymentAccountBody({
    conta_bancaria_id: '1',
    empresa_id: '2',
    provider_id: '3',
    cnpj_pagador: '12.345.678/0001-99',
    ambiente: 'homologacao',
    ativo: 'sim'
  });

  assert.strictEqual(account.conta_bancaria_id, 1);
  assert.strictEqual(account.empresa_id, 2);
  assert.strictEqual(account.provider_id, 3);
  assert.strictEqual(account.ambiente, 'HOMOLOGACAO');
  assert.strictEqual(account.ativo, true);
  assert.strictEqual(account.cnpj_pagador, '12.345.678/0001-99');
}

function validateRoutesAndCriticalGuards() {
  const routes = read('src/routes.js');
  const approvalService = read('src/services/paymentApprovalService.js');
  const executionService = read('src/services/paymentExecutionService.js');
  const baixaService = read('src/services/paymentBaixaService.js');

  [
    '/financeiro/pagamentos/titulos-elegiveis',
    '/financeiro/pagamentos/lotes',
    '/financeiro/pagamentos/lotes/:id/submeter-aprovacao',
    '/financeiro/pagamentos/lotes/:id/aprovar',
    '/financeiro/pagamentos/lotes/:id/rejeitar',
    '/financeiro/pagamentos/lotes/:id/cancelar',
    '/financeiro/pagamentos/lotes/:id/enviar-banco',
    '/financeiro/pagamentos/lotes/:id/reprocessar',
    '/financeiro/pagamentos/lotes/:id/simular-retorno-banco',
    '/financeiro/pagamentos/aguardando-baixa',
    '/financeiro/pagamentos/intents/:id/confirmar-baixa'
  ].forEach((route) => {
    assert(routes.includes(route), `Rota ausente: ${route}`);
  });

  assert(
    approvalService.includes('Criador do lote nao pode aprovar o proprio lote'),
    'Guarda contra aprovacao pelo criador nao encontrada.'
  );
  assert(
    approvalService.includes('approvals >= 2'),
    'Guarda de dupla aprovacao nao encontrada.'
  );
  assert(
    executionService.includes('verifyMfaStepUp'),
    'MFA step-up nao encontrado na execucao/reprocessamento.'
  );
  assert(
    executionService.includes('Ja existe um job de envio pendente ou em processamento'),
    'Bloqueio de job duplicado nao encontrado.'
  );
  assert(
    executionService.includes('paymentProviderBancoDoBrasil'),
    'Execucao nao esta usando o adapter Banco do Brasil.'
  );
  assert(
    baixaService.includes('lock: transaction.LOCK.UPDATE'),
    'Lock transacional da baixa nao encontrado.'
  );
  assert(
    baixaService.includes('Pagamento ja possui baixa vinculada'),
    'Guarda contra dupla baixa nao encontrada.'
  );
}

async function validateBancoDoBrasilProvider() {
  const context = {
    provider: {
      id: 1,
      codigo: 'BB',
      ambiente: 'HOMOLOGACAO',
      config_ref: 'BB_MOCK_HOMOLOGACAO'
    },
    account: {
      id: 9,
      ambiente: 'HOMOLOGACAO',
      banco_codigo: '001',
      agencia: '1234',
      conta: '56789',
      tipo_conta: 'CORRENTE',
      convenio: 'CONV-TESTE',
      cnpj_pagador: '12.345.678/0001-99',
      client_id_ref: 'aws/secret/client-id',
      client_secret_ref: 'aws/secret/client-secret',
      certificate_ref: 'aws/secret/cert'
    }
  };
  const batch = {
    id: 1,
    codigo: 'PAY-TESTE',
    correlation_id: 'corr-1',
    idempotency_key: 'idem-1',
    data_programada: '2026-05-08',
    quantidade_itens: 1,
    valor_total: 10,
    items: [{
      sequencia: 1,
      payment_intent_id: 11,
      valor: 10,
      intent: {
        id: 11,
        metodo: 'PIX_CHAVE',
        correlation_id: 'intent-corr-1',
        beneficiary_snapshot: {
          nome: 'Fornecedor Teste',
          cpf_cnpj: '12345678000199',
          pix_tipo_chave: 'CNPJ',
          pix_chave: '12345678000199'
        }
      }
    }]
  };

  const auth = await bancoDoBrasilProvider.authenticate(context);
  assert.strictEqual(auth.authenticated, true);
  assert.strictEqual(auth.mode, bancoDoBrasilProvider.MOCK_MODE);

  const snapshot = bancoDoBrasilProvider.buildBatchRequestSnapshot(batch, context);
  assert.strictEqual(snapshot.account.cnpj_pagador, '12345678000199');
  assert(!String(snapshot.account.client_secret_ref || '').includes('client-secret'), 'Referencia sensivel nao foi mascarada.');
  assert.strictEqual(snapshot.items[0].favorecido.pix_tipo_chave, 'CNPJ');

  const result = await bancoDoBrasilProvider.submitBatch(batch, context);
  assert.strictEqual(result.accepted, true);
  assert.strictEqual(result.provider_batch_id, 'MOCK-BB-PAY-TESTE');

  let realModeError = null;
  try {
    await bancoDoBrasilProvider.authenticate({
      ...context,
      provider: { ...context.provider, config_ref: 'BB_REAL_HOMOLOGACAO' }
    });
  } catch (error) {
    realModeError = error;
  }
  assert(realModeError, 'Modo real deveria permanecer desabilitado nesta etapa.');
  assert.strictEqual(realModeError.statusCode, 501);
}

async function run() {
  validateBeneficiaryPayload();
  validateBatchPayloads();
  validateSensitiveActionsPayloads();
  validatePaymentAccountPayload();
  validateRoutesAndCriticalGuards();
  await validateBancoDoBrasilProvider();

  console.log('Validacoes do motor de pagamentos concluidas com sucesso.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
