# Fase 3 - Inteligencia Operacional e Automacoes SST

Documento criado em 2026-05-26.

## Objetivo

Consolidar o modulo SST como camada operacional inteligente da construtora, sem implementar transmissao real ao eSocial.

Esta fase adiciona:

- workflows automaticos;
- bloqueios operacionais;
- notificacoes persistentes;
- timeline SST do colaborador;
- heatmap operacional;
- score de conformidade;
- pendencias operacionais;
- preparacao preditiva;
- preparacao de IA documental.

## Principios Mantidos

- O backend continua sendo a fonte da verdade.
- O RH/DP continua sendo a fonte unica de colaboradores.
- O banco interno nao replica XML do governo.
- A transmissao eSocial continua bloqueada.
- Nenhum fluxo usa SOAP, certificado, assinatura digital ou comunicacao real com governo.

## Modelagem Criada

### SstPoliticaBloqueio

Define politicas de alerta, restricao ou bloqueio critico por empresa, obra, setor, funcao e tipo de risco.

### SstBloqueioOperacional

Registra bloqueios gerados pelo motor SST, sempre com origem, criticidade, motivo, status e rastreabilidade.

### SstNotificacao

Central persistente de notificacoes SST, criada a partir de eventos e pendencias.

### SstPendenciaOperacional

Centraliza pendencias de ASO, treinamento, EPI, documentos, exposicao e conformidade.

### SstComplianceScore

Armazena score calculado por colaborador, obra, empresa ou setor.

### SstCriticidade

Permite configurar niveis e pesos de criticidade operacional.

## Servicos Criados

```text
backend/src/modules/sst/blocking/sstBlockingService.js
backend/src/modules/sst/workflows/sstWorkflowService.js
backend/src/modules/sst/notifications/sstNotificationService.js
backend/src/modules/sst/timeline/sstTimelineService.js
backend/src/modules/sst/analytics/sstExecutiveAnalyticsService.js
backend/src/modules/sst/prediction/sstPredictionService.js
backend/src/modules/sst/ai/sstDocumentAiPipeline.js
```

## Workflows

O workflow principal desta fase e a revisao de conformidade do colaborador.

Fluxo:

1. Recebe o colaborador.
2. Registra evento de revisao obrigatoria.
3. Executa motor de conformidade.
4. Gera pendencias operacionais.
5. Avalia bloqueios.
6. Gera eventos de pendencia e bloqueio.

Eventos adicionados:

- `SST_FUNCAO_ALTERADA`;
- `SST_REVISAO_CONFORMIDADE_OBRIGATORIA`;
- `SST_PENDENCIA_OPERACIONAL_GERADA`;
- `SST_BLOQUEIO_OPERACIONAL_GERADO`;
- `SST_NOTIFICACAO_GERADA`.

## Bloqueios Operacionais

Tipos:

- `ALERTA`;
- `RESTRICAO`;
- `BLOQUEIO_CRITICO`.

Bloqueios podem nascer de:

- colaborador inapto;
- colaborador sem ASO;
- treinamento obrigatorio ausente;
- EPI obrigatorio ausente;
- documento expirado;
- exposicao incompleta;
- risco critico.

## Notificacoes

As notificacoes sao persistentes e nascem de:

- eventos operacionais abertos;
- pendencias operacionais abertas.

Cada notificacao possui:

- prioridade;
- criticidade;
- status;
- origem;
- vinculo com empresa, obra e colaborador quando aplicavel.

## Timeline do Colaborador

A timeline reune:

- admissao;
- ASO;
- exames;
- treinamentos;
- entregas de EPI;
- acidentes;
- exposicoes;
- eventos;
- bloqueios;
- pendencias;
- scores.

## Dashboard Executivo e Heatmap

Foram criadas visoes para:

- compliance geral;
- colaboradores avaliados;
- pendencias totais;
- pendencias criticas;
- bloqueios abertos;
- obras criticas;
- indice de risco por obra;
- prontidao preditiva;
- prontidao de IA documental.

## IA e Predicao

Nao foi implementada IA ativa.

Foram criados contratos arquiteturais para:

- risco de acidente;
- risco de nao conformidade;
- risco de afastamento;
- OCR de ASO;
- OCR de certificado;
- classificacao documental SST.

## Frontend

Paginas adicionadas:

```text
frontend/src/modules/sst/pages/SstExecutivo.jsx
frontend/src/modules/sst/pages/SstHeatmap.jsx
frontend/src/modules/sst/pages/SstTimeline.jsx
```

Rotas adicionadas:

```text
/sst/relatorios/executivo
/sst/relatorios/heatmap
/sst/timeline
```

## Testes da Fase

Executado:

- validacao de sintaxe dos modelos, migrations, services, controller e rotas;
- require runtime de `sstService`;
- build do frontend via Vite.

Resultado:

- backend validado;
- frontend compilado;
- nenhuma transmissao eSocial habilitada.

## Pendencias Futuras

- conectar workflow automaticamente ao update real de cargo, funcao, obra e setor no RH/DP;
- definir politicas oficiais de bloqueio com a diretoria;
- criar rotina agendada para recalculo de scores;
- criar estrategia de notificacao por usuario, cargo ou setor;
- criar homologacao formal antes de qualquer transmissao eSocial.
