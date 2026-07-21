# Handoff - Cotacao com prazo geral e sem data por item

## Estado

Implementacao concluida localmente na `dev-v2`, ainda sem commit. Nenhuma migration, rota, permissao ou alteracao de banco foi criada nesta entrega.

## Regra implementada

- o prazo de entrega permanece geral para toda a resposta do fornecedor;
- o fornecedor e o operador interno informam a quantidade de dias e escolhem entre dias corridos e dias uteis;
- a interface publica e o modal interno nao solicitam mais data de chegada por item;
- o mapa comparativo nao exibe mais data de chegada por item e apresenta o prazo geral como `Prazo entrega`;
- nao existe calculo de data prevista, portanto nao e necessaria tabela de feriados nesta etapa;
- o backend continua aceitando, persistindo e serializando `data_chegada` para compatibilidade com registros e clientes legados;
- novas respostas enviadas pelas interfaces atuais nao incluem `data_chegada` no payload.

## Arquivos da implementacao

- `frontend/src/modules/solicitacao-compra/pages/CotacaoFornecedorPublica.jsx`
- `frontend/src/modules/solicitacao-compra/pages/GerenciarCotacaoSolicitacao.jsx`
- `backend/scripts/validarCompraCotacaoEnvio.js`
- `docs/modulos/cotacoes-pedidos/README.md`
- `docs/regras_negocio/compras.md`

Existem alteracoes documentais e arquivos nao rastreados anteriores no worktree. Eles nao pertencem necessariamente a esta entrega e nao devem ser incluidos automaticamente em um commit.

## Validacoes executadas

- `npm run test:compra-cotacao-envio` no backend: aprovado;
- `npm run test:docs` no backend: aprovado, 187 arquivos Markdown e 18 documentos canonicos;
- `npm run build` no frontend: aprovado;
- auditoria por busca: nenhuma referencia a `data_chegada` permanece nas duas paginas alteradas;
- `git diff --check`: aprovado.

## Validacao manual recomendada em dev

1. abrir uma cotacao pelo link publico e confirmar que existe somente `Prazo de entrega` com quantidade de dias e tipo do prazo;
2. salvar rascunho e finalizar uma resposta para cada tipo de prazo;
3. editar a mesma resposta internamente e confirmar a ausencia de `Data chegada para todos` e da coluna por item;
4. confirmar no mapa em cards e tabela que `Prazo entrega` mostra, por exemplo, `7 dias uteis` ou `10 dias corridos`;
5. conferir notebook, tablet e smartphone, especialmente a rolagem horizontal da tabela de itens;
6. abrir uma resposta historica que possua `data_chegada` e confirmar que a consulta continua funcionando, mesmo sem exibir o campo legado.

## Proximo passo exato

Executar a validacao manual em dev. Depois, revisar o escopo do commit para incluir somente os cinco arquivos da implementacao e este handoff, preservando as demais mudancas locais do worktree.
