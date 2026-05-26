# SST Fase 4 - Orquestracao Operacional e IA Aplicada

Documento criado em 2026-05-26.

## Objetivo

A Fase 4 consolida o SST como camada operacional inteligente do FLUXY, sem habilitar transmissao real ao eSocial.

Continuam bloqueados:

- SOAP;
- assinatura XML;
- certificado digital;
- envio ao governo;
- producao restrita;
- processamento real de lote eSocial.

## Principios

- Backend continua sendo fonte da verdade.
- RH/DP continua sendo fonte da verdade para colaboradores.
- SST nao cria tabela paralela de trabalhadores.
- eSocial segue como contrato externo, desacoplado do dominio interno.
- Toda automacao nasce orientada a eventos.

## Estruturas Criadas

### Workflow engine

Arquivos:

- `backend/src/modules/sst/workflow-engine/sstWorkflowEngineService.js`
- `backend/src/modules/sst/models/SstWorkflow.js`
- `backend/src/modules/sst/models/SstWorkflowExecucao.js`
- `backend/src/modules/sst/models/SstWorkflowAcao.js`
- `backend/src/modules/sst/models/SstWorkflowEvento.js`

Capacidades:

- processar eventos SST abertos;
- localizar workflows ativos por evento gatilho;
- executar acoes configuradas;
- registrar execucoes;
- registrar eventos de workflow;
- manter rastreabilidade.

### Engine de automacoes

Arquivo:

- `backend/src/modules/sst/automation/sstAutomationService.js`

Casos cobertos:

- mudanca de funcao/obra;
- admissao;
- acidente registrado;
- vencimentos proximos;
- sincronizacao de notificacoes;
- recalculo de score;
- geracao de recomendacoes.

### IA documental aplicada

Arquivos:

- `backend/src/modules/sst/ai/document-analysis/sstDocumentAnalysisService.js`
- `backend/src/modules/sst/models/SstDocumentoAnaliseIa.js`

Nao foi implementada IA falsa. O sistema cria contrato de analise e registra pendencia de provider quando nenhum provider OCR/IA estiver configurado.

Providers preparados:

- OpenAI;
- Claude;
- AWS Textract;
- Azure OCR.

### Centro operacional corporativo

Arquivos:

- `backend/src/modules/sst/analytics/sstCorporateCenterService.js`
- `frontend/src/modules/sst/pages/SstCentroOperacional.jsx`

Indicadores:

- compliance geral;
- empresas mapeadas;
- obras mapeadas;
- pendencias abertas;
- bloqueios abertos;
- riscos criticos;
- heatmap corporativo;
- sinais operacionais;
- recomendacoes.

## Endpoints

```text
GET  /api/sst/centro-operacional
GET  /api/sst/inteligencia-operacional
GET  /api/sst/recomendacoes/gerar
POST /api/sst/scores/recalcular
POST /api/sst/automation/processar
POST /api/sst/workflows/processar
POST /api/sst/documentos/:id/analisar-ia
GET  /api/sst/obras/:obraId/visao-operacional
```

## Tabelas

Migration:

```text
backend/migrations/202605260004_sst_orquestracao_operacional_fase4.js
```

Tabelas:

- `sst_workflows`;
- `sst_workflow_execucoes`;
- `sst_workflow_acoes`;
- `sst_workflow_eventos`;
- `sst_recomendacoes_operacionais`;
- `sst_documentos_analises_ia`.

## Decisao Importante

A Fase 4 nao cria workers, Redis ou BullMQ agora. A arquitetura foi preparada para essa evolucao, mas a execucao atual permanece controlada por endpoints e services internos.

## Pendencias Futuras

- Conectar hooks reais do RH/DP apos homologacao.
- Definir provider IA documental.
- Criar jobs agendados para score e automacoes.
- Definir politicas de workflow oficiais por diretoria.
- Habilitar filas assicronas apenas quando houver necessidade operacional real.
