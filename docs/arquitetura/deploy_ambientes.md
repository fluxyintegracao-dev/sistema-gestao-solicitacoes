# Deploy e Ambientes

## Runtime de producao

- API: `api.jrfluxy.com.br`;
- backend: EC2 com PM2, processo `backend-solicitacoes`;
- proxy: Nginx para `127.0.0.1:8000`;
- frontend: Vercel;
- banco: MySQL;
- arquivos: S3.

## Sequencia do backend

1. confirmar backup e commit alvo;
2. atualizar o codigo;
3. executar `npm install` em `backend/`;
4. revisar migrations pendentes;
5. reiniciar com `pm2 restart backend-solicitacoes --update-env`;
6. validar health check, login e logs;
7. executar smoke tests dos modulos afetados.

## Sequencia do frontend

1. executar build local;
2. publicar a revisao aprovada;
3. validar login, navegacao e chamadas autenticadas;
4. conferir os fluxos alterados em resolucao de notebook e mobile.

## Rollback

Rollback de codigo nao implica rollback automatico de banco. Toda migration deve ter estrategia de compatibilidade e restauracao. Nunca apagar dados operacionais para adequar uma versao anterior.

## Observabilidade

- `pm2 logs backend-solicitacoes --lines 100`;
- logs de acesso e erro do Nginx;
- eventos de auditoria da aplicacao;
- health checks e jobs da governanca.
