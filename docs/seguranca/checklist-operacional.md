# Checklist Operacional de Seguranca

## Antes de deploy
- confirmar branch e commit
- confirmar backup funcional ou branch de rollback
- revisar impacto em `backend/src/app.js`, `backend/src/routes.js`, `frontend/src/App.jsx` e `frontend/src/layout/Layout.jsx`
- revisar alteracoes de permissao e visibilidade
- revisar mudancas de banco

## Depois de deploy
- validar `pm2 logs backend-solicitacoes --lines 50`
- validar `sudo tail -n 50 /var/log/nginx/error.log`
- validar `curl -I http://127.0.0.1:8000/health`
- validar login, solicitacoes e modulo compras

## Arquivos sensiveis
- `.env`
- `backend/src/app.js`
- `backend/src/routes.js`
- `backend/src/models/index.js`
- `backend/src/models/User.js`
- `frontend/src/App.jsx`
- `frontend/src/layout/Layout.jsx`
