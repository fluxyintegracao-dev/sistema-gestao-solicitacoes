# 2026-04 - Sprint 2 - Provisionamento Financeiro

## Objetivo
Entregar o modulo em operacao controlada, com CRUD basico, categorias macro, historico inicial e anexos, sem interferir no fluxo principal do FLUXY.

## Entregas
- controller de categorias macro
- CRUD inicial de provisoes financeiras
- validacao de acesso por obra nas acoes do modulo
- historico de criacao, edicao, comentarios e anexos
- upload/listagem de anexos com reaproveitamento do padrao atual de S3
- listagem inicial do modulo
- tela de nova provisao
- tela de detalhe com edicao basica, comentarios e anexos
- tela de gestao de categorias macro
- menu lateral condicionado ao acesso do usuario ao modulo

## Regras desta etapa
- o modulo continua isolado dos fluxos de solicitacao e compra
- mudanca de obra apos a criacao nao e permitida
- nesta fase, o usuario pode editar apenas provisoes em `previsto` ou `em_analise`
- aprovacao, cancelamento e realizado ficam para a etapa seguinte

## Validacao executada
- `node --check` dos novos controllers/services/rotas
- `npm run build` no frontend
