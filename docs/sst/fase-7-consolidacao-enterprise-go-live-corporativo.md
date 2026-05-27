# Fase 7 - Consolidacao Enterprise e Go-Live Corporativo SST

Documento criado em 2026-05-26.

## Objetivo

Consolidar o modulo SST como camada enterprise pronta para operacao corporativa em escala, sem implementar transmissao real ao eSocial.

Esta fase foca em:

- filas e jobs reais com arquitetura preparada para BullMQ/Redis;
- workers internos para processamento assincrono;
- cache operacional;
- observabilidade avancada;
- telemetria historica;
- pipeline de qualidade;
- governanca corporativa;
- readiness de go-live corporativo;
- experiencia frontend enterprise.

## Decisao tecnica

A implementacao inicial usa fila database-backed em `sst_jobs`.

Motivo:

- evita introduzir Redis/BullMQ como dependencia operacional obrigatoria antes do go-live;
- entrega processamento assincrono real com rastreabilidade;
- preserva rollback simples;
- deixa a arquitetura pronta para trocar o adapter por BullMQ/Redis quando a operacao exigir escala maior.

## Estrutura criada

Backend:

- `backend/src/modules/sst/queues/`
- `backend/src/modules/sst/workers/`
- `backend/src/modules/sst/jobs/`
- `backend/src/modules/sst/cache/`
- `backend/src/modules/sst/quality/`
- `backend/src/modules/sst/governance/`
- `backend/src/modules/sst/observability/sstAdvancedObservabilityService.js`

Frontend:

- `frontend/src/modules/sst/pages/SstObservabilidadeAvancada.jsx`
- rota `/sst/observabilidade-avancada`

## Jobs padrao

- `SstScoreRecalculationJob`
- `SstNotificationJob`
- `SstWorkflowJob`
- `SstAnalyticsRefreshJob`
- `SstHeatmapRefreshJob`
- `SstIaDocumentAnalysisJob`

## Tabelas novas

- `sst_jobs`
- `sst_queue_metrics`
- `sst_performance_metrics`
- `sst_cache_entries`
- `sst_quality_issues`
- `sst_governance_logs`

## Feature flags

- `SST_ASYNC_JOBS`
- `SST_CACHE_OPERACIONAL`
- `SST_OBSERVABILIDADE_AVANCADA`
- `SST_QUALITY_PIPELINE`
- `SST_GOVERNANCA_CORPORATIVA`

Por padrao, as flags ficam desativadas para permitir ativacao controlada.

## Endpoints principais

- `GET /sst/observabilidade-avancada`
- `GET /sst/queues/status`
- `POST /sst/queues/enqueue`
- `POST /sst/workers/processar`
- `GET /sst/cache/status`
- `POST /sst/cache/limpar-expirado`
- `POST /sst/quality/check`
- `GET /sst/quality/resumo`
- `GET /sst/governance/resumo`
- `POST /sst/governance/logs`
- `POST /sst/performance/registrar`

## Permissoes adicionadas

- `sst.enterprise.visualizar`
- `sst.performance.visualizar`
- `sst.jobs.gerenciar`
- `sst.cache.gerenciar`
- `sst.qualidade.gerenciar`
- `sst.governanca.visualizar`

## Nao implementado nesta fase

- SOAP;
- assinatura XML;
- certificado digital;
- lote real eSocial;
- envio ao governo;
- Redis/BullMQ como runtime obrigatorio.

## Proxima evolucao recomendada

Quando o SST estiver em uso real e houver volume operacional:

1. ativar pilotos por empresa/obra;
2. observar tempo medio dos jobs;
3. identificar jobs que precisam sair do banco para worker dedicado;
4. introduzir Redis/BullMQ com adapter compativel;
5. formalizar SLOs de processamento;
6. ampliar testes de carga com massa realista.
