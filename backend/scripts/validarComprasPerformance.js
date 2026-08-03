const assert = require('assert');
const { EventEmitter } = require('events');
const {
  createComprasPerformanceMiddleware,
  isComprasRequestPath,
  recordDatabaseQuery,
  resolveQueryType,
  sanitizeFallbackRoute
} = require('../src/observability/comprasPerformance');
const {
  parsePerformanceEntries,
  summarizePerformanceEntries
} = require('./resumirComprasPerformance');

function validarEscopoDeRotas() {
  assert.strictEqual(isComprasRequestPath('/api/compras/solicitacoes?obra_id=1'), true);
  assert.strictEqual(isComprasRequestPath('/api/cotacoes/token-secreto'), true);
  assert.strictEqual(isComprasRequestPath('/api/configuracoes/cotacoes'), true);
  assert.strictEqual(isComprasRequestPath('/api/financeiro/titulos'), false);

  assert.strictEqual(
    sanitizeFallbackRoute('/api/compras/solicitacoes/123/comparativo?obra_id=1'),
    '/api/compras/solicitacoes/:id/comparativo'
  );
  assert.strictEqual(
    sanitizeFallbackRoute('/api/cotacoes/segredo-com-mais-de-quarenta-caracteres-1234567890'),
    '/api/cotacoes/:token'
  );
}

function validarTipoDeConsulta() {
  assert.strictEqual(resolveQueryType('Executed (default): SELECT 1'), 'SELECT');
  assert.strictEqual(resolveQueryType('UPDATE pedido_compras SET status = ?'), 'UPDATE');
  assert.strictEqual(resolveQueryType(''), 'OUTRA');
}

function executarMiddleware({ path, enabled = true, sampleRate = 1, queries = [] }) {
  const logs = [];
  const middleware = createComprasPerformanceMiddleware({
    enabled,
    sampleRate,
    slowQueryThresholdMs: 100,
    random: () => 0,
    logger: (line) => logs.push(line)
  });
  const req = {
    method: 'GET',
    originalUrl: path,
    query: { status: 'ABERTO' },
    headers: { 'x-request-id': 'teste-compras-performance' },
    baseUrl: '/api',
    route: { path: '/compras/pedidos' }
  };
  const res = new EventEmitter();
  res.statusCode = 200;
  res.writableEnded = true;
  res.getHeader = (name) => String(name).toLowerCase() === 'content-length' ? '2048' : undefined;

  middleware(req, res, () => {
    queries.forEach(({ sql, ms }) => recordDatabaseQuery(sql, ms));
    res.emit('finish');
  });

  return logs;
}

function validarMedicaoPorRequisicao() {
  const logs = executarMiddleware({
    path: '/api/compras/pedidos?status=ABERTO',
    queries: [
      { sql: 'Executed (default): SELECT * FROM pedido_compras', ms: 80 },
      { sql: 'Executed (default): SELECT * FROM pedido_compra_itens', ms: 140 }
    ]
  });

  assert.strictEqual(logs.length, 1);
  const entries = parsePerformanceEntries(logs.join('\n'));
  assert.strictEqual(entries.length, 1);
  assert.strictEqual(entries[0].route, '/api/compras/pedidos');
  assert.strictEqual(entries[0].db_query_count, 2);
  assert.strictEqual(entries[0].db_duration_ms, 220);
  assert.strictEqual(entries[0].db_slow_query_count, 1);
  assert.deepStrictEqual(entries[0].db_queries_by_type, { SELECT: 2 });
  assert.strictEqual(entries[0].response_bytes, 2048);
  assert.deepStrictEqual(entries[0].query_keys, ['status']);

  const summary = summarizePerformanceEntries(entries);
  assert.strictEqual(summary.length, 1);
  assert.strictEqual(summary[0].consultas_media, 2);
  assert.strictEqual(summary[0].resposta_p95_kb, 2);
}

function validarInstrumentacaoDesligadaOuForaDoEscopo() {
  assert.strictEqual(executarMiddleware({ path: '/api/financeiro/titulos' }).length, 0);
  assert.strictEqual(executarMiddleware({ path: '/api/compras/pedidos', enabled: false }).length, 0);
  assert.strictEqual(executarMiddleware({ path: '/api/compras/pedidos', sampleRate: 0 }).length, 0);
}

function run() {
  validarEscopoDeRotas();
  validarTipoDeConsulta();
  validarMedicaoPorRequisicao();
  validarInstrumentacaoDesligadaOuForaDoEscopo();
  console.log('Validacao da observabilidade de performance de Compras concluida com sucesso.');
}

run();
