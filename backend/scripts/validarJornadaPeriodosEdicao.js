'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  normalizarPeriodo
} = require('../src/services/rhJornadaFormularioService');

const mensal = normalizarPeriodo({ periodicidade: 'MENSAL' }, '2026-09');
assert.deepStrictEqual(mensal, {
  periodicidade: 'MENSAL',
  inicio: '2026-09-01',
  fim: '2026-09-30',
  dias: 30
});

const semanal = normalizarPeriodo({
  periodicidade: 'SEMANAL',
  periodo_inicio: '2026-09-08',
  periodo_fim: '2026-09-14'
}, '2026-09');
assert.strictEqual(semanal.dias, 7);

assert.throws(() => normalizarPeriodo({
  periodicidade: 'SEMANAL',
  periodo_inicio: '2026-09-08',
  periodo_fim: '2026-09-15'
}, '2026-09'), /maximo 7 dias/);

assert.throws(() => normalizarPeriodo({
  periodicidade: 'QUINZENAL',
  periodo_inicio: '2026-09-20',
  periodo_fim: '2026-10-05'
}, '2026-09'), /dentro da competencia/);

const raiz = path.resolve(__dirname, '..', '..');
const migration = fs.readFileSync(
  path.join(raiz, 'backend/migrations/202609070052_rh_jornada_periodos_edicao.js'),
  'utf8'
);
assert(!/\b(?:INSERT|UPDATE|DELETE)\s+/i.test(migration), 'A migration nao pode gravar dados funcionais.');

const tela = fs.readFileSync(path.join(raiz, 'frontend/src/pages/RhDpJornada.jsx'), 'utf8');
assert(tela.includes("rotulo: 'Obra *'"), 'O seletor de obra precisa permanecer visivel.');
assert(tela.includes("rotulo: 'Periodicidade *'"), 'A periodicidade precisa ser informada na jornada.');
assert(tela.includes('Solicitar edição'), 'A obra precisa conseguir solicitar a edicao bloqueada.');

console.log('Validacao de periodos e autorizacao de edicao da jornada concluida com sucesso.');
