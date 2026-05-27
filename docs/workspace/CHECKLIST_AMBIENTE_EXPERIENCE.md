# Checklist De Ambiente FLUXY Experience

## Objetivo

Preparar o FLUXY Experience para operar separado do Core, antes de iniciar Portal Cliente e CRM.

## Arquitetura Alvo

```text
Frontend Experience
experience.jrfluxy.com.br
Vercel

API Experience
experience-api.jrfluxy.com.br
EC2

Banco Experience
database separado no RDS

Core Gateway
api-dev.jrfluxy.com.br/api/gateway
HMAC server-side
```

## Banco De Dados

- Criar banco separado para o Experience no RDS.
- Nao reutilizar o banco do Core.
- Nao criar views diretas para tabelas do Core.
- Nao liberar usuario do banco Experience com permissao no banco Core.
- Rodar migrations do Experience apenas no banco Experience.

## API Experience

Variaveis esperadas:

```env
NODE_ENV=production
PORT=4000
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=
CORS_ALLOWED_ORIGINS=https://experience.jrfluxy.com.br
FLUXY_CORE_GATEWAY_BASE_URL=https://api-dev.jrfluxy.com.br
FLUXY_CORE_GATEWAY_BASE_PATH=/api/gateway
FLUXY_CORE_GATEWAY_CLIENT_ID=
FLUXY_CORE_GATEWAY_SECRET=
USE_CORE_GATEWAY_MOCK=false
JWT_SECRET=
ADMIN_JWT_SECRET=
```

Regras:

- `FLUXY_CORE_GATEWAY_SECRET` nunca vai para frontend.
- `USE_CORE_GATEWAY_MOCK=false` apenas quando Core Gateway estiver validado.
- Se o Core Gateway falhar, Experience deve usar fallback controlado apenas onde estiver previsto.

## Frontend Experience

Variaveis esperadas na Vercel:

```env
NEXT_PUBLIC_SITE_URL=https://experience.jrfluxy.com.br
NEXT_PUBLIC_EXPERIENCE_API_URL=https://experience-api.jrfluxy.com.br
```

Regras:

- Nao declarar segredo HMAC como `NEXT_PUBLIC_*`.
- Nao chamar `api-dev.jrfluxy.com.br` diretamente do browser.
- Browser chama API Experience; API Experience chama Core Gateway.

## Core

Variaveis esperadas no backend Core:

```env
CORE_GATEWAY_ENABLED=true
CORE_GATEWAY_CLIENT_ID=
CORE_GATEWAY_CLIENT_SECRET=
CORE_GATEWAY_ALLOWED_ORIGINS=https://experience-api.jrfluxy.com.br
CORE_GATEWAY_RATE_LIMIT_WINDOW_MS=60000
CORE_GATEWAY_RATE_LIMIT_MAX=120
CORE_GATEWAY_SIGNATURE_TOLERANCE_MS=300000
```

Observacao:

- `CORE_GATEWAY_CLIENT_SECRET` no Core deve ser igual ao `FLUXY_CORE_GATEWAY_SECRET` na API Experience.
- `CORE_GATEWAY_CLIENT_ID` no Core deve ser igual ao `FLUXY_CORE_GATEWAY_CLIENT_ID` na API Experience.

## Testes Antes Do Portal/CRM

### Core

```bash
curl https://api-dev.jrfluxy.com.br/api/gateway/health
```

Resultado esperado:

```json
{
  "success": true
}
```

### Experience API

```bash
curl https://experience-api.jrfluxy.com.br/api/admin/gateway/health
```

Resultado esperado:

```json
{
  "online": true,
  "mode": "real"
}
```

### Comercial

Validar no Experience:

- mapa de unidades;
- lista de empreendimentos;
- lista de unidades;
- simulador com disclaimer nao oficial;
- fallback visivel apenas quando Core Gateway falhar.

### Portal Auth

Antes de construir o Portal, validar apenas o endpoint de autorizacao:

```text
POST /api/gateway/portal/autorizacao
```

Ele deve:

- confirmar cliente oficial;
- negar documento divergente;
- negar parceiro inativo;
- negar parceiro sem `cliente = true`;
- negar cliente sem contrato autorizado;
- nao retornar parcelas, boletos, documentos ou dashboard.

## Go / No-Go Para Iniciar Portal E CRM

### Go

- Core Gateway comercial funcionando.
- API Experience em modo real.
- Banco Experience separado.
- CORS correto.
- Secrets apenas no backend.
- Portal auth validado.
- Documentacao atualizada.

### No-Go

- Frontend chamando Core diretamente.
- Chave HMAC em `NEXT_PUBLIC_*`.
- Experience acessando banco Core.
- Portal auth sem teste de negativa.
- Simulacao sendo tratada como proposta oficial.
