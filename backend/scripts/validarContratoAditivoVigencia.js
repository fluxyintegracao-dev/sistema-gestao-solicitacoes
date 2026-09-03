'use strict';

const assert = require('node:assert/strict');
const { validarNovaVigencia } = require('../src/services/contratoAditivoVigencia');

const hoje = '2026-09-03';

function validar(caso, entrada, esperado) {
  const resultado = validarNovaVigencia({ ...entrada, hoje });
  assert.equal(resultado.valida, esperado.valida, `${caso}: validade divergente`);
  assert.equal(resultado.codigo, esperado.codigo, `${caso}: codigo divergente`);
}

validar('prorrogacao de contrato vigente', {
  vigenciaAtualFim: '2027-01-30',
  novaVigenciaFim: '2027-04-30'
}, { valida: true, codigo: 'PRORROGACAO_VALIDA' });

validar('data anterior a hoje', {
  vigenciaAtualFim: '2027-01-30',
  novaVigenciaFim: '2026-03-17'
}, { valida: false, codigo: 'DATA_RETROATIVA' });

validar('reducao futura de vigencia', {
  vigenciaAtualFim: '2027-01-30',
  novaVigenciaFim: '2026-12-30'
}, { valida: false, codigo: 'REDUCAO_NAO_SUPORTADA' });

validar('data igual a vigencia atual', {
  vigenciaAtualFim: '2027-01-30',
  novaVigenciaFim: '2027-01-30'
}, { valida: false, codigo: 'SEM_ALTERACAO' });

validar('contrato expirado prorrogado a partir de hoje', {
  vigenciaAtualFim: '2026-08-31',
  novaVigenciaFim: '2026-09-03'
}, { valida: true, codigo: 'PRORROGACAO_VALIDA' });

validar('legado sem vigencia recebe data atual', {
  vigenciaAtualFim: null,
  novaVigenciaFim: '2026-09-03'
}, { valida: true, codigo: 'PRORROGACAO_VALIDA' });

validar('contrato sem vigencia respeita ultimo vencimento', {
  vigenciaAtualFim: null,
  ultimaParcelaVencimento: '2027-01-30',
  novaVigenciaFim: '2026-12-30'
}, { valida: false, codigo: 'REDUCAO_NAO_SUPORTADA' });

validar('dado historico inconsistente respeita ultimo vencimento', {
  vigenciaAtualFim: '2026-03-17',
  ultimaParcelaVencimento: '2027-01-30',
  novaVigenciaFim: '2026-12-30'
}, { valida: false, codigo: 'REDUCAO_NAO_SUPORTADA' });

validar('dado historico inconsistente aceita data apos ultimo vencimento', {
  vigenciaAtualFim: '2026-03-17',
  ultimaParcelaVencimento: '2027-01-30',
  novaVigenciaFim: '2027-02-01'
}, { valida: true, codigo: 'PRORROGACAO_VALIDA' });

validar('pedido pendente fica invalido se outro aditivo ampliar antes', {
  vigenciaAtualFim: '2029-01-30',
  ultimaParcelaVencimento: '2029-01-30',
  novaVigenciaFim: '2028-01-30'
}, { valida: false, codigo: 'REDUCAO_NAO_SUPORTADA' });

validar('legado sem vigencia nao recebe data retroativa', {
  vigenciaAtualFim: null,
  novaVigenciaFim: '2026-09-02'
}, { valida: false, codigo: 'DATA_RETROATIVA' });

validar('data inexistente', {
  vigenciaAtualFim: '2027-01-30',
  novaVigenciaFim: '2027-02-30'
}, { valida: false, codigo: 'DATA_INVALIDA' });

console.log('Validacao das regras de vigencia dos aditivos concluida com sucesso.');
