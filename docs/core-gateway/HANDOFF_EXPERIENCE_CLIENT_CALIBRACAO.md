# Handoff - Calibracao Core Gateway Client no FLUXY Experience

## Contexto

O FLUXY Experience implementou o `coreGatewayClient.js`, mas a sessao auxiliar nao tinha acesso direto ao repositorio `C:\Fluxy`.

Por isso, o client foi criado com headers genericos:

```text
X-Gateway-Timestamp
X-Gateway-Nonce
X-Gateway-Signature
X-Gateway-Consumer
```

O Core Gateway oficial do FLUXY Core usa outro contrato.

## Headers oficiais do Core

Substituir no Experience pelos headers abaixo:

```text
X-Fluxy-Experience-Client-Id
X-Fluxy-Experience-Timestamp
X-Fluxy-Experience-Signature
```

## Variaveis de ambiente recomendadas no Experience

```env
FLUXY_CORE_GATEWAY_BASE_URL=https://api-dev.jrfluxy.com.br
FLUXY_CORE_GATEWAY_BASE_PATH=/api/gateway
FLUXY_CORE_GATEWAY_CLIENT_ID=<igual ao CORE_GATEWAY_CLIENT_ID do Core>
FLUXY_CORE_GATEWAY_SECRET=<igual ao CORE_GATEWAY_CLIENT_SECRET do Core>
USE_CORE_GATEWAY_MOCK=true
```

Observacao:

- `FLUXY_CORE_GATEWAY_SECRET` no Experience deve bater com `CORE_GATEWAY_CLIENT_SECRET` no Core.
- `FLUXY_CORE_GATEWAY_CLIENT_ID` no Experience deve bater com `CORE_GATEWAY_CLIENT_ID` no Core.
- O segredo fica apenas no backend/API do Experience, nunca no frontend.

## Payload oficial da assinatura

O payload assinado no Experience deve ser exatamente:

```text
{timestamp}.{METHOD}.{originalUrl}
```

Exemplo:

```text
1760000000000.GET./api/gateway/comercial/empreendimentos
```

Regras:

- `timestamp` deve ser Unix epoch em milissegundos.
- `METHOD` deve estar em uppercase.
- `originalUrl` deve incluir o base path `/api/gateway`, path e querystring exatamente como enviado ao Core.
- O Core nao usa `nonce` nesta versao.
- O Core espera assinatura HMAC SHA256 em hexadecimal.

## Exemplo Node.js

```js
const crypto = require('crypto');

function assinarCoreGateway({ secret, timestamp, method, originalUrl }) {
  const payload = `${timestamp}.${String(method).toUpperCase()}.${originalUrl}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}
```

## Endpoints ja disponiveis no Core

```text
GET  /api/gateway/health
GET  /api/gateway/comercial/empreendimentos
GET  /api/gateway/comercial/unidades
GET  /api/gateway/comercial/mapa-unidades
POST /api/gateway/comercial/simulacao
GET  /api/gateway/events/catalog
```

## Endpoints ainda planejados

Os endpoints abaixo ainda retornam `501 PLANNED` no Core e devem continuar usando mock no Experience:

```text
GET  /api/gateway/portal/dashboard
GET  /api/gateway/portal/financeiro
GET  /api/gateway/portal/parcelas
GET  /api/gateway/portal/boletos/:id
GET  /api/gateway/portal/documentos
GET  /api/gateway/portal/obra
GET  /api/gateway/portal/chamados
POST /api/gateway/portal/chamados
```

## Status

- Core Gateway implementado no Core com feature flag `CORE_GATEWAY_ENABLED=false` por padrao.
- Experience calibrado em 2026-05-27 para usar os headers oficiais `X-Fluxy-Experience-*`.
- Experience removeu `nonce` do contrato de assinatura.
- Experience validou `node --check`, smoke tests e `tsc --noEmit`.
- Experience pode manter mocks ligados ate a EC2 receber as variaveis oficiais.
- Proxima etapa: ativacao controlada com `CORE_GATEWAY_ENABLED=true` no Core e `USE_CORE_GATEWAY_MOCK=false` no Experience.

## Variaveis para ativacao controlada

No Core:

```env
CORE_GATEWAY_ENABLED=true
CORE_GATEWAY_CLIENT_ID=<id-compartilhado-com-experience>
CORE_GATEWAY_CLIENT_SECRET=<segredo-forte-compartilhado-com-experience-backend>
CORE_GATEWAY_ALLOWED_ORIGINS=https://fluxy-experience-dev.vercel.app
CORE_GATEWAY_RATE_LIMIT_WINDOW_MS=60000
CORE_GATEWAY_RATE_LIMIT_MAX=120
CORE_GATEWAY_SIGNATURE_TOLERANCE_MS=300000
```

No Experience:

```env
FLUXY_CORE_GATEWAY_BASE_URL=https://api-dev.jrfluxy.com.br
FLUXY_CORE_GATEWAY_BASE_PATH=/api/gateway
FLUXY_CORE_GATEWAY_CLIENT_ID=<igual ao CORE_GATEWAY_CLIENT_ID>
FLUXY_CORE_GATEWAY_SECRET=<igual ao CORE_GATEWAY_CLIENT_SECRET>
USE_CORE_GATEWAY_MOCK=false
```

Observacao: manter `USE_CORE_GATEWAY_MOCK=true` enquanto as variaveis do Core nao estiverem configuradas e o backend nao tiver sido reiniciado.
