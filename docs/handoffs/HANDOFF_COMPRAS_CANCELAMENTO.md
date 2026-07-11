# Handoff - Compras / Cancelamento e bloqueios posteriores

## Objetivo

Registrar o estado do trabalho pendente no modulo de Compras para permitir retomada sem perder contexto ou iniciar outro escopo antes da conclusao.

## Estado atual

- Data: 2026-07-11
- Branch esperada: `dev-v2`
- Status: implementado localmente e validado tecnicamente; teste funcional em dev pendente
- Escopo: estabilizar cancelamento de solicitacao de compra, cotacao e pedido, impedindo novas operacoes em registros cancelados

## Arquivos alterados

- `backend/src/controllers/PedidoCompraController.js`
- `backend/src/controllers/SolicitacaoCompraController.js`
- `backend/src/services/pedidoCompraFreteService.js`
- `backend/src/services/pedidoCompraService.js`
- `frontend/src/modules/solicitacao-compra/pages/GerenciarCotacaoSolicitacao.jsx`
- `frontend/src/modules/solicitacao-compra/pages/PedidoCompraDetalhe.jsx`
- `frontend/src/modules/solicitacao-compra/pages/SolicitacaoCompraDetalheView.jsx`

## Regras implementadas

- Solicitacao de compra cancelada nao permite alterar quantidade nem apropriacoes dos itens.
- Gestao de cotacao cancelada exibe estado indisponivel em vez de manter a tela em carregamento indefinido.
- Detalhe da solicitacao de compra bloqueia acesso operacional a cotacao cancelada.
- Pedido cancelado nao permite alterar status, enviar pedido ou registrar novo frete.
- Backend impede alteracao de status e registro de frete em pedido cancelado.
- Cancelamento do pedido mantem fretes e rateios para auditoria, mas marca fretes sem titulo como `CANCELADO` na mesma transacao.
- Frete com titulo financeiro continua impedindo o cancelamento ate o financeiro ser tratado.
- Correcao do payload de rateio permite editar apropriacao existente sem criar uma linha vazia.
- Busca de pedidos passa a localizar tambem pelo codigo `PC-xxxxx`.

## Protecoes preservadas

- Nenhum registro historico e excluido.
- Titulos financeiros nao sao cancelados automaticamente.
- Pedido com titulo ou frete com titulo permanece protegido contra cancelamento.
- Acoes continuam sujeitas as permissoes granulares existentes.

## Validacao executada

- `node --check` nos quatro arquivos de backend alterados: concluido sem erros.
- `npm run build` em `frontend/`: concluido sem erros.
- `git diff --check`: concluido sem erros.
- Revisao do diff: sete arquivos funcionais e este handoff compoem o escopo.

## Teste funcional ainda necessario em dev

  - cancelar pedido sem titulo e com frete pendente;
  - confirmar que o frete sai da fila financeira e nao entra no realizado da obra;
  - confirmar que pedido cancelado nao aceita status, envio ou novo frete;
  - confirmar que solicitacao cancelada nao aceita editar item/apropriacao nem abrir nova cotacao;
  - confirmar que pedido com titulo continua bloqueando cancelamento.

## Proximo passo recomendado

Executar o teste funcional em dev e preparar um unico commit do fluxo de cancelamento. Nao iniciar o novo modulo de Custos e Recebiveis antes de concluir e publicar este conjunto.
