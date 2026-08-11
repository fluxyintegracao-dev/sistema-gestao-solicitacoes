'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  hasSameConciliacaoDate,
  hasSameConciliacaoValue,
  isExactConciliacaoMatch
} = require('../src/utils/conciliacaoMatch');

assert.strictEqual(hasSameConciliacaoDate('2026-07-06', '2026-07-06'), true);
assert.strictEqual(hasSameConciliacaoDate('2026-07-06', '2026-07-10'), false);

assert.strictEqual(hasSameConciliacaoValue(-1436.16, 1436.16), true);
assert.strictEqual(hasSameConciliacaoValue(-1436.16, 1436.17), false);
assert.strictEqual(hasSameConciliacaoValue(-26007.30, 1436.16), false);

assert.strictEqual(isExactConciliacaoMatch({
  bankDate: '2026-07-06',
  bankValue: -1436.16,
  movementDate: '2026-07-06',
  movementValue: 1436.16
}), true);

assert.strictEqual(isExactConciliacaoMatch({
  bankDate: '2026-07-06',
  bankValue: -26007.30,
  movementDate: '2026-07-06',
  movementValue: 1436.16
}), false);

assert.strictEqual(isExactConciliacaoMatch({
  bankDate: '2026-07-06',
  bankValue: -1436.16,
  movementDate: '2026-07-10',
  movementValue: 1436.16
}), false);

const serviceSource = fs.readFileSync(
  path.resolve(__dirname, '../src/services/conciliacaoBancariaService.js'),
  'utf8'
);
const loadByIdSource = serviceSource.match(
  /async function loadConciliacaoById[\s\S]*?\n}\n\nasync function resolveMovimentoForConciliacao/
)?.[0] || '';

assert(
  /ConciliacaoBancaria\.findOne\(\{[\s\S]*?deleted_at: null[\s\S]*?}\);/.test(loadByIdSource),
  'A conciliacao deve ser localizada antes de carregar relacionamentos opcionais.'
);
assert(
  /conciliacao\.reload\(\{[\s\S]*?include: buildConciliacaoInclude\(\)/.test(loadByIdSource),
  'Os relacionamentos devem ser carregados somente depois que a conciliacao for localizada.'
);

const includeSource = serviceSource.match(
  /function buildConciliacaoInclude\(\)[\s\S]*?\n}\n\nfunction buildConciliacaoWhere/
)?.[0] || '';
assert(
  includeSource.includes("as: 'titulo',\n      required: false"),
  'O titulo ainda nao associado deve ser um relacionamento opcional.'
);

console.log('Validacao de matches exatos da conciliacao concluida com sucesso.');
