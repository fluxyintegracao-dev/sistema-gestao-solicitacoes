# Handoff - Simplificacao segura do SST

## Objetivo

Ativar um modo simplificado e reversivel para o modulo SST, mantendo os fluxos
operacionais essenciais, acrescentando LTCAT e preservando historico e dados dos
fluxos legados.

## Comportamento implementado

- O modo simplificado fica ativo por padrao.
- `SST_SIMPLIFIED_MODE=false` restaura o backend completo.
- `VITE_SST_SIMPLIFIED_MODE=false` restaura a navegacao completa no frontend.
- Recursos mantidos: PGR, PCMSO, ASO, exames, EPI, treinamentos, documentos,
  LTCAT e avaliacoes quantitativas.
- O menu principal lista somente esses nove recursos enquanto o modo
  simplificado estiver ativo.
- A entrada `/sst`, dashboards, relatorios e o acesso direto ao eSocial legado
  redirecionam para o primeiro recurso simplificado permitido ao usuario.
- Recursos legados continuam disponiveis em modo de consulta historica.
- Novas escritas em recursos legados retornam HTTP 410 com o codigo
  `SST_LEGACY_FLOW_DISABLED`.
- Nenhuma tabela ou permissao legada e excluida.
- Permissoes legadas ficam ocultas da configuracao enquanto o modo simplificado
  estiver ativo, mas sao preservadas ao salvar outras permissoes.

## Estrutura adicionada

- Models `SstLtcat` e `SstLtcatAvaliacao`.
- Migration `202607210003_sst_ltcat_simplificacao.js`.
- Recursos genericos `ltcat` e `avaliacoes_quantitativas`.
- Permissoes granulares de visualizacao e gerenciamento para os dois recursos.

## Arquivos principais

- `backend/src/modules/sst/constants/sstSimplificationPolicy.js`
- `backend/src/modules/sst/routes/index.js`
- `backend/src/modules/sst/models/SstLtcat.js`
- `backend/src/modules/sst/models/SstLtcatAvaliacao.js`
- `backend/src/controllers/PermissoesAreasController.js`
- `frontend/src/App.jsx`
- `frontend/src/layout/Layout.jsx`
- `frontend/src/modules/sst/constants/sstResources.js`
- `frontend/src/modules/sst/pages/SstCrudPage.jsx`

## Validacao

- Smoke executavel: `cd backend && npm run test:smoke-sst`.
- O smoke valida recursos mantidos, consulta historica, bloqueio de escrita
  legada, registro das permissoes, modo reversivel, bootstrap dos models e a
  ligacao do modo simplificado ao menu e às rotas reais do frontend.
- Validacoes concluidas em 22/07/2026:
  - `npm run test:smoke-sst`: aprovado;
  - verificacao sintatica dos arquivos alterados do backend: aprovada;
  - `npm run build` no frontend: aprovado;
  - `git diff --check`: aprovado, sem erro de whitespace.
- A migration deve ser executada primeiro em dev e validada antes da producao.

## Deploy e rollback

1. Executar `npm install` no backend.
2. Executar `npm run migrate`.
3. Executar `npm run test:smoke-sst`.
4. Reiniciar somente o processo PM2 do ambiente correspondente.

Rollback funcional sem apagar dados: definir `SST_SIMPLIFIED_MODE=false` no
backend e `VITE_SST_SIMPLIFIED_MODE=false` no frontend, depois fazer o redeploy.
