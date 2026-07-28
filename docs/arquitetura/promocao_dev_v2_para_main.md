# Promocao da branch dev-v2 para main

Este documento orienta a passagem de alteracoes validadas na `dev-v2` para a `main`, mantendo separacao entre staging e producao e evitando divergencia de configuracao.

## Objetivo

Promover codigo testado na V2/staging para producao com controle de risco, sem copiar segredos para o repositorio e sem misturar banco de staging com banco de producao.

## Regra principal do backend/.env

O `backend/.env` da `main` deve ter a mesma estrutura e as mesmas chaves do `backend/.env` usado na `dev-v2`.

Na promocao para producao, usar o `.env` da `dev-v2` como referencia de compatibilidade e ajustar os valores do banco de producao:

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD` ou `DB_PASS`
- `DB_NAME`

Tambem preservar os valores operacionais proprios da producao que ja pertencem ao ambiente `main`, como:

- `NODE_ENV=production`
- `PORT=8000`
- dominios publicos e `CORS_ALLOWED_ORIGINS` de producao
- nomes de processos PM2 e caminhos da pasta `main`

Na pratica: a `main` nao pode ficar sem nenhuma variavel nova criada e validada na `dev-v2`, mas os valores sensiveis e os valores de infraestrutura continuam sendo os da producao.

## Banco do Brasil e TLS na promocao

O certificado A1 e a identidade da empresa perante o Banco do Brasil e fica em `BB_CERT_PATH`. Ele e diferente da cadeia CA/TLS usada pelo Node para confiar no servidor do BB.

Regras:

- `BB_CERT_PATH` aponta para o certificado A1 da empresa, fora do repositorio.
- `BB_CERT_PASSPHRASE` fica somente no `.env` do servidor.
- `BB_CA_CERT_PATH` deve apontar para a cadeia CA oficial quando o banco exigir cadeia adicional.
- `BB_TLS_REJECT_UNAUTHORIZED` deve ser `true` em homologacao e producao; o provider real bloqueia envio quando a validacao TLS esta desativada.
- Se houver erro de cadeia TLS, resolver com `BB_CA_CERT_PATH` e cadeia CA correta, nunca relaxando a validacao TLS.
- `MFA_ENCRYPTION_KEY` deve ser configurada antes das migrations de identidade e deve ser a mesma em todas as instancias do ambiente.

## Checklist antes do merge

1. Confirmar que a `dev-v2` esta atualizada:

```bash
git checkout dev-v2
git pull --ff-only origin dev-v2
git status --short --branch
```

2. Validar backend em staging:

```bash
cd backend
npm install
npm run test:payments
curl http://127.0.0.1:8001/health
```

3. Validar frontend em staging ou local:

```bash
cd frontend
npm install
npm run build
```

4. Confirmar que migrations ja foram testadas no banco staging.

5. Confirmar que o fluxo principal continua funcionando:

- login
- criacao de solicitacao
- detalhe de solicitacao
- compras
- financeiro manual
- conciliacao/baixas existentes

## Promocao de branch

Preferencialmente fazer por Pull Request no GitHub:

1. Abrir PR de `dev-v2` para `main`.
2. Revisar arquivos alterados.
3. Conferir se nao ha `.env`, certificados, chaves ou arquivos temporarios.
4. Fazer merge somente depois das validacoes.

Fluxo local alternativo:

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git merge --no-ff origin/dev-v2
git push origin main
```

## Deploy backend main

Na EC2:

```bash
cd /home/ubuntu/sistema-gestao-solicitacoes-main
git branch --show-current
git pull --ff-only origin main
cd backend
npm install
npm run test:payments
pm2 restart backend-solicitacoes --update-env
curl http://127.0.0.1:8000/health
pm2 logs backend-solicitacoes --lines 80
```

## Deploy frontend main

Depois do push/merge para `main`, confirmar na Vercel qual projeto/ambiente esta ligado a producao e redeployar com cache limpo quando necessario.

Validar no navegador:

- tela de login
- dashboard
- solicitacoes
- financeiro
- pagamentos em massa, se o modulo estiver ativo

## Conferencia rapida do .env main

Sem expor senha:

```bash
cd /home/ubuntu/sistema-gestao-solicitacoes-main/backend
grep -E "^(NODE_ENV|PORT|DB_HOST|DB_NAME|DB_USER|BB_PAYMENTS_ENV|BB_TLS_REJECT_UNAUTHORIZED|BB_SANDBOX_REAL_ENABLED)=" .env
```

Esperado para producao:

```env
NODE_ENV=production
PORT=8000
BB_TLS_REJECT_UNAUTHORIZED=true
```

`BB_SANDBOX_REAL_ENABLED` nao deve habilitar envio real sandbox em producao. Quando houver integracao BB de producao, usar variaveis proprias de producao e credenciais/convenio aprovados.

## Rollback

Se o backend main falhar apos deploy:

1. Conferir logs:

```bash
pm2 logs backend-solicitacoes --lines 120
```

2. Conferir health:

```bash
curl http://127.0.0.1:8000/health
```

3. Se necessario, voltar para o commit anterior conhecido e reiniciar PM2, registrando o motivo no changelog operacional.

## Proibido

- copiar `.env` de staging para producao sem trocar banco e valores proprios da main.
- versionar certificados, tokens, senhas, app keys ou arquivos `.pfx`.
- usar `BB_TLS_REJECT_UNAUTHORIZED=false` em qualquer envio real.
- baixar titulo automaticamente no envio do lote BB.
- rodar migrations em producao sem validacao previa em staging.
