# Fase 5 - Homologacao Operacional e Integracao Controlada SST

Documento criado em 2026-05-26.

## Objetivo

Consolidar o modulo SST como uma camada operacional confiavel antes de qualquer uso amplo em producao, focando em estabilizacao, homologacao, observabilidade, integracoes controladas, permissoes e checklist de go-live.

Esta fase nao implementa transmissao real ao eSocial. SOAP, assinatura XML, certificado digital, lotes reais e envio ao governo continuam bloqueados.

## Principios Aplicados

- Backend como fonte da verdade.
- RH/DP continua sendo fonte da verdade para colaboradores.
- SST nao cria tabela paralela de trabalhadores.
- Integracoes com RH/DP e Obras sao controladas por feature flags.
- Operacoes sensiveis geram logs rastreaveis.
- Homologacao deve ocorrer com dry-run e massa amostral controlada.
- Dados ausentes devem aparecer como pendencia, nao como inferencia.

## Feature Flags Criadas

As flags abaixo passam a fazer parte da configuracao SST:

- `SST_AUTO_REVISAO_FUNCAO`
- `SST_BLOQUEIO_OPERACIONAL`
- `SST_NOTIFICACOES_AUTOMATICAS`
- `SST_IA_DOCUMENTAL`
- `SST_INTEGRACAO_RHDP`
- `SST_INTEGRACAO_OBRAS`
- `SST_WORKFLOW_ENGINE`

Por padrao, todas nascem desabilitadas. O objetivo e permitir ativacao gradual por homologacao, com rollback simples por configuracao.

## Logs Operacionais

Foram criadas tabelas de observabilidade para rastrear a operacao SST:

- `sst_workflow_logs`
- `sst_automation_logs`
- `sst_blocking_logs`
- `sst_integration_logs`

Essas tabelas registram status, mensagem, erro, payload, usuario, empresa, obra e colaborador quando aplicavel.

## Integracao Controlada RH/DP

Foi criada a camada `backend/src/modules/sst/integrations/rhdp/`.

Eventos preparados:

- admissao;
- mudanca de funcao;
- mudanca de cargo;
- mudanca de setor;
- mudanca de obra;
- desligamento.

Se `SST_INTEGRACAO_RHDP` estiver desabilitada, a tentativa e registrada como `IGNORADO_FLAG_DESATIVADA` e nenhuma automacao operacional e executada.

## Integracao Controlada Obras

Foi criada a camada controlada para processamento da visao operacional SST da obra.

Se `SST_INTEGRACAO_OBRAS` estiver desabilitada, a tentativa e registrada como `IGNORADO_FLAG_DESATIVADA`.

## Homologacao

Foi criada a camada:

```text
backend/src/modules/sst/homologation/
```

Ela entrega:

- checklist tecnico-operacional;
- homologacao analitica de workflows;
- simulacao dry-run de massa operacional;
- recomendacao de go/no-go.

A simulacao nao cria dados reais automaticamente. A massa de homologacao deve ser criada com dados amostrais controlados no ambiente correto.

## Observabilidade

Foi criada a camada:

```text
backend/src/modules/sst/observability/
```

Ela consolida:

- flags;
- eventos abertos;
- notificacoes;
- pendencias;
- bloqueios;
- scores;
- erros operacionais;
- ultimos logs de workflows, automacoes, integracoes e bloqueios.

No frontend foi criada a pagina:

```text
/sst/observabilidade
```

## Permissoes e Visibilidade

A area de permissoes recebeu controles para:

- visualizacao de observabilidade;
- visualizacao de logs SST;
- gerenciamento de integracoes controladas.

A visibilidade de UI recebeu novos componentes para:

- card de observabilidade no hub de relatorios SST;
- painel de logs;
- tabelas de logs operacionais.

## Endpoints Adicionados

```text
GET  /api/sst/feature-flags
GET  /api/sst/observabilidade
GET  /api/sst/homologacao/checklist
POST /api/sst/homologacao/workflows
POST /api/sst/homologacao/simular
POST /api/sst/integracoes/rhdp/processar
POST /api/sst/integracoes/obras/:obraId/processar
```

## Riscos Identificados

- Ativar integracoes sem massa de homologacao pode gerar pendencias inesperadas.
- Dashboards e analytics dependem de dados operacionais bem classificados.
- A criacao de logs aumenta volume de dados; no futuro pode exigir retencao, arquivamento e jobs.
- Integracoes automaticas com RH/DP ainda devem ser ligadas de forma gradual, nunca direto em todos os eventos sem monitoramento.

## Proximos Passos

1. Rodar migration da Fase 5 em homologacao.
2. Configurar permissao de observabilidade para perfis responsaveis.
3. Ativar uma flag por vez em homologacao.
4. Criar massa amostral SST.
5. Rodar checklist de homologacao.
6. Validar logs e ausencia de duplicidade.
7. Fazer go/no-go operacional SST.
