# Relatorio - Modulo Governanca do Sistema

## Objetivo

Implementar a primeira fase do modulo Governanca do Sistema seguindo o roadmap estrategico do FLUXY, com foco em visao institucional, auditoria, saude tecnica, eficiencia operacional, adocao do sistema e evolucao do produto.

O modulo nao mede produtividade individual. Todos os indicadores sao agregados e voltados para governanca corporativa.

## Arquitetura

Backend modular:

```text
backend/src/modules/governanca
├── controllers
├── jobs
├── models
├── routes
└── services
```

Frontend modular:

```text
frontend/src/modules/governanca
├── pages
└── services
```

## Permissoes

As permissoes foram registradas no modelo granular de `Permissoes de Areas por Usuario`.

| Codigo do plano | Chave granular no sistema |
| --- | --- |
| SYSTEM_GOVERNANCE_VIEW | governanca.sistema.visualizar |
| SYSTEM_GOVERNANCE_MANAGE | governanca.sistema.gerenciar |
| SYSTEM_TECH_MONITOR_VIEW | governanca.tecnico.visualizar |
| SYSTEM_AUDIT_VIEW | governanca.auditoria.visualizar |
| SYSTEM_PRODUCT_EVOLUTION_VIEW | governanca.produto.visualizar |

`SUPERADMIN` e `ADMINISTRADOR` mantem bypass administrativo conforme regra global do sistema.

## Banco de Dados

Migration criada:

```text
backend/migrations/202606130001_governanca_sistema.js
```

Tabelas:

```text
governanca_snapshots
governanca_access_logs
```

Indices:

```text
uk_governanca_snapshots_data
idx_governanca_access_logs_usuario
idx_governanca_access_logs_acao
idx_governanca_access_logs_created
```

## Rotas

Base protegida por autenticacao:

```text
/api/governanca
```

Endpoints:

```text
GET  /governanca/dashboard
GET  /governanca/executiva
GET  /governanca/adocao
GET  /governanca/eficiencia
GET  /governanca/auditoria
GET  /governanca/health
GET  /governanca/produto
GET  /governanca/snapshots
POST /governanca/snapshots/gerar
GET  /governanca/export?type=dashboard&format=csv|xlsx|pdf
```

## Dashboards Entregues

1. Visao Executiva
2. Adocao do Sistema
3. Eficiencia Operacional
4. Auditoria e Governanca
5. Saude Tecnica
6. Evolucao do Produto

## Health Check

`GET /governanca/health` retorna:

```json
{
  "api": "ok",
  "database": "ok",
  "storage": "configurado",
  "integrations": {
    "banco_do_brasil": "habilitado",
    "caixa_cnab": "habilitado",
    "fiscal": "habilitado",
    "sst": "habilitado",
    "esocial": "controlado"
  }
}
```

## Job Diario

O job `governancaSnapshotJob` roda a cada minuto e gera snapshot uma vez por dia as `00:30`.

Controle:

```env
GOVERNANCA_SNAPSHOT_JOB_ENABLED=true
```

Se a variavel estiver `false`, o job nao inicia.

## Exportacao

Exportacao implementada nos formatos:

```text
CSV
Excel compatível (.xls via HTML table)
PDF simples institucional
```

## Arquivos Criados

Backend:

```text
backend/migrations/202606130001_governanca_sistema.js
backend/src/modules/governanca/controllers/GovernancaController.js
backend/src/modules/governanca/jobs/governancaSnapshotJob.js
backend/src/modules/governanca/models/GovernancaAccessLog.js
backend/src/modules/governanca/models/GovernancaSnapshot.js
backend/src/modules/governanca/routes/index.js
backend/src/modules/governanca/services/governancaAccessLogService.js
backend/src/modules/governanca/services/governancaExportService.js
backend/src/modules/governanca/services/governancaMetricsService.js
```

Frontend:

```text
frontend/src/modules/governanca/pages/GovernancaSistema.jsx
frontend/src/modules/governanca/services/governancaApi.js
```

Arquivos alterados:

```text
backend/server.js
backend/src/constants/moduloPermissoes.js
backend/src/models/index.js
backend/src/routes.js
backend/src/services/authorizationService.js
frontend/src/App.jsx
frontend/src/layout/Layout.jsx
frontend/src/utils/acessoProduto.js
```

## Pendencias e Proximas Evolucoes

- Refinar indicadores por modulo conforme cada frente ganhar mais eventos padronizados.
- Evoluir exportacao PDF para layout executivo com identidade visual.
- Conectar snapshots a graficos historicos mais detalhados.
- Ampliar auditoria para eventos de release, deploy e configuracoes criticas.

## Checklist

- Backend modular criado.
- Frontend modular criado.
- Permissoes granulares registradas.
- Menu Administrativo criado.
- Dashboard institucional criado.
- Health tecnico criado.
- Snapshot diario criado.
- Logs de acesso criados.
- Export CSV/Excel/PDF criado.
- Query agregada e defensiva implementada.
