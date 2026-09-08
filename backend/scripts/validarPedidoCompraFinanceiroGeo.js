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
const service = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'services', 'pedidoCompraFinanceiroService.js'),
  'utf8'
);
const routes = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'routes.js'),
  'utf8'
);
const component = fs.readFileSync(
  path.join(__dirname, '..', '..', 'frontend', 'src', 'modules', 'solicitacao-compra', 'components', 'PedidoCompraFinanceiro.jsx'),
  'utf8'
);
assert(!/\b(?:bulkInsert|bulkUpdate|INSERT\s+INTO|UPDATE\s+pedido_compras)\b/i.test(migration), 'A migration nao pode escrever dados funcionais.');
assert(migration.includes("createTable('pedido_compra_titulos'"), 'A migration precisa criar o vinculo explicito entre pedido e titulo.');
assert(migration.includes("createTable('pedido_compra_reaberturas'"), 'A migration precisa preservar as decisoes de reabertura.');
assert(service.includes('async function reparcelarPrevisoesPedido'), 'O servico precisa permitir reparticionar previsoes ainda nao liberadas.');
assert(service.includes("acao: 'PEDIDO_COMPRA_PREVISOES_REPARCELADAS'"), 'O reparticionamento precisa gerar historico auditavel.');
assert(service.includes("normalize(item.titulo?.status) !== 'PREVISAO'"), 'O backend precisa impedir alteracao depois da liberacao financeira.');
assert(routes.includes("/compras/pedidos/:id/financeiro/previsoes/reparcelar"), 'A rota protegida de reparticionamento precisa estar registrada.');
assert(component.includes('Adicionar parcela'), 'A tela precisa permitir adicionar parcelas na criacao da previsao.');
assert(component.includes('Editar parcelas'), 'A tela precisa permitir editar previsoes ainda nao liberadas.');

console.log('Fluxo financeiro de pedidos pelo GEO validado com sucesso.');
