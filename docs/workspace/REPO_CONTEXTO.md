# Contexto do Repositorio FLUXY

## Papel

Este repositorio contem o sistema institucional e a fonte oficial de suas regras operacionais.

## Responsabilidades

- frontend web;
- backend e banco;
- aplicativo mobile;
- solicitacoes, obras, contratos, compras e financeiro;
- comercial operacional, CRM, RH/DP, SST e fiscal;
- seguranca, permissoes, auditoria e governanca.

## Arquivos de alto risco

- `backend/src/routes.js`;
- `backend/src/services/authorizationService.js`;
- `backend/src/services/moduleConfigService.js`;
- `backend/src/constants/moduloPermissoes.js`;
- models e migrations financeiras;
- `frontend/src/App.jsx`;
- `frontend/src/layout/Layout.jsx`;
- `frontend/src/utils/acessoProduto.js`.

Qualquer integracao com outro repositorio deve usar contratos explicitos e nao pode acessar diretamente o banco do FLUXY.
