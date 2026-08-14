'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  DEFAULT_RETENTION_DAYS,
  MAX_RETENTION_DAYS,
  MAX_RANGE_DAYS,
  MIN_RETENTION_DAYS,
  buildRetentionCutoff,
  buildSessionReference,
  extractChangedFieldNames,
  extractResponseResource,
  inferEventType,
  inferModule,
  normalizeFilters,
  normalizeRetentionDays,
  normalizeResourceCode,
  normalizeResourceId,
  normalizeRoute,
  sanitizeMetadata
} = require('../src/modules/governanca/services/auditoriaOperacionalService');

function validateRouteNormalization() {
  assert.strictEqual(normalizeRoute('/financeiro/titulos/123?aba=auditoria'), '/financeiro/titulos/:id');
  assert.strictEqual(normalizeRoute('/api/financeiro/titulos/123'), '/financeiro/titulos/:id');
  assert.strictEqual(
    normalizeRoute('/cotacoes/1234567890123456789012345678'),
    '/cotacoes/:token'
  );
  assert.strictEqual(
    normalizeRoute('/governanca/eventos/550e8400-e29b-41d4-a716-446655440000'),
    '/governanca/eventos/:uuid'
  );
}

function validateSafeFieldNames() {
  assert.deepStrictEqual(
    extractChangedFieldNames({ descricao: 'sigiloso', status: 'ABERTO', senha: 'nao', cpf_cnpj: 'nao', anexos: [] }),
    ['descricao', 'status']
  );
  assert.deepStrictEqual(extractChangedFieldNames(['descricao']), []);
  assert.strictEqual(extractChangedFieldNames(Object.fromEntries(
    Array.from({ length: 40 }, (_, index) => [`campo_${index}`, index])
  )).length, 30);
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

function validateSessionPrivacy() {
  const reference = buildSessionReference('sessao-bruta-do-navegador');
  assert.strictEqual(reference.length, 10);
  assert.strictEqual(reference, buildSessionReference('sessao-bruta-do-navegador'));
  assert.notStrictEqual(reference, 'sessao-bruta-do-navegador');
  assert.strictEqual(buildSessionReference(null), null);

  const pageSource = fs.readFileSync(
    path.resolve(__dirname, '../../frontend/src/modules/governanca/pages/AuditoriaOperacional.jsx'),
    'utf8'
  );
  assert(pageSource.includes('sessao_ref'), 'A linha do tempo deve agrupar eventos pela referencia protegida da sessao.');
}

function validateContextualInvestigation() {
  const pageSource = fs.readFileSync(
    path.resolve(__dirname, '../../frontend/src/modules/governanca/pages/AuditoriaOperacional.jsx'),
    'utf8'
  );
  const linksSource = fs.readFileSync(
    path.resolve(__dirname, '../../frontend/src/modules/governanca/utils/auditoriaOperacionalLinks.js'),
    'utf8'
  );
  assert(pageSource.includes('campos_alterados'), 'A linha do tempo deve exibir apenas nomes seguros dos campos alterados.');
  assert(pageSource.includes('buildAuditedRecordLink'), 'A linha do tempo deve oferecer navegacao segura ao registro conhecido.');
  assert(linksSource.includes("/financeiro/titulos/${id}"), 'Titulos financeiros devem possuir link contextual permitido.');
  assert(linksSource.includes("/solicitacoes/${id}"), 'Solicitacoes devem possuir link contextual permitido.');
}

function validateRetentionPolicy() {
  assert.strictEqual(normalizeRetentionDays(), DEFAULT_RETENTION_DAYS);
  assert.strictEqual(normalizeRetentionDays('730'), 730);
  assert.throws(() => normalizeRetentionDays(0), /retencao/);
  assert.throws(() => normalizeRetentionDays(MIN_RETENTION_DAYS - 1), /retencao/);
  assert.throws(() => normalizeRetentionDays(MAX_RETENTION_DAYS + 1), /retencao/);
  assert.strictEqual(
    buildRetentionCutoff(365, new Date('2026-08-14T00:00:00.000Z')).toISOString(),
    '2025-08-14T00:00:00.000Z'
  );

  const cleanupSource = fs.readFileSync(path.resolve(__dirname, 'limparAuditoriaOperacional.js'), 'utf8');
  assert(cleanupSource.includes("process.argv.includes('--confirm')"), 'A limpeza deve exigir confirmacao explicita.');
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
  assert(packageJson.scripts['auditoria-operacional:retencao:simular']);
  assert(packageJson.scripts['auditoria-operacional:retencao:aplicar']);
}

function validatePermissionMatrixAndIndexes() {
  const permissionSource = fs.readFileSync(path.resolve(__dirname, '../src/constants/moduloPermissoes.js'), 'utf8');
  const routeSource = fs.readFileSync(path.resolve(__dirname, '../src/modules/governanca/routes/index.js'), 'utf8');
  [
    'governanca.operacional.visualizar_resumo',
    'governanca.operacional.visualizar_usuarios',
    'governanca.operacional.visualizar_detalhes',
    'governanca.operacional.exportar'
  ].forEach((key) => assert(permissionSource.includes(key), `Permissao ausente: ${key}`));
  ['allowOperationalAudit', 'allowOperationalAuditUsers', 'allowOperationalAuditDetails', 'allowOperationalAuditExport']
    .forEach((guard) => assert(routeSource.includes(guard), `Guarda ausente: ${guard}`));

  const migrationSource = fs.readFileSync(
    path.resolve(__dirname, '../migrations/202608120003_governanca_auditoria_operacional.js'),
    'utf8'
  );
  [
    'gov_eventos_ocorrido',
    'gov_eventos_usuario_data',
    'gov_eventos_setor_data',
    'gov_eventos_modulo_data',
    'gov_eventos_tipo_data',
    'gov_eventos_recurso_data',
    'gov_eventos_resultado_data'
  ]
    .forEach((indexName) => assert(migrationSource.includes(indexName), `Indice ausente: ${indexName}`));
}

function run() {
  validateRouteNormalization();
  validateSafeFieldNames();
  validateClassification();
  validatePrivacySanitization();
  validatePeriodGuard();
  validateNavigationResourcePrivacy();
  validateCreatedResourceExtraction();
  validateCorsAuditHeader();
  validateSessionPrivacy();
  validateContextualInvestigation();
  validateRetentionPolicy();
  validatePermissionMatrixAndIndexes();
  console.log('Auditoria operacional validada com sucesso.');
}

run();
