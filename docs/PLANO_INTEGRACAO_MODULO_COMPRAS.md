# Plano e historico do modulo compras

## 1. Objetivo
Registrar como o modulo compras foi incorporado ao sistema principal e quais pontos precisam ser preservados em manutencao futura.

## 2. Status atual
A integracao do modulo compras esta concluida no runtime principal.

Concluido:
- backend com tabelas, models, controladores, rotas e geracao de PDF
- frontend com servicos, rotas protegidas, menu e telas operacionais
- permissao de acesso por perfil e pela flag `pode_criar_solicitacao_compra`
- relacionamento com a solicitacao principal do sistema
- cotacao publica por token

## 3. Arquivos centrais da integracao
Backend:
- `backend/src/app.js`
- `backend/src/routes.js`
- `backend/src/models/index.js`
- `backend/src/models/User.js`
- `backend/src/controllers/AuthController.js`
- `backend/src/controllers/UsuarioController.js`
- `backend/src/controllers/SolicitacaoCompraController.js`
- `backend/src/controllers/FornecedorCompraController.js`
- `backend/src/controllers/CotacaoFornecedorController.js`
- `backend/src/services/comprasCotacao.js`

Frontend:
- `frontend/src/App.jsx`
- `frontend/src/layout/Layout.jsx`
- `frontend/src/services/compras.js`
- `frontend/src/pages/UsuarioNovo.jsx`
- `frontend/src/modules/solicitacao-compra/pages/`

## 4. Dependencias da funcionalidade
Backend:
- `pdfkit`
- `sequelize`
- `mysql2`
- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`

Frontend:
- React
- React Router
- Vite

## 5. Regras que nao podem ser perdidas
- usuario precisa ter acesso ao menu e as rotas do modulo quando autorizado
- backend precisa continuar validando compras por perfil, flag de usuario e escopo setorial aceito
- `backend/src/models/index.js` precisa continuar registrando os models `SolicitacaoCompra*`
- `backend/src/routes.js` precisa continuar publicando as rotas `/compras/*` e `/cotacoes/:token`
- `frontend/src/App.jsx` precisa continuar declarando as rotas do modulo
- `frontend/src/layout/Layout.jsx` precisa continuar exibindo o grupo `Compras` quando permitido
- `frontend/src/services/compras.js` precisa continuar apontando para a API correta

## 6. Riscos principais em manutencao
- remover referencias ao modulo em `App.jsx` ou `Layout.jsx`
- alterar `AuthController`, `UsuarioController` ou `User.js` sem preservar `pode_criar_solicitacao_compra`
- alterar `models/index.js` e perder associacoes do modulo
- alterar `routes.js` e perder endpoints de compras
- limpar arquivos antigos de forma agressiva e tocar artefatos de `backend/uploads/`

## 7. Estrategia recomendada para evolucao futura
1. validar sempre backend e frontend antes de commit
2. tratar compras como modulo critico, nao como extensao opcional
3. revisar impacto no fluxo principal sempre que houver alteracao em compras
4. registrar em `docs/RELATORIO_FUNCIONALIDADES_REGRAS_E_VALOR.md` qualquer mudanca relevante de regra
5. atualizar `AGENTS.md` quando a mudanca alterar contexto operacional ou risco de deploy

## 8. Backlog recomendado
- ampliar testes automatizados do modulo compras
- documentar payloads e respostas das rotas principais do modulo
- revisar bundle do frontend para reduzir tamanho do build
- definir politica para arquivos operacionais e uploads no repositorio
