const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  validateFinanceTituloQuery
} = require('../src/validators/financialValidators');

function expectValidationError(callback, messagePart) {
  assert.throws(callback, (error) => (
    error?.name === 'ValidationError'
      && String(error.message || '').includes(messagePart)
  ));
}

const intervalo = validateFinanceTituloQuery({
  tipo: 'PAGAR',
  valor_min: '1089',
  valor_max: '1089',
  paginated: '1',
  page: '1',
  limit: '25'
});

assert.strictEqual(intervalo.valor_min, 1089);
assert.strictEqual(intervalo.valor_max, 1089);

const somenteMinimo = validateFinanceTituloQuery({ valor_min: '1.089,90' });
assert.strictEqual(somenteMinimo.valor_min, 1089.9);
assert.strictEqual(somenteMinimo.valor_max, undefined);

expectValidationError(
  () => validateFinanceTituloQuery({ valor_min: '200', valor_max: '100' }),
  'Valor minimo nao pode ser maior que valor maximo.'
);

expectValidationError(
  () => validateFinanceTituloQuery({ valor_min: '-1' }),
  'Valor minimo invalido.'
);

const serviceSource = fs.readFileSync(
  path.resolve(__dirname, '../src/services/tituloFinanceiroService.js'),
  'utf8'
);

assert(
  serviceSource.includes('where.valor_original[Op.gte] = valorMinimo')
    && serviceSource.includes('where.valor_original[Op.lte] = valorMaximo'),
  'O filtro de valor dos titulos deve manter os limites minimo e maximo inclusivos.'
);

console.log('Validacao dos filtros de valor dos titulos concluida com sucesso.');
