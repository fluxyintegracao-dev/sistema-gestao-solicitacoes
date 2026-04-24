# FLUXY CRM - Fase 4 Entregue

> **Status:** Concluida em blocos e utilizavel
> **Data:** 2026-04-20
> **Modulo:** `CRM`
> **Produto:** FLUXY Core (`sistema_gestao_solicitacoes`)

---

## Escopo entregue neste bloco

Com os dois blocos da Fase 4, o CRM agora possui:

- inbox comercial unificado
- templates de mensagem
- cadastro de automacoes
- dashboard gerencial
- motor de automacoes com execucao por evento e por SLA
- log de execucoes com idempotencia
- sincronizacao dos eventos Meta/Google com o inbox do CRM
- rastreabilidade do webhook ate lead, conversa e mensagem
- paginação incremental do historico do inbox para reduzir carga no banco
- indices adicionais para sustentacao de conversas e mensagens
- exportacao segura e rastreavel de leads em CSV
- dashboard especifico de SLA e backlog operacional
- dashboard especifico de distribuicao, carteira e redistribuicoes
- redistribuicao controlada de lead por menor backlog ou usuario escolhido
- notificacao e timeline interna em redistribuicoes manuais
- gestao operacional das etapas do Kanban CRM
- movimentacao de leads por arrastar e soltar entre etapas
- modal vertical de acoes rapidas no card do lead
- acoes adicionais de automacao: `NOTIFY_OWNER` e `CREATE_INTERNAL_NOTE`
- schema preparado para evolucao omnichannel

Evolucoes omnichannel e acoes avancadas permanecem para o proximo bloco.

---

## Backend

### Migration

| Arquivo | Conteudo |
|---|---|
| `backend/migrations/202604200004_crm_fase4.js` | Cria tabelas da Fase 4 e seeds iniciais de templates |

### Tabelas criadas

| Tabela | Descricao |
|---|---|
| `crm_conversations` | Conversas por lead/canal/numero/responsavel |
| `crm_messages` | Historico de mensagens, notas internas e eventos |
| `crm_message_templates` | Modelos reutilizaveis de mensagens |
| `crm_conversation_participants` | Participantes e leitura por usuario |
| `crm_automation_rules` | Regras cadastradas para automacao futura |
| `crm_automation_executions` | Log de execucao, idempotencia e status do motor |

Complemento aplicado depois do primeiro fechamento da Fase 4:

- `crm_integration_meta_events` agora pode guardar `processed_conversation_id` e `processed_message_id`
- `crm_integration_google_events` agora pode guardar `processed_conversation_id` e `processed_message_id`

### Models

| Arquivo | Model |
|---|---|
| `backend/src/models/CrmConversation.js` | `CrmConversation` |
| `backend/src/models/CrmMessage.js` | `CrmMessage` |
| `backend/src/models/CrmMessageTemplate.js` | `CrmMessageTemplate` |
| `backend/src/models/CrmConversationParticipant.js` | `CrmConversationParticipant` |
| `backend/src/models/CrmAutomationRule.js` | `CrmAutomationRule` |
| `backend/src/models/CrmAutomationExecution.js` | `CrmAutomationExecution` |

Todos registrados em `backend/src/models/index.js` com associacoes para lead, usuario, canal e numero.

### Services

| Arquivo | Responsabilidade |
|---|---|
| `backend/src/services/crmConversationService.js` | Listagem, detalhe, criacao, atualizacao, mensagens, leitura, templates |
| `backend/src/services/crmAutomationService.js` | CRUD e ativacao/desativacao de automacoes |
| `backend/src/services/crmAutomationRuntimeService.js` | Motor de execucao, SLA, runtime seguro, idempotencia e listagem de execucoes |
| `backend/src/services/crmInboxSyncService.js` | Vincula eventos de integracao ao inbox, resolvendo canal, numero, conversa e mensagem |
| `backend/src/services/crmConversationService.js` | Inbox com janela paginada de mensagens e detalhe incremental |
| `backend/src/services/crmService.js` | Listagem de leads, auditoria do CRM, exportacao CSV, redistribuicao controlada e gestao de etapas do Kanban |

### Controllers

| Arquivo | Endpoints |
|---|---|
| `backend/src/controllers/CrmConversationsController.js` | inbox, detalhe, mensagens, leitura, templates |
| `backend/src/controllers/CrmAutomationController.js` | automacoes |
| `backend/src/controllers/CrmDashboardController.js` | `operacional` + `gerencial` + `sla` + `distribuicao` |

### Rotas adicionadas

```txt
GET    /api/crm/dashboard/gerencial
GET    /api/crm/dashboard/sla
GET    /api/crm/dashboard/distribuicao
GET    /api/crm/leads/export
GET    /api/crm/leads/redistribution-candidates
POST   /api/crm/leads/:id/redistribute
POST   /api/crm/pipelines/:id/stages
PATCH  /api/crm/pipeline-stages/:id
DELETE /api/crm/pipeline-stages/:id

GET    /api/crm/conversations
POST   /api/crm/conversations
GET    /api/crm/conversations/:id
PATCH  /api/crm/conversations/:id
POST   /api/crm/conversations/:id/messages
POST   /api/crm/conversations/:id/read

GET    /api/crm/message-templates
POST   /api/crm/message-templates
PATCH  /api/crm/message-templates/:id

GET    /api/crm/automation-rules
POST   /api/crm/automation-rules
PATCH  /api/crm/automation-rules/:id
POST   /api/crm/automation-rules/:id/activate
POST   /api/crm/automation-rules/:id/deactivate
POST   /api/crm/automation-rules/run-cycle
GET    /api/crm/automation-executions
```

Todas protegidas por `requireEnabledModule('CRM')` + `requireCrmModule()`.

---

## Frontend

### Services

`frontend/src/services/crm.js` recebeu:

- `obterDashboardGerencialCrm`
- `listarConversasCrm`
- `obterConversaCrm`
- `criarConversaCrm`
- `atualizarConversaCrm`
- `registrarMensagemCrm`
- `marcarConversaLidaCrm`
- `listarTemplatesMensagemCrm`
- `criarTemplateMensagemCrm`
- `atualizarTemplateMensagemCrm`
- `listarAutomacoesCrm`
- `criarAutomacaoCrm`
- `atualizarAutomacaoCrm`
- `ativarAutomacaoCrm`
- `desativarAutomacaoCrm`
- `exportarLeadsCrm`
- `obterDashboardSlaCrm`
- `obterDashboardDistribuicaoCrm`
- `listarCandidatosRedistribuicaoCrm`
- `redistribuirLeadCrm`
- `criarEtapaPipelineCrm`
- `atualizarEtapaPipelineCrm`
- `removerEtapaPipelineCrm`

### Paginas novas

| Arquivo | Rota | Descricao |
|---|---|---|
| `frontend/src/modules/crm/pages/CrmInbox.jsx` | `/crm/inbox` | Inbox comercial com filtros, detalhe, historico, mensagens, notas internas e templates |
| `frontend/src/modules/crm/pages/CrmAutomacoes.jsx` | `/crm/automacoes` | Cadastro, execucao manual do ciclo e log recente das regras |
| `frontend/src/modules/crm/pages/CrmDashboardGerencial.jsx` | `/crm/dashboard-gerencial` | Visao executiva de origem, conversao, backlog e automacoes |
| `frontend/src/modules/crm/pages/CrmDashboardSla.jsx` | `/crm/dashboard-sla` | Visao tatica de SLA, filas e saude do runtime de automacoes |
| `frontend/src/modules/crm/pages/CrmDashboardDistribuicao.jsx` | `/crm/dashboard-distribuicao` | Visao de carteira, redistribuicoes, responsaveis e desequilibrio operacional |

### Navegacao

Atualizados:

- `frontend/src/App.jsx`
- `frontend/src/layout/Layout.jsx`

Itens adicionados ao grupo CRM:

- Dashboard Gerencial
- Dashboard SLA
- Distribuicao
- Inbox
- Automacoes

### Kanban CRM

`frontend/src/modules/crm/pages/CrmKanban.jsx` passou a permitir:

- criar nova etapa do funil
- editar nome, cor e parametros operacionais da etapa
- remover etapa somente quando nao houver leads vinculados
- mover leads por arrastar e soltar entre etapas
- abrir modal vertical de acoes no card do lead
- mover lead por acao manual quando o usuario nao quiser usar drag-and-drop
- abrir o detalhe do lead a partir do modal de acoes

Regra importante:

- o backend bloqueia a remocao de uma etapa com leads ativos vinculados
- se a etapa removida era a etapa inicial, a proxima etapa ativa do pipeline e promovida para inicial
- o pipeline nao pode ficar sem nenhuma etapa ativa

---

## Validacoes executadas

- `node --check backend/src/controllers/CrmAutomationController.js`
- `node --check backend/src/controllers/CrmDashboardController.js`
- `node --check backend/src/controllers/CrmLeadsController.js`
- `node --check backend/src/services/crmConversationService.js`
- `node --check backend/src/services/crmService.js`
- `node --check backend/src/services/authorizationService.js`
- `node --check backend/src/routes.js`
- `node --check backend/src/services/crmAutomationRuntimeService.js`
- `node -e "require('./backend/src/models'); console.log('models ok')"`
- `node -e "require('./backend/src/routes'); console.log('routes ok')"`
- `npm run build` em `frontend/`
- `npm run migrate` em `backend/`

Resultado:

- build frontend concluido com sucesso
- rotas e models carregados sem erro
- migration `202604200004_crm_fase4.js` aplicada com sucesso
- migration `202604200005_crm_automation_runtime.js` aplicada com sucesso
- migration `202604200006_crm_inbox_integrations.js` aplicada com sucesso
- migration `202604200007_crm_inbox_scaling.js` aplicada com sucesso

---

## O que esta pronto para uso

- registrar conversas manuais
- abrir detalhe da conversa
- registrar mensagem de saida
- registrar nota interna
- marcar conversa como lida
- alterar status da conversa
- cadastrar templates
- cadastrar automacoes
- executar o ciclo de automacoes manualmente
- disparar automacoes em lead criado, mudanca de etapa, perda e mensagem recebida
- executar regras agendadas de sem primeiro contato e sem atividade
- consultar o log recente das execucoes
- consultar indicadores gerenciais do CRM
- consultar atrasos de SLA, backlog por responsavel e fila operacional em dashboard dedicado
- consultar distribuicao de carteira, leads sem responsavel, redistribuicoes recentes e desequilibrio por responsavel
- redistribuir leads manualmente pela tela de detalhe, com escolha direta ou menor backlog
- organizar as etapas do Kanban diretamente na tela do funil
- mover leads entre etapas via drag-and-drop ou pelo modal de acoes do card
- notificar responsavel anterior e novo responsavel quando houver redistribuicao
- registrar redistribuicao na timeline do lead e no audit log
- receber evento Meta e refletir isso no inbox com conversa/mensagem vinculadas
- receber evento Google e refletir isso no inbox com conversa/mensagem vinculadas
- enxergar, na tela de integracoes, se o webhook gerou lead, conversa e mensagem
- exportar leads filtrados em CSV com auditoria de usuario, filtros aplicados e limite maximo server-side

---

## O que ainda nao executa sozinho

Ainda nao foi entregue nesta fase:

- inbox conectado a WhatsApp/Meta/Google de forma operacional ponta a ponta para troca real de mensagens
- acoes avancadas sensiveis como suspensao de usuario e troca de pool
- distribuicao por pools, pesos e limites por membro

Ou seja:

o motor ja executa regras configuradas, mas o ecossistema omnichannel completo e as acoes operacionais avancadas ainda dependem do proximo bloco.

---

## Proximo bloco recomendado

1. Acoes avancadas de automacao
2. Acoes avancadas de redistribuicao
3. Evolucao omnichannel operacional
