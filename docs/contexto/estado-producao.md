# Estado Atual de Producao

## Infra
- API publicada em `api.jrfluxy.com.br`
- Frontend publicado em `jrfluxy.com.br`, `www.jrfluxy.com.br` e `csc.jrfluxy.com.br`
- PM2 process: `backend-solicitacoes`
- Nginx faz proxy para `127.0.0.1:8000`

## Runtime ativo
Backend:
- `backend/server.js`
- `backend/src/app.js`
- `backend/src/routes.js`

Frontend:
- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/layout/Layout.jsx`

## Observacoes operacionais
- `backend/uploads/` contem artefatos antigos preservados e nao deve ser limpo automaticamente.
- O repositorio nao usa mais `python-service`; o runtime ativo e apenas Node + React.
- O backend executa migrations pendentes por `runMigrations()` e nao depende de `sequelize.sync({ alter: true })` no runtime normal. Qualquer mudanca de model precisa de migration controlada.

## Monitoramento basico
- PM2: `pm2 logs backend-solicitacoes --lines 30`
- Nginx errors: `sudo tail -f /var/log/nginx/error.log`
- Nginx access: `sudo tail -f /var/log/nginx/access.log | grep --line-buffered "/api/"`
