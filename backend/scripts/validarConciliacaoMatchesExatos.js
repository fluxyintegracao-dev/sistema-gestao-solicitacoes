'use strict';

const assert = require('assert');
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

console.log('Validacao de matches exatos da conciliacao concluida com sucesso.');
