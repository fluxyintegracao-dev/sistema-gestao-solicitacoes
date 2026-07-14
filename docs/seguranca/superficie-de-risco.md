# Superficie de Risco

## Banco
- O startup atual nao usa `sequelize.sync({ alter: true })`; a inicializacao passa por `backend/src/database/runMigrations.js`.
- A migration legada `202603280001_legacy_schema_bootstrap.js` nao executa `sequelize.sync()` por padrao.
- Bootstrap legado por `sequelize.sync()` so pode ocorrer com `ALLOW_LEGACY_SCHEMA_BOOTSTRAP_SYNC=true`, e deve ser usado apenas em ambiente controlado para reconstrucoes antigas.
- Mudancas em models nao devem gerar DDL automaticamente em producao; toda mudanca estrutural precisa entrar por migration idempotente.

## Comunicacao interna
- historico de pressao por polling e listagens pesadas
- qualquer expansao funcional precisa considerar carga no banco

## Uploads e arquivos
- anexos usam S3 com URLs assinadas
- sistema ainda suporta arquivos antigos em `/uploads`
- nao remover `backend/uploads/` em limpezas de codigo

## Permissoes
- payload de login e menu lateral impactam compras e operacao diaria
- regras de setor precisam ser validadas no backend, nao apenas no frontend

## Infra
- se o backend nao responde em `127.0.0.1:8000`, o Nginx devolve `502`
- erros relevantes no Nginx sao `upstream timed out`, `connect() failed`, `502`, `504`
- pendencia de hardening: restringir `connectSrc` da CSP em `backend/src/app.js`.
  - estado atual permite origens genericas (`http:`, `https:`, `ws:`, `wss:`) em producao.
  - impacto atual avaliado como baixo no curto prazo porque o frontend principal roda na Vercel, mas a protecao da CSP fica enfraquecida para qualquer resposta servida pelo backend.
  - caminho recomendado: aplicar primeiro em modo `Content-Security-Policy-Report-Only`, mapear dominios reais usados por API, Vercel, S3 e integracoes externas, testar login, anexos, cotacao publica e fluxos financeiros, depois transformar em CSP bloqueante.
