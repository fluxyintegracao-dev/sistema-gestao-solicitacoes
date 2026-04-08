# 2026-04 - Sprint 6 do Provisionamento Financeiro

## Entregas
- hardening do modulo para uso em producao ampliada
- restricao adicional de obras para perfil `USUARIO` com base nos vinculos reais em `usuarios_obras`
- alinhamento da listagem backend para suportar ate `200` itens por pagina
- migration complementar de indices para:
  - lookup de permissoes do modulo
  - relacao permissao x obra
  - vinculos `usuarios_obras`
  - filtros principais da listagem/dashboard com `deletedAt`

## Backend
- `backend/src/services/provisaoFinanceira/permissoes.js`
  - interseccao de `obras_acesso`, `obras_criacao` e `obras_aprovacao` com `usuarios_obras` para perfil `USUARIO`
- `backend/src/controllers/ProvisaoFinanceiraController.js`
  - limite maximo da paginacao ajustado para `200`
- `backend/migrations/add-provisionamento-financeiro-hardening-indexes.sql`
  - indices idempotentes de performance e lookup

## Deploy
- aplicar a migration:
  - `backend/migrations/add-provisionamento-financeiro-hardening-indexes.sql`
- atualizar backend no EC2
- reiniciar `backend-solicitacoes`
- redeploy do frontend

## Validacao
- `node --check backend/src/controllers/ProvisaoFinanceiraController.js`
- `node --check backend/src/services/provisaoFinanceira/permissoes.js`
- `npm run build` em `frontend/`
