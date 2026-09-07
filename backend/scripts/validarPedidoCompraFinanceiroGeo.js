const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  STATUS_FLUXO,
  derivarStatusFinanceiro
} = require('../src/services/pedidoCompraFinanceiroService');

function titulo(status) {
  return { titulo: { id: Math.random(), status } };
}

assert.strictEqual(
  derivarStatusFinanceiro({ status: 'FECHADO_FORNECEDOR', financeiro_fluxo_versao: null }, []),
  STATUS_FLUXO.LEGADO_PENDENTE_REVISAO,
  'Pedido fechado legado precisa aguardar revisao explicita.'
);
assert.strictEqual(
  derivarStatusFinanceiro({ status: 'FECHADO_FORNECEDOR', financeiro_fluxo_versao: 1 }, [titulo('PREVISAO')]),
  STATUS_FLUXO.PREVISAO_CRIADA,
  'Previsao nao pode ser tratada como titulo liberado.'
);
assert.strictEqual(
  derivarStatusFinanceiro({ status: 'FECHADO_FORNECEDOR', financeiro_fluxo_versao: 1 }, [titulo('PREVISAO'), titulo('ABERTO')]),
  STATUS_FLUXO.PARCIALMENTE_LIBERADO,
  'Mistura de previsao e titulo aberto precisa permanecer parcial.'
);
assert.strictEqual(
  derivarStatusFinanceiro({ status: 'FECHADO_FORNECEDOR', financeiro_fluxo_versao: 1 }, [titulo('QUITADO')]),
  STATUS_FLUXO.CONCLUIDO,
  'Todos os titulos quitados encerram o financeiro do pedido.'
);

const migration = fs.readFileSync(
  path.join(__dirname, '..', 'migrations', '202609070050_pedido_compra_gestao_financeira_geo.js'),
  'utf8'
);
assert(!/\b(?:bulkInsert|bulkUpdate|INSERT\s+INTO|UPDATE\s+pedido_compras)\b/i.test(migration), 'A migration nao pode escrever dados funcionais.');
assert(migration.includes("createTable('pedido_compra_titulos'"), 'A migration precisa criar o vinculo explicito entre pedido e titulo.');
assert(migration.includes("createTable('pedido_compra_reaberturas'"), 'A migration precisa preservar as decisoes de reabertura.');

console.log('Fluxo financeiro de pedidos pelo GEO validado com sucesso.');
