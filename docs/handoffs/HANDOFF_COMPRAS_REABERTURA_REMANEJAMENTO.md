# Handoff - Reabertura e remanejamento de pedidos de compra

## Objetivo

Alinhar reabertura, remanejamento, disponibilidade, custos gerenciais, financeiro e status da cotacao.

## Regras implantadas

- reabrir pedido nao desfaz alocacoes e serve para liberar edicao e remanejamento;
- reabertura exige motivo e fica bloqueada quando o pedido possui titulo financeiro ou frete titulado;
- cotacao encerrada volta ao estado operacional e o fornecedor do pedido fica `REABERTA`;
- remanejamento valida o saldo historico do fornecedor de destino pela chave `fornecedor + item`;
- pedido de origem e eventual pedido de destino com efeitos financeiros bloqueiam o remanejamento;
- quantidade e custos da alocacao de origem sao reduzidos proporcionalmente;
- destino recebe nova alocacao com desconto, IPI, ICMS, ST e DIFAL calculados pela mesma rotina do fechamento;
- descontos dos pedidos sao sincronizados com suas alocacoes ativas;
- fretes pendentes sao rerateados e o frete sem itens e cancelado automaticamente;
- frete de terceiro informado pela cotacao de destino e criado de forma idempotente quando aplicavel;
- pedidos permanecem abertos depois do remanejamento e precisam ser fechados novamente;
- todos os pedidos ativos fechados e saldo zero levam a solicitacao para `ENCERRADO` e as cotacoes para `FINALIZADA`;
- pedido cancelado devolve saldo e restaura a resposta para `RESPONDIDO`; cancelamento da cotacao continua sendo uma decisao explicita.

## Arquivos principais

- `backend/src/services/pedidoCompraService.js`
- `backend/src/services/pedidoCompraFreteService.js`
- `frontend/src/modules/solicitacao-compra/pages/PedidoCompraDetalhe.jsx`
- `backend/scripts/validarCompraRemanejamento.js`
- `docs/regras_negocio/compras.md`
- `docs/modulos/compras/README.md`

## Migracao

Nao ha migration.

## Validacoes executadas

- `npm run test:compra-remanejamento`
- `npm run test:compra-cotacao-envio`
- `npm run test:docs`
- `npm run build` no frontend
- verificacao de sintaxe dos servicos Node alterados

Todas concluidas com sucesso em 22/07/2026.
