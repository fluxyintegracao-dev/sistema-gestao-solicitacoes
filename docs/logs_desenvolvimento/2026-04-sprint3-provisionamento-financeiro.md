# 2026-04 - Sprint 3 do Provisionamento Financeiro

## Entregas
- filtros avancados na listagem do modulo
- persistencia de filtros por usuario
- ordenacao configuravel
- totalizador do valor filtrado
- contador de registros filtrados
- exportacao CSV da listagem filtrada
- mascara monetaria para `valor_previsto` no cadastro e na edicao
- checklist de obras permitidas na configuracao do modulo

## Backend
- `backend/src/controllers/ProvisaoFinanceiraController.js`
  - ampliacao dos filtros aceitos
  - soma filtrada via `SUM(valor_previsto)`
  - retorno de resumo na listagem
  - exportacao CSV
  - normalizacao monetaria ajustada para aceitar decimal puro e valor mascarado
- `backend/src/routes.js`
  - nova rota `GET /provisoes-financeiras/exportar`

## Frontend
- `frontend/src/modules/provisionamento-financeiro/pages/ProvisionamentosFinanceiros.jsx`
  - filtros completos
  - persistencia local
  - cards-resumo
  - exportacao CSV
- `frontend/src/modules/provisionamento-financeiro/pages/NovaProvisaoFinanceira.jsx`
  - mascara monetaria no valor previsto
- `frontend/src/modules/provisionamento-financeiro/pages/ProvisionamentoFinanceiroDetalhe.jsx`
  - mascara monetaria na edicao
- `frontend/src/modules/provisionamento-financeiro/pages/ConfiguracaoProvisionamentoFinanceiro.jsx`
  - multi-selecao de obras por checkbox
- `frontend/src/modules/provisionamento-financeiro/utils/moeda.js`
  - utilitario compartilhado de moeda

## Validacao
- `node --check backend/src/controllers/ProvisaoFinanceiraController.js`
- `node --check backend/src/routes.js`
- `npm run build` em `frontend/`
