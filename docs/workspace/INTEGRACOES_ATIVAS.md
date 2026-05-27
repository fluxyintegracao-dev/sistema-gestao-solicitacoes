# Integracoes Ativas

## FLUXY Core <-> FLUXY Experience

### Direcao

- `fluxy-core` -> `fluxy-experience`
- `fluxy-experience` -> `fluxy-core` apenas por APIs oficiais do Core Gateway

### Tipo

- Core Gateway;
- CRM comercial;
- Portal do Cliente;
- site publico;
- mapa de unidades;
- simulador;
- eventos oficiais.

### Regra central

- `fluxy-core` e fonte da verdade oficial.
- `fluxy-experience` nao acessa banco do Core.
- Toda integracao deve passar por contratos documentados em `docs/core-gateway/`.

### Documentos de contrato

- `docs/COLABORACAO_AGENTES.md`
- `docs/core-gateway/FRONTEIRAS_CORE_EXPERIENCE.md`
- `docs/core-gateway/LGPD_DADOS_EXPERIENCE.md`
- `docs/core-gateway/CONTRATOS_API_EXPERIENCE.md`
- `docs/core-gateway/EVENTOS_CORE_EXPERIENCE.md`
- `docs/core-gateway/ROADMAP_EXECUCAO_CORE_GATEWAY.md`

### Endpoints planejados

- `GET /api/gateway/comercial/empreendimentos`
- `GET /api/gateway/comercial/unidades`
- `GET /api/gateway/comercial/mapa-unidades`
- `POST /api/gateway/comercial/simulacao`
- `GET /api/gateway/portal/dashboard`
- `GET /api/gateway/portal/financeiro`
- `GET /api/gateway/portal/parcelas`
- `GET /api/gateway/portal/boletos/:id`
- `GET /api/gateway/portal/documentos`
- `GET /api/gateway/portal/obra`
- `GET /api/gateway/portal/chamados`
- `POST /api/gateway/portal/chamados`

### Status atual

- Documentacao inicial criada no Core.
- Skeleton backend do Core Gateway criado em `backend/src/modules/coreGateway`.
- `GET /api/gateway/health` disponivel.
- Endpoints comerciais do Core Gateway implementados com dados publicaveis.
- Endpoints do Portal Cliente reservados com autenticacao HMAC e retorno `501 PLANNED`.
- CRM/Mapa/Simulador no Experience pode consumir endpoints comerciais quando o gateway estiver habilitado.
- Portal no Experience deve usar mocks/controladores locais ate as views oficiais de cliente serem implementadas no Core.
- Client HMAC do Experience calibrado em 2026-05-27 para os headers oficiais `X-Fluxy-Experience-*`.

## FLUXY Core <-> FLUXY Ops

### Direcao

- `fluxy-core` -> `fluxy-ops`

### Tipo

- telemetria operacional

### Resiliencia

- se `fluxy-ops` falhar, `fluxy-core` continua operando normalmente

### Endpoints esperados no `fluxy-ops`

- `POST /api/ops/heartbeat`
- `POST /api/ops/metricas/uso`
- `POST /api/ops/metricas/storage`
- `POST /api/ops/metricas/concorrencia`

### Headers esperados

- `X-Ops-Client-Id`
- `X-Ops-Api-Key`

### Payloads enviados pelo `fluxy-core`

#### Heartbeat

```json
{
  "versao_backend": "1.0.0",
  "status_saude": "ok",
  "modulos_habilitados": ["SOLICITACOES", "COMPRAS", "FINANCEIRO"]
}
```

#### Uso

```json
{
  "solicitacoes_total": 0,
  "titulos_total": 0,
  "pedidos_total": 0,
  "parceiros_total": 0,
  "usuarios_cadastrados": 0,
  "usuarios_ativos_30d": 0
}
```

#### Storage

```json
{
  "banco_gb": 0,
  "anexos_gb": 0
}
```

#### Concorrencia

```json
{
  "simultaneos_atual": 0,
  "pico_dia": 0,
  "pico_mes": 0,
  "excedencias_mes": 0
}
```

### Status atual

- `fluxy-core`: telemetria basica implementada
- `fluxy-ops`: implementacao deve consumir essas rotas e persistir dados
