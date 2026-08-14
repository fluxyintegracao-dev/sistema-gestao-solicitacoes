'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  MAX_RANGE_DAYS,
  extractResponseResource,
  inferEventType,
  inferModule,
  normalizeFilters,
  normalizeResourceCode,
  normalizeResourceId,
  normalizeRoute,
  sanitizeMetadata
} = require('../src/modules/governanca/services/auditoriaOperacionalService');

function validateRouteNormalization() {
  assert.strictEqual(normalizeRoute('/financeiro/titulos/123?aba=auditoria'), '/financeiro/titulos/:id');
  assert.strictEqual(
    normalizeRoute('/cotacoes/1234567890123456789012345678'),
    '/cotacoes/:token'
  );
  assert.strictEqual(
    normalizeRoute('/governanca/eventos/550e8400-e29b-41d4-a716-446655440000'),
    '/governanca/eventos/:uuid'
  );
}

function validateClassification() {
  assert.strictEqual(inferModule('/financeiro/titulos/:id'), 'FINANCEIRO');
  assert.strictEqual(inferModule('/solicitacoes-compra/:id/cotacao'), 'COMPRAS');
  assert.strictEqual(inferEventType('POST', '/financeiro/conciliacoes/:id/confirmar'), 'RECONCILE');
  assert.strictEqual(inferEventType('PATCH', '/solicitacoes/:id/status'), 'STATUS_CHANGE');
  assert.strictEqual(inferEventType('DELETE', '/contratos/:id'), 'DELETE');
}

function validatePrivacySanitization() {
  const sanitized = sanitizeMetadata({
    status_code: 200,
    rota: '/financeiro/titulos/:id',
    senha: 'nao-pode-aparecer',
    authorization: 'Bearer segredo',
    cpf: '00000000000',
    nested: { token: 'segredo', permitido: 'ok' },
    items: Array.from({ length: 20 }, (_, index) => ({ indice: index }))
  });

  assert.strictEqual(sanitized.status_code, 200);
  assert.strictEqual(sanitized.rota, '/financeiro/titulos/:id');
  assert.strictEqual(sanitized.senha, undefined);
  assert.strictEqual(sanitized.authorization, undefined);
  assert.strictEqual(sanitized.cpf, undefined);
  assert.strictEqual(sanitized.nested.token, undefined);
  assert.strictEqual(sanitized.nested.permitido, 'ok');
  assert.strictEqual(sanitized.items.length, 10);
}

function validatePeriodGuard() {
  const valid = normalizeFilters({ data_inicio: '2026-08-01', data_fim: '2026-08-31', limit: 999 });
  assert.strictEqual(valid.limit, 100);

  assert.throws(
    () => normalizeFilters({ data_inicio: '2026-01-01', data_fim: '2026-08-01' }),
    (error) => error.statusCode === 400 && error.message.includes(String(MAX_RANGE_DAYS))
  );
  assert.throws(
    () => normalizeFilters({ data_inicio: '2026-08-12', data_fim: '2026-08-01' }),
    (error) => error.statusCode === 400
  );
}

function validateNavigationResourcePrivacy() {
  assert.strictEqual(normalizeResourceId('3862'), '3862');
  assert.strictEqual(normalizeResourceId('cotacao-token-secreto'), null);
  assert.strictEqual(normalizeResourceId('1234567890123456789'), null);

  const trackerSource = fs.readFileSync(
    path.resolve(__dirname, '../../frontend/src/modules/governanca/components/OperationalAuditTracker.jsx'),
    'utf8'
  );
  assert(
    trackerSource.includes('lastPath.current === rawPath'),
    'A navegacao entre registros diferentes da mesma rota normalizada precisa ser auditada.'
  );
}

function validateCreatedResourceExtraction() {
  assert.deepStrictEqual(
    extractResponseResource({ solicitacao: { id: 3862, codigo: 'SOL-3862' } }),
    { id: '3862', code: 'SOL-3862' }
  );
  assert.deepStrictEqual(
    extractResponseResource({ data: { titulo: { id: 4901, codigo: 'TIT-004901' } } }),
    { id: '4901', code: 'TIT-004901' }
  );
  assert.strictEqual(extractResponseResource({ token: 'segredo', cpf: '123' }), null);
  assert.strictEqual(normalizeResourceCode('codigo com espaco'), null);
}

function validateCorsAuditHeader() {
  const appSource = fs.readFileSync(path.resolve(__dirname, '../src/app.js'), 'utf8');
  assert(
    appSource.includes("'X-Audit-Session-Id'"),
    'O cabecalho de sessao da auditoria operacional precisa estar liberado no CORS.'
  );
}

function run() {
  validateRouteNormalization();
  validateClassification();
  validatePrivacySanitization();
  validatePeriodGuard();
  validateNavigationResourcePrivacy();
  validateCreatedResourceExtraction();
  validateCorsAuditHeader();
  console.log('Auditoria operacional validada com sucesso.');
}

run();
