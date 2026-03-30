# Runtime Ativo

## Backend
- Entry: `backend/server.js`
- Bootstrap: `backend/src/app.js`
- Rotas: `backend/src/routes.js`
- Banco: Sequelize + MySQL
- Autenticacao: middleware em `backend/src/middlewares/auth.js`

## Frontend
- Entry: `frontend/src/main.jsx`
- Router principal: `frontend/src/App.jsx`
- Shell da aplicacao: `frontend/src/layout/Layout.jsx`
- Auth context: `frontend/src/contexts/AuthContext.jsx`

## Integracoes externas
- RDS MySQL
- S3 para anexos e comprovantes
- Vercel para frontend
- EC2 + Nginx + PM2 para backend

## Decisao importante
Qualquer refactor que toque nesses entrypoints deve ser tratado como alteracao estrutural.
