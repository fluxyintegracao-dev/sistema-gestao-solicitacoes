# Eventos Core -> Experience

## Objetivo

Padronizar eventos oficiais que o Core pode publicar para o Experience.

Eventos nao substituem consultas oficiais. Eles servem para sincronizacao, cache, analytics e atualizacao visual.

## Envelope padrao

```json
{
  "event_id": "uuid",
  "event_type": "UNIDADE_STATUS_CHANGED",
  "version": "v1",
  "occurred_at": "2026-05-27T12:00:00.000Z",
  "source": "fluxy-core",
  "entity": {
    "type": "unidade",
    "id": "public-id"
  },
  "payload": {},
  "metadata": {
    "request_id": "uuid",
    "tenant": "single-tenant"
  }
}
```

## Eventos iniciais

Catalogo tecnico disponivel em:

```text
GET /api/gateway/events/catalog
```

Requer HMAC e `CORE_GATEWAY_ENABLED=true`.

### UNIDADE_STATUS_CHANGED

Quando o status oficial ou comercial publicavel de uma unidade muda no Core.

### BOLETO_GERADO

Quando boleto oficial e gerado no Core.

O Experience pode notificar ou atualizar visualizacao, mas nao gera boleto.

### CONTRATO_ASSINADO

Quando contrato oficial e assinado no Core.

### PARCELA_VENCIDA

Quando parcela do cliente entra em atraso.

### OBRA_EVOLUIDA

Quando andamento de obra e atualizado no Core.

### LEAD_CONVERTIDO

Quando um lead vindo do Experience e aceito/consolidado no Core.

## Idempotencia

O Experience deve tratar `event_id` como idempotente.

O Core deve evitar republicar eventos duplicados sem necessidade.

## Segurança

Eventos que contenham dado de cliente ou financeiro devem ser entregues apenas por canal autenticado e auditado.
