# Handoff - filtros e exportacao de solicitacoes

## Escopo executado

- Debounce da consulta de solicitacoes ajustado para 450 ms.
- Datas malformadas ou fora de 1900-2200 impedem a consulta no frontend.
- Backend responde `400` para datas ou intervalos invalidos, em vez de ignorar silenciosamente o filtro.
- Exportacao sem selecao percorre todas as paginas filtradas usando o endpoint existente e limite de 200 por pagina.
- Exportacao com selecao continua exportando somente os registros selecionados.
- Procedimento de observabilidade Nginx registrado em `docs/arquitetura/nginx-observabilidade-tempos.md`.

## Decisao explicita

Nao foi implementado cancelamento de requisicoes antigas com `AbortController`, conforme decisao do responsavel pelo sistema.

## Validacoes pendentes no ambiente

- Digitar uma data incompleta/invalida e confirmar que nenhuma consulta e disparada.
- Informar periodo final anterior ao inicial e confirmar o bloqueio.
- Digitar rapidamente no filtro de codigo e confirmar uma unica consulta apos a pausa.
- Exportar sem selecionar registros e conferir que o CSV contem todas as paginas filtradas.
- Exportar com selecao e conferir que o CSV contem apenas as selecionadas.
- Ativar a configuracao Nginx na EC2 com `nginx -t` antes do reload.

## Validacoes tecnicas concluidas

- `node --check backend/src/controllers/SolicitacaoController.js`
- `npm run build` no frontend
- `git diff --check`
