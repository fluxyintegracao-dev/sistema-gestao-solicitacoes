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

## Atualizacao - 2026-07-12

### Ajustes pendentes de commit

- `backend/src/controllers/SolicitacaoCompraController.js`
  - SC com status `CANCELADA`/`CANCELADO` agora pode ser acompanhada historicamente mesmo quando a solicitacao principal nao esta mais liberada para compras.
  - O ajuste nao libera operacoes: edicao de itens/apropriacoes e cotacao continuam bloqueadas pelas validacoes ja existentes para status cancelado.
- `frontend/src/modules/solicitacao-compra/pages/NovaSolicitacaoCompra.jsx`
  - Modal de apropriacao da nova solicitacao de compra/compra direta ajustado para largura responsiva intermediaria (`max-w-[820px]`).
- `frontend/src/modules/solicitacao-compra/pages/SolicitacaoCompraDetalheView.jsx`
  - Modal de edicao de apropriacoes do item ajustado para largura responsiva intermediaria (`max-w-[860px]`) e colunas mais compactas.

### Validacao executada

- `node --check backend/src/controllers/SolicitacaoCompraController.js`
- `git diff --check`
- `npm run build` em `frontend/`

### Teste funcional recomendado

- Abrir uma SC cancelada pelo link direto `/solicitacoes-compra/:id` e confirmar que ela carrega como historico.
- Confirmar que a SC cancelada nao permite abrir/gerenciar cotacao, editar quantidade ou editar apropriacao.
- Abrir o modal de apropriacao na nova solicitacao de compra e na compra direta em desktop/notebook.
- Abrir o modal de editar apropriacoes no detalhe da SC e validar se o tamanho ficou centralizado e legivel.

## Atualizacao - 2026-07-12 - Mapa de comparacao da cotacao

### Ajuste pendente de commit

- `frontend/src/modules/solicitacao-compra/pages/GerenciarCotacaoSolicitacao.jsx`
  - Adicionada visualizacao alternativa `Mapa` no comparativo por item, mantendo a visualizacao atual em `Cards`.
  - O mapa usa os dados ja retornados pelo endpoint de comparativo: itens nas linhas e fornecedores respondidos nas colunas.
  - Cada celula mostra preco, total estimado, disponibilidade, prazo, condicao de pagamento, observacao e controles de vencedor/quantidade.
  - Fornecedores podem ser exibidos/ocultados no proprio mapa.
  - O lapis reaproveita o modal existente de resposta interna do fornecedor; nao houve endpoint novo nem alteracao de backend.

### Validacao executada

- `git diff --check`
- `npm run build` em `frontend/`

### Teste funcional recomendado

- Abrir uma cotacao com dois ou mais fornecedores respondidos.
- Alternar entre `Cards` e `Mapa` e confirmar que os dados permanecem coerentes.
- Ocultar/mostrar fornecedores no mapa.
- Marcar vencedor e ajustar quantidade no mapa, depois confirmar que o botao de encerrar segue gerando/atualizando pedidos.
- Clicar no lapis de um fornecedor no mapa e confirmar que abre o modal de resposta interna ja existente.

## Atualizacao - 2026-07-12 - Mapa em tabela e resposta interna

### Ajuste pendente de commit

- `backend/src/controllers/CotacaoFornecedorController.js`
  - Preserva `data_chegada` enviada na resposta da cotacao mesmo quando a disponibilidade do item nao estiver marcada como `PARA_CHEGAR`.
- `frontend/src/modules/solicitacao-compra/pages/GerenciarCotacaoSolicitacao.jsx`
  - Modo `Mapa` ajustado para leitura em tabela, com itens em linhas e fornecedores em colunas.
  - Ranking/card de fornecedores fica restrito ao modo `Cards`.
  - Modal de resposta interna permite editar a quantidade solicitada do item usando endpoint existente de auditoria da SC antes de salvar a resposta.
  - `Preco unit.` usa mascara de moeda com ate 10 casas decimais e envia valor normalizado.
  - `Condicao de pagamento` ganhou lista selecionavel por checkbox, mantendo texto livre.
  - Data de chegada pode ser editada por item ou aplicada em massa pelo campo de cabecalho.
- `frontend/src/modules/solicitacao-compra/pages/NovaSolicitacaoCompra.jsx`
  - Modal de apropriacao ganhou mais altura util para Nova Solicitacao de Compra e Compra Direta.
- `frontend/src/modules/solicitacao-compra/pages/SolicitacaoCompraDetalheView.jsx`
  - Modal de editar apropriacoes da SC ganhou tamanho intermediario mais legivel.

### Validacao executada

- `git diff --check`
- `node -c backend/src/controllers/CotacaoFornecedorController.js`
- `npm run build` em `frontend/`

### Teste funcional recomendado

- Abrir cotacao com resposta e alternar entre `Cards` e `Mapa`, validando que o mapa aparece como tabela.
- Editar resposta interna pelo lapis: preco com virgula e varias casas decimais, condicao de pagamento, data de chegada por item e data em massa.
- Alterar quantidade solicitada dentro do modal de resposta interna e confirmar registro/auditoria.
- Abrir Nova Solicitacao de Compra e Compra Direta para validar altura do modal de apropriacao.
- Abrir detalhe da SC e validar o modal de editar apropriacoes.
