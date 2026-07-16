# Handoff - Filtro de status em todas as paginas de solicitacoes

## Objetivo

Fazer o filtro de status listar os status existentes em todas as solicitacoes visiveis para o usuario, sem alterar as regras de visibilidade e sem limitar as opcoes a pagina atual.

## Arquivos alterados

- `backend/src/controllers/SolicitacaoController.js`
- `backend/src/routes.js`
- `frontend/src/pages/Solicitacoes/index.jsx`
- `frontend/src/services/solicitacoes.js`

## Implementacao

- Criado `GET /solicitacoes/filtros/status`.
- O endpoint reutiliza integralmente `SolicitacaoController.index` e retorna os status distintos somente depois das regras existentes de visibilidade e dos filtros posteriores por tipo.
- A consulta de status ignora o proprio parametro `status` e acontece antes da paginacao.
- O frontend deixou de derivar as opcoes pela pagina carregada e passou a consumir o novo endpoint.
- A filtragem da lista continua sendo realizada no backend antes de `limit` e `offset`.

## Validacoes executadas

- `node --check src/controllers/SolicitacaoController.js`
- `node --check src/routes.js`
- `npm run build` no frontend
- `git diff --check`

## Teste manual recomendado

1. Entrar com usuario que possua mais de uma pagina de solicitacoes.
2. Confirmar que o filtro lista um status existente somente em pagina posterior.
3. Selecionar esse status e confirmar que a solicitacao aparece na pagina 1 do resultado filtrado.
4. Repetir com perfil restrito para confirmar que nenhum status fora do escopo autorizado aparece.
5. Validar separadamente a tela de solicitacoes arquivadas.

## Proximo passo

Publicar em dev e executar o teste manual acima antes de migrar para main.
