# Superficie de Risco

## Banco
- `sequelize.sync({ alter: true })` ainda esta habilitado
- mudancas em models podem gerar DDL em producao
- `backend/src/app.js` executa SQL idempotente no startup

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
