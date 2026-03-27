# Checklist de ativacao e validacao do modulo compras

## 1. Estado atual
O modulo compras esta integrado ao sistema principal e faz parte do runtime ativo.

Ja implementado:
- estruturas de banco tratadas pelo backend
- modelos Sequelize do modulo
- rotas `/compras/*`
- cotacao publica por token em `/cotacoes/:token`
- telas React do modulo em `frontend/src/modules/solicitacao-compra/`
- menu e controle de acesso por perfil e pela flag `pode_criar_solicitacao_compra`
- integracao com a solicitacao principal do fluxo comum

## 2. Antes de alterar ou publicar
- confirmar integridade dos arquivos canonicamente ativos:
  - `backend/src/app.js`
  - `backend/src/routes.js`
  - `backend/src/models/index.js`
  - `backend/src/controllers/SolicitacaoCompraController.js`
  - `backend/src/controllers/UsuarioController.js`
  - `backend/src/controllers/AuthController.js`
  - `backend/src/models/User.js`
  - `frontend/src/App.jsx`
  - `frontend/src/layout/Layout.jsx`
  - `frontend/src/services/compras.js`
- nao substituir arquivos canonicamente ativos por snapshots antigos
- nao remover dados em `backend/uploads/`

## 3. Validacoes tecnicas minimas
Backend:
- `node --check backend/server.js`
- `node --check backend/src/app.js`
- `node --check backend/src/routes.js`
- `node --check backend/src/controllers/SolicitacaoCompraController.js`

Frontend:
- `npm run build` em `frontend/`

## 4. Validacoes funcionais minimas
- login com usuario autorizado ao modulo compras
- menu `Compras` visivel quando permitido
- acesso a `Solicitacoes de Compra`
- abertura de `Nova Solicitacao de Compra`
- revisao e finalizacao da solicitacao
- abertura do detalhe da solicitacao de compra
- geracao ou download do PDF
- consulta das rotas auxiliares:
  - `/compras/unidades`
  - `/compras/categorias`
  - `/compras/insumos`
  - `/compras/apropriacoes`
- validacao do relacionamento com a solicitacao principal

## 5. Validacoes de permissao
- usuario sem permissao nao deve acessar rotas do modulo no frontend
- backend deve negar acesso quando o usuario nao atender aos criterios de compras
- `SUPERADMIN` e `ADMIN` mantem acesso
- usuario com `pode_criar_solicitacao_compra` deve manter acesso

## 6. Deploy seguro
Backend:
1. `git pull`
2. `npm install` em `backend/`, se necessario
3. `pm2 restart backend-solicitacoes --update-env`
4. validar logs

Frontend:
1. `git push`
2. redeploy na Vercel
3. validar rotas do modulo no ambiente publicado

## 7. Sinais de alerta
- sumico do grupo `Compras` no menu para usuarios que deveriam ter acesso
- erro 403 inesperado no modulo
- falha em criar a solicitacao principal associada
- erro em `/compras/solicitacoes/:id/pdf`
- quebra de `AuthController`, `UsuarioController` ou `models/User`
- quebra de `backend/src/models/index.js` ou `backend/src/routes.js`

## 8. Rollback conceitual
Se uma alteracao quebrar o modulo:
- restaurar os arquivos canonicamente ativos da ultima revisao funcional valida
- reaplicar deploy do backend
- reaplicar deploy do frontend
- validar login, fluxo principal e compras antes de encerrar a manutencao
