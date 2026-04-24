# Integracoes Ativas

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
