# Handoff - Fechamento parcial de cotacao

## Objetivo
- Permitir gerar pedidos para parte das quantidades cotadas sem encerrar os itens restantes.
- Manter rodadas auditaveis e impedir que a soma fechada ultrapasse a quantidade atual do item.

## Regra de quantidade
- O teto e a quantidade atual do item, inclusive quando ela foi alterada por usuario autorizado.
- A quantidade original permanece preservada na auditoria de alteracao do item.
- Cancelar pedido ou item sem vinculo financeiro cancela suas alocacoes e devolve o saldo.

## Arquitetura definida
- Nova entidade `SolicitacaoCompraFechamento` para rodadas PARCIAL/FINAL.
- `fechamento_id` em pedidos e alocacoes; legados permanecem com valor nulo.
- Novas rodadas acrescentam pedidos e alocacoes, sem substituir registros anteriores.
- Status da solicitacao: `FECHAMENTO_PARCIAL` enquanto houver saldo; `ENCERRADO` quando todo o saldo estiver fechado.
- Fechamento parcial permanece visivel na delegacao; final deixa de ser exibido.
- Permissoes distintas para fechar parcialmente e finalizar.
- A mesma acao identifica se a rodada e parcial ou final pelo saldo efetivamente selecionado.
- Pedidos novos exibem no resumo o numero e o tipo da rodada que os originou; pedidos legados permanecem sem essa informacao.
- A chave `Idempotency-Key` impede que repeticao/duplo clique gere uma segunda rodada.
- Cancelamentos e remanejamentos nao podem reduzir alocacoes que ja possuam titulo financeiro.
- Se o cancelamento dos itens esvaziar o pedido, fretes pendentes sem titulo sao cancelados na mesma transacao.
- Se o cancelamento dos itens esvaziar o pedido, o proprio pedido tambem passa para `CANCELADO` na mesma transacao.

## Arquivos previstos
- backend/migrations/202607160001_compras_fechamento_parcial.js
- backend/src/models/SolicitacaoCompraFechamento.js
- backend/src/models/SolicitacaoCompraAlocacao.js
- backend/src/models/PedidoCompra.js
- backend/src/models/index.js
- backend/src/services/pedidoCompraService.js
- backend/src/controllers/SolicitacaoCompraController.js
- backend/src/controllers/InsumoController.js
- backend/src/validators/operationalValidators.js
- backend/src/services/authorizationService.js
- backend/src/constants/moduloPermissoes.js
- backend/src/routes.js
- frontend/src/modules/solicitacao-compra/pages/GerenciarCotacaoSolicitacao.jsx
- frontend/src/modules/solicitacao-compra/pages/ComprasDelegacao.jsx
- frontend/src/modules/solicitacao-compra/pages/SolicitacaoCompraDetalheView.jsx
- frontend/src/modules/solicitacao-compra/pages/SolicitacoesCompra.jsx
- frontend/src/services/compras.js
- frontend/src/services/configuracoesSistema.js
- frontend/src/utils/acessoProduto.js

## Validacoes obrigatorias
- Sintaxe dos arquivos backend.
- Carregamento dos models.
- Migration em banco de teste.
- Build de producao do frontend.
- Testes manuais parcial, rodada seguinte, final, cancelamento, reabertura, permissao e duplo clique.

## Validacoes executadas
- `node --check` em todos os arquivos backend alterados: aprovado.
- Carga completa de `backend/src/models`: aprovada.
- `npm run test:compra-cotacao-envio`: aprovado, incluindo quantidade brasileira `8,235`.
- `npm run build` no frontend: aprovado.
- `git diff --check`: aprovado.

## Matriz de teste manual em dev
1. Quantidade atual 10; fechar 4. Deve criar rodada PARCIAL, um pedido fechado e saldo 6.
2. Na mesma compra, fechar os 6 restantes. Deve criar outra rodada/pedido, finalizar a cotacao e preservar o primeiro pedido.
3. Alterar quantidade de 10 para 12 apos fechar 4. O saldo deve passar a 8; a auditoria deve manter a alteracao 10 -> 12.
4. Tentar reduzir a quantidade atual para menos de 4. O backend deve bloquear.
5. Usar quantidade decimal `8,235`. Pedido e alocacao devem manter tres casas, sem interpretar como milhar.
6. Usuario apenas com `compras.cotacoes.fechar_parcial`: pode fazer rodada parcial e nao pode consumir o saldo inteiro.
7. Usuario com `compras.cotacoes.encerrar`: pode fechar parcial e finalizar.
8. Repetir a mesma chamada com a mesma `Idempotency-Key`. Deve retornar replay sem pedido duplicado.
9. Reabrir um pedido de uma rodada. A compra deve permanecer em revisao/fechamento parcial e os demais pedidos nao podem ser alterados.
10. Cancelar pedido sem financeiro. As alocacoes devem ser canceladas e o saldo deve voltar ao comparativo.
11. Cancelar somente um item sem financeiro. Deve voltar apenas o saldo daquele item.
12. Tentar cancelar/remanejar item com titulo vinculado. Deve ser bloqueado.
13. Cancelar todos os itens de um pedido com frete pendente sem titulo. Pedido e frete devem ser cancelados.
14. Pedido/frete com titulo financeiro vinculado deve impedir cancelamento.
15. Enquanto houver saldo, a compra deve continuar no painel de delegacao; ao finalizar integralmente, deve sair.
16. Pedido legado sem `fechamento_id`: abrir, reabrir e cancelar continuam seguindo o fluxo legado.

## Estado
- Implementacao concluida e validada localmente na branch `dev-v2`, pronta para migration/teste manual em dev.
- A migration e aditiva; pedidos e alocacoes legados permanecem com `fechamento_id` nulo.
- A migration nao foi executada em banco compartilhado nesta sessao; deve ser aplicada primeiro em dev.
