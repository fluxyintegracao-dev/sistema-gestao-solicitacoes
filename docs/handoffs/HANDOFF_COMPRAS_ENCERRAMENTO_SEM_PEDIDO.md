# Handoff - Compras: encerramento de cotacao sem pedido

## Estado

Implementacao concluida localmente na `dev-v2`, ainda sem commit. A migration aditiva foi criada, mas nao foi executada em nenhum banco.

## Regra implementada

- `Cancelar cotacao` e `Gerar pedidos selecionados` continuam com handlers, endpoints e regras existentes;
- a nova acao `Encerrar sem pedido` e independente e exige `compras.cotacoes.encerrar_sem_pedido`;
- o encerramento exige confirmacao e justificativa com pelo menos 10 caracteres;
- funciona sem pedido anterior ou depois de rodadas parciais;
- pedidos anteriores sao preservados;
- nenhum pedido, alocacao, frete, pendencia ou titulo financeiro e criado;
- a rodada e gravada como `SEM_PEDIDO`, com `quantidade_nao_comprada` e auditoria detalhada por item;
- a solicitacao muda para `ENCERRADO`, recebe `encerrado_em` e as cotacoes nao canceladas mudam para `FINALIZADA`;
- o endpoint de geracao existente agora rejeita novas geracoes depois de `ENCERRADO`, mas preserva replay idempotente de uma requisicao final ja concluida;
- a operacao usa lock, transacao, rate limit e chave de idempotencia propria.

## Arquivos da implementacao

- `AGENTS.md`
- `backend/migrations/202607210002_compras_encerramento_sem_pedido.js`
- `backend/scripts/validarCompraCotacaoEnvio.js`
- `backend/src/constants/moduloPermissoes.js`
- `backend/src/controllers/SolicitacaoCompraController.js`
- `backend/src/models/SolicitacaoCompraFechamento.js`
- `backend/src/routes.js`
- `backend/src/services/authorizationService.js`
- `backend/src/services/pedidoCompraService.js`
- `backend/src/validators/operationalValidators.js`
- `frontend/src/modules/solicitacao-compra/pages/GerenciarCotacaoSolicitacao.jsx`
- `frontend/src/services/compras.js`
- `frontend/src/services/configuracoesSistema.js`
- `frontend/src/utils/acessoProduto.js`
- `docs/modulos/cotacoes-pedidos/README.md`
- `docs/regras_negocio/compras.md`
- `docs/seguranca/autenticacao_autorizacao.md`

`AGENTS.md` e outros documentos do worktree ja possuiam alteracoes locais anteriores. Revisar o diff antes do commit e nao incluir automaticamente arquivos alheios a esta entrega.

## Validacoes executadas

- `npm run build` no frontend: aprovado, 308 modulos transformados;
- `npm run test:compra-cotacao-envio` no backend: aprovado;
- carga de `backend/src/routes.js`: aprovada;
- `node --check` nos arquivos backend alterados: aprovado;
- registro central confirmado com 18 grupos, 80 areas e 271 permissoes;
- `npm run test:docs` no backend: aprovado, 188 arquivos Markdown e 18 documentos canonicos;
- `git diff --check`: aprovado.

## Homologacao manual obrigatoria em dev

1. aplicar `202607210002_compras_encerramento_sem_pedido.js` antes de reiniciar o backend;
2. liberar `compras.cotacoes.encerrar_sem_pedido` para um usuario piloto e renovar a sessao;
3. confirmar que usuario sem a permissao nao ve o botao e recebe `403` no endpoint;
4. encerrar uma cotacao sem pedido anterior e conferir ausencia de pedido, alocacao, frete e titulo;
5. encerrar depois de uma rodada parcial e confirmar que pedidos anteriores permaneceram inalterados;
6. validar justificativa curta, confirmacao desmarcada, status terminal, compra direta e cotacao sem saldo;
7. repetir a mesma chave de idempotencia e confirmar replay sem nova rodada;
8. disparar gerar pedidos e encerrar sem pedido em concorrencia e confirmar apenas um resultado;
9. confirmar `ENCERRADO`, `encerrado_em`, fornecedores `FINALIZADA`, links publicos bloqueados e logs por item;
10. validar o modal e os dois botoes em notebook, tablet e smartphone;
11. cancelar posteriormente um pedido anterior e confirmar a sincronizacao auditavel do saldo para `FECHAMENTO_PARCIAL` quando aplicavel;
12. conferir relatorios de compras, custos de obra e financeiro para garantir que somente pedidos reais produzam valores.

## Proximo passo exato

Revisar o escopo do commit, publicar a `dev-v2`, aplicar a migration em dev antes do restart do processo `backend-dev`, renovar a sessao do usuario piloto, liberar a nova permissao e executar a homologacao acima antes de migrar para a `main`.
