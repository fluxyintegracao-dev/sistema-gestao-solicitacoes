# Infra e Deploy

## Backend
Deploy padrao:
```bash
cd ~/sistema-gestao-solicitacoes
git fetch origin
git checkout main
git reset --hard origin/main
cd backend
npm install
pm2 restart backend-solicitacoes --update-env
```

## Frontend
- push para `main`
- redeploy na Vercel

## Confirmacoes pos deploy
- `pm2 logs backend-solicitacoes --lines 50`
- `curl -I http://127.0.0.1:8000/health`
- `sudo tail -n 50 /var/log/nginx/error.log`

## Contingencia conhecida
Se houver timeout recorrente e necessidade de estabilizacao rapida, ha plano para desligar o modulo de comunicacao interna sem afetar solicitacoes e compras. Ver `docs/prompts_padrao/contingencia-comunicacao.md`.
