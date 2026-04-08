# 2026-04 - Modernizacao visual dos dashboards

## Escopo
- dashboard executivo principal
- dashboard do modulo de provisionamento financeiro

## Objetivo
- elevar a leitura gerencial sem alterar regras de negocio
- manter compatibilidade com o design atual do sistema
- destacar sinais para tomada de decisao com menos densidade cognitiva

## Entregas
- nova hierarquia visual com hero, cards de KPI e paineis de leitura
- cards de destaque com foco em volume, exposicao, pendencia e concentracao
- listas visuais modernizadas para status, areas, pipeline, obras e categorias
- blocos de leitura executiva com linguagem mais orientada a decisao
- refinamento visual reutilizavel em `frontend/src/index.css`

## Arquivos
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/modules/provisionamento-financeiro/pages/DashboardProvisionamentoFinanceiro.jsx`
- `frontend/src/index.css`

## Validacao
- `npm run build` em `frontend/`
