# Regras do Modulo Compras

## Escopo
O modulo compras ja esta integrado ao sistema principal e nao deve ser tratado como projeto separado.

## Dependencias estruturais
Backend:
- `backend/src/app.js`
- `backend/src/routes.js`
- `backend/src/models/index.js`
- `backend/src/models/User.js`
- `backend/src/controllers/SolicitacaoCompraController.js`

Frontend:
- `frontend/src/App.jsx`
- `frontend/src/layout/Layout.jsx`
- `frontend/src/services/compras.js`
- `frontend/src/modules/solicitacao-compra/pages/`

## Regras de acesso
- `SUPERADMIN` e `ADMIN` possuem acesso
- outros usuarios dependem de `pode_criar_solicitacao_compra`

## Ponto de cuidado
Qualquer ajuste no payload de login, menu lateral, models de usuario ou bootstrap do banco pode afetar o modulo compras.
