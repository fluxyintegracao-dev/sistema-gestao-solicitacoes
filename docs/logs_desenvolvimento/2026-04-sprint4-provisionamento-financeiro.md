# 2026-04 - Sprint 4 do Provisionamento Financeiro

## Entregas
- aprovacao formal de provisoes
- cancelamento formal de provisoes
- marcacao de provisoes como realizadas
- auditoria especifica de mudancas de status
- acoes gerenciais expostas no detalhe do registro
- ajuste de UX da listagem:
  - selecao clicando na linha inteira
  - remocao dos cards auxiliares de pagina/selecionadas
  - remocao dos botoes extras de selecao no rodape
- ajuste de status manual:
  - `previsto -> em_analise`
  - `em_analise -> previsto`
  - disponivel para superadmin e usuarios com permissao de aprovacao
- restricao de permissao:
  - edicao de campos do registro restrita ao `SUPERADMIN`
  - alteracao manual de status restrita a `SUPERADMIN` e usuarios com `pode_aprovar`

## Backend
- `backend/src/controllers/ProvisaoFinanceiraController.js`
  - novos endpoints de transicao:
    - `aprovar`
    - `cancelar`
    - `realizar`
  - historico de `STATUS_ALTERADO`
  - historicos especificos:
    - `APROVADA`
    - `CANCELADA`
    - `REALIZADA`
    - `STATUS_ALTERADO_MANUAL`
- `backend/src/routes.js`
  - novas rotas protegidas por permissao de aprovacao

## Frontend
- `frontend/src/modules/provisionamento-financeiro/pages/ProvisionamentosFinanceiros.jsx`
  - selecao de registros clicando na linha
  - exportacao CSV das selecionadas
  - seletor de pagina no rodape
- `frontend/src/modules/provisionamento-financeiro/pages/ProvisionamentoFinanceiroDetalhe.jsx`
  - botoes de aprovar, cancelar e realizar
  - exibicao de aprovador/cancelador e datas
- `frontend/src/services/provisoesFinanceiras.js`
  - chamadas para aprovar, cancelar e realizar

## Validacao
- `node --check backend/src/controllers/ProvisaoFinanceiraController.js`
- `node --check backend/src/routes.js`
- `npm run build` em `frontend/`
