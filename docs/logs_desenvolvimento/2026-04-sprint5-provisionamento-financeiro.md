# 2026-04 - Sprint 5 do Provisionamento Financeiro

## Entregas
- dashboard gerencial do modulo
- cards consolidados:
  - total no periodo
  - proximos 7 dias
  - proximos 30 dias
  - quantidade de provisoes abertas
- agregacoes:
  - por mes
  - por obra
  - por categoria macro
  - curva semanal
  - pipeline por status
- alertas:
  - vencidas nao tratadas
  - criticas proximas
  - obras com concentracao alta
- rota frontend dedicada para o dashboard
- item de menu do dashboard dentro do grupo `Provisionamento`

## Backend
- `backend/src/controllers/ProvisaoFinanceiraDashboardController.js`
  - consolidacao das consultas agregadas
  - respeito ao escopo de obras do usuario
  - visao global apenas quando `SUPERADMIN` ou `pode_dashboard_global`
- `backend/src/routes.js`
  - nova rota `GET /provisoes-financeiras/dashboard/resumo`

## Frontend
- `frontend/src/modules/provisionamento-financeiro/pages/DashboardProvisionamentoFinanceiro.jsx`
  - filtros do dashboard
  - cards e visualizacoes graficas simples sem nova dependencia
- `frontend/src/services/provisoesFinanceiras.js`
  - chamada do dashboard
- `frontend/src/App.jsx`
  - nova rota `/provisoes-financeiras/dashboard`
- `frontend/src/layout/Layout.jsx`
  - item de menu `Dashboard Provisionamento`
  - exibicao restrita a `SUPERADMIN` e usuarios com `pode_dashboard_global`

## Validacao
- `node --check backend/src/controllers/ProvisaoFinanceiraDashboardController.js`
- `node --check backend/src/routes.js`
- `npm run build` em `frontend/`
