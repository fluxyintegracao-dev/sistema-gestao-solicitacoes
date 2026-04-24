# FLUXY CRM — Plano Completo do Módulo

> **Status:** Planejado — aguardando execução por fases
> **Módulo:** `CRM`
> **Produto:** FLUXY Core (`sistema_gestao_solicitacoes`)
> **Arquitetura:** Modular, multi-tenant por instalação/contrato, backend como fonte da verdade

---

## CONTEXTO DO PRODUTO

O FLUXY é um sistema B2B modular para empresas, já em produção, com arquitetura baseada em:
- Frontend em React + Vite
- Backend em Node.js + Express
- Banco MySQL
- Autenticação e sessão já existentes no sistema
- Arquivos e anexos via S3/presigned URLs quando necessário
- Controle de módulos por habilitação/desabilitação
- Configuração por tenant/contrato
- Preocupação com segurança, rastreabilidade, escalabilidade e governança

O módulo CRM deve seguir exatamente essa filosofia do produto:
- Backend como fonte da verdade
- Sem hardcodes no frontend
- Todas as regras de negócio importantes configuráveis no banco
- Controle por permissões
- Logs e auditoria completos
- Preparado para expansão futura sem retrabalho

---

## OBJETIVO DO MÓDULO

Criar um CRM completo para:
- Captação de leads
- Cadastro manual e importação de leads
- Integração com Meta Ads e Google Ads
- Operação com múltiplos usuários
- Operação com equipe interna e corretores externos
- Distribuição automática e manual de leads
- Distribuição por percentual
- Distribuição por regras configuráveis
- Acompanhamento de funil
- Follow-up e tarefas
- Operação com múltiplos números e canais
- Dashboards operacionais e gerenciais
- Rastreabilidade completa
- Implantação em fases

---

## ESTRATÉGIA OPERACIONAL

O sistema deve nascer preparado para operar com:
- Equipe interna
- Equipe externa
- Modelo em duas camadas no futuro (time interno pré-qualifica e depois repassa)
- Múltiplos corretores
- Múltiplos canais

Mas na implantação inicial, o CRM será utilizado somente por um grupo pequeno e controlado:
- Equipe interna/comercial definida pela empresa
- De 3 a 5 corretores selecionados
- Esse grupo inicial será o grupo piloto
- Depois o sistema será expandido para os demais corretores e parceiros

Portanto, o módulo precisa suportar **implantação em fases**, com regras de distribuição condicionadas à fase ativa do tenant.

---

## PONTO SENSÍVEL OBRIGATÓRIO — PROTEÇÃO DA LINHA PRINCIPAL

Existe uma necessidade importante:
- A empresa possui um número principal institucional **X**
- A empresa pode comprar uma linha virgem **Y** para operação em campanhas
- A intenção é proteger a linha principal X de riscos operacionais, como bloqueios em canais de campanha
- O sistema deve permitir operar campanhas com Y e manter X como número principal institucional

**IMPORTANTE:**
- O sistema **NÃO** deve assumir como regra de produto que será possível mascarar tecnicamente o número do WhatsApp Ads para parecer outro número de forma nativa
- O sistema deve modelar corretamente a distinção entre:
  1. Número principal institucional da empresa
  2. Número operacional de canal/campanha
  3. Tracking number / número intermediário de rastreamento
  4. Número real de destino
- Essa distinção deve existir nas entidades, regras, telas e relatórios

O CRM deve permitir:
- Cadastrar o número principal institucional
- Cadastrar números operacionais de campanhas
- Vincular números a canais, campanhas e equipes
- Registrar tracking number quando houver
- Registrar destination number quando houver
- Mostrar isso claramente nas interfaces administrativas

---

## SUBMÓDULOS

| Submódulo | Responsabilidade |
|---|---|
| `crm_core` | Feature flag, config, tenant, base |
| `crm_leads` | CRUD, importação, deduplicação |
| `crm_contacts` | Contatos e empresas maduros |
| `crm_distribution` | Motor de distribuição, pools, regras |
| `crm_pipeline` | Funil configurável, etapas, SLAs |
| `crm_inbox` | Inbox unificado, conversas, mensagens |
| `crm_channels` | Canais, números, contas |
| `crm_campaigns` | Campanhas, UTMs, rastreamento |
| `crm_automation` | Gatilhos, ações, regras automáticas |
| `crm_reports` | Dashboards e relatórios |
| `crm_admin` | Configuração administrativa |
| `crm_audit` | Auditoria completa |
| `crm_tasks` | Tarefas, follow-ups, alertas |
| `crm_rollout` | Fases de implantação por tenant |

---

## REQUISITOS FUNCIONAIS

### 1. Habilitação Modular

- O módulo CRM deve poder ser habilitado/desabilitado por tenant/contrato
- Menus, rotas, permissões e telas devem respeitar a habilitação do módulo
- Não exibir o módulo para tenants que não tenham acesso

### 2. Perfis e Permissões

**Perfis padrão:**
- `SUPERADMIN`
- `ADMIN_CRM`
- `GESTOR_COMERCIAL`
- `COORDENADOR_CRM`
- `ATENDENTE_INTERNO`
- `CORRETOR_EXTERNO`
- `MARKETING`
- `DIRETORIA`
- `AUDITORIA`

**Permissões granulares:**
- `crm.leads.view` — visualizar lead
- `crm.leads.edit` — editar lead
- `crm.leads.archive` — excluir/arquivar lead
- `crm.leads.assume` — assumir lead
- `crm.leads.redistribute` — redistribuir lead
- `crm.leads.transfer` — transferir lead
- `crm.leads.view_others` — ver leads de outros usuários
- `crm.leads.view_own_wallet` — ver apenas carteira própria
- `crm.leads.view_shared_wallet` — ver carteira compartilhada
- `crm.leads.view_phone` — ver telefone
- `crm.leads.view_email` — ver e-mail
- `crm.leads.view_origin` — ver origem/campanha
- `crm.leads.view_cost` — ver custo/performance
- `crm.leads.export` — exportar leads
- `crm.leads.change_stage` — alterar etapa
- `crm.leads.register_loss` — registrar perda
- `crm.leads.register_conversion` — registrar ganho/conversão
- `crm.pipeline.manage` — gerenciar funil
- `crm.distribution.manage` — gerenciar distribuição
- `crm.integrations.manage` — gerenciar integrações
- `crm.channels.manage` — gerenciar canais e números
- `crm.reports.view` — ver dashboards
- `crm.audit.view` — ver auditoria

**Escopos suportados:**
- `tenant` / `empresa` / `unidade` / `empreendimento`
- `equipe` / `canal` / `número`
- `carteira_propria` / `carteira_compartilhada`

### 3. Cadastro e Gestão de Leads

CRUD completo com:
- Cadastro manual
- Importação via CSV
- Edição controlada
- Arquivamento
- Histórico
- Filtros avançados
- Visualização em tabela
- Visualização em kanban
- Visualização por carteira
- Visualização por equipe

**Campos mínimos do lead (`crm_leads`):**

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int PK | |
| `tenant_id` | int | Isolamento multi-tenant |
| `external_source_id` | varchar | ID externo (Meta, Google) |
| `source_type` | enum | `META_ADS`, `GOOGLE_ADS`, `MANUAL`, `SITE`, `INDICACAO` |
| `source_name` | varchar | Nome da origem |
| `source_detail` | text | Detalhes adicionais |
| `campaign_id` | int FK | |
| `campaign_name` | varchar | Nome da campanha (desnormalizado) |
| `adset_name` | varchar | |
| `ad_name` | varchar | |
| `form_name` | varchar | |
| `landing_page_url` | text | |
| `utm_source` | varchar | |
| `utm_medium` | varchar | |
| `utm_campaign` | varchar | |
| `utm_content` | varchar | |
| `utm_term` | varchar | |
| `incoming_channel_id` | int FK | Canal pelo qual o lead chegou |
| `incoming_phone_asset_id` | int FK | Número pelo qual chegou |
| `nome` | varchar | |
| `telefone` | varchar | |
| `email` | varchar | |
| `documento` | varchar | CPF/CNPJ |
| `cidade` | varchar | |
| `estado` | varchar | |
| `empreendimento_interesse` | varchar | |
| `produto_interesse` | varchar | |
| `faixa_valor` | varchar | |
| `score` | int | 0-100 |
| `temperatura` | enum | `FRIO`, `MORNO`, `QUENTE` |
| `lifecycle_status` | enum | `NOVO`, `CONTATO`, `QUALIFICADO`, `OPORTUNIDADE`, `CONVERTIDO`, `PERDIDO`, `ARQUIVADO` |
| `pipeline_id` | int FK | |
| `pipeline_stage_id` | int FK | |
| `assigned_user_id` | int FK | |
| `assigned_team_id` | int FK | |
| `owner_type` | enum | `INDIVIDUAL`, `SHARED`, `POOL` |
| `primeiro_contato_at` | datetime | |
| `ultima_interacao_at` | datetime | |
| `proximo_followup_at` | datetime | |
| `motivo_perda_id` | int FK | |
| `motivo_perda_obs` | text | |
| `convertido_at` | datetime | |
| `tags` | json | |
| `observacoes` | text | |
| `created_at` | datetime | |
| `updated_at` | datetime | |
| `archived_at` | datetime | |

**Deduplicação por:**
- Telefone
- E-mail
- Documento
- `external_source_id`
- Combinações configuráveis por tenant

### 4. Contatos e Empresas

Separar conceito de lead e contato maduro.

**Entidades:**
- `crm_contacts` — contatos convertidos
- `crm_companies` — empresas
- `crm_contact_phones` — múltiplos telefones por contato
- `crm_contact_interests` — histórico de interesses
- `crm_lead_contact_link` — relação lead → contato após conversão

### 5. Funil Comercial

Funil configurável por tenant.

**Entidades:**
- `crm_pipelines` — funis
- `crm_pipeline_stages` — etapas do funil

**Campos de `crm_pipeline_stages`:**

| Campo | Tipo |
|---|---|
| `id` | int PK |
| `pipeline_id` | int FK |
| `tenant_id` | int |
| `nome` | varchar |
| `ordem` | int |
| `cor` | varchar |
| `is_initial` | boolean |
| `is_won` | boolean |
| `is_lost` | boolean |
| `requires_loss_reason` | boolean |
| `requires_followup` | boolean |
| `sla_minutes` | int |
| `permissions_json` | json |
| `automation_json` | json |

**Etapas padrão sugeridas:**
1. Novo lead
2. Aguardando contato
3. Em atendimento
4. Contato realizado
5. Qualificado
6. Agendamento
7. Proposta
8. Negociação
9. Fechado ganho *(is_won = true)*
10. Perdido *(is_lost = true, requires_loss_reason = true)*
11. Nutrição

### 6. Distribuição de Leads

Motor robusto com:
- Round robin
- Weighted round robin por percentual
- Distribuição por fila
- Distribuição manual
- Distribuição por campanha
- Distribuição por empreendimento
- Distribuição por número/canal
- Distribuição por horário
- Distribuição por equipe
- Distribuição por score/temperatura
- Redistribuição por SLA
- Redistribuição manual
- Fallback quando não houver elegíveis

**Entidades:**

```
crm_distribution_pools
crm_distribution_members
crm_distribution_rules
crm_lead_assignments
```

**Campos de `crm_distribution_members`:**

| Campo | Tipo |
|---|---|
| `pool_id` | int FK |
| `user_id` | int FK |
| `weight_percent` | decimal |
| `priority` | int |
| `daily_limit` | int |
| `simultaneous_limit` | int |
| `ativo` | boolean |
| `eligibility_json` | json |
| `restrictions_json` | json |

**Campos de `crm_distribution_rules`:**

| Campo | Tipo |
|---|---|
| `tenant_id` | int |
| `nome` | varchar |
| `ativo` | boolean |
| `source_type` | varchar |
| `campaign_id` | int FK |
| `project_id` | int FK |
| `channel_id` | int FK |
| `phone_asset_id` | int FK |
| `lead_temperature` | varchar |
| `owner_phase` | varchar |
| `pool_id` | int FK |
| `fallback_pool_id` | int FK |
| `sla_redistribution_minutes` | int |
| `config_json` | json |

**IMPORTANTE:** O sistema deve suportar fase piloto com apenas 3 a 5 corretores. As regras devem poder depender da fase de rollout ativa do tenant.

### 7. Implantação em Fases (Rollout)

**Entidade:** `crm_rollout_phases`

**Fases sugeridas:**

| Chave | Descrição |
|---|---|
| `pilot_selected_brokers` | Piloto com corretores selecionados |
| `expanded_broker_base` | Base expandida de corretores |
| `internal_prequalification` | Pré-qualificação interna antes de distribuir |
| `full_omnichannel` | Operação omnichannel completa |

Cada tenant deve poder ter uma fase ativa. As regras de distribuição, automação e visibilidade podem depender dessa fase.

### 8. Timeline / Histórico do Lead

**Entidade:** `crm_interactions`

**Tipos de interação:**

| Tipo | Descrição |
|---|---|
| `call` | Ligação telefônica |
| `whatsapp` | Mensagem WhatsApp |
| `note` | Observação interna |
| `email` | E-mail |
| `meeting` | Reunião/visita |
| `status_change` | Mudança de status/etapa |
| `system_event` | Evento do sistema |

Linha do tempo deve cobrir:
- Criação e edição
- Distribuição e redistribuição
- Troca de responsável
- Mudança de etapa
- Observações e contatos realizados
- Perdas e conversões
- Automações executadas
- Mensagens e anexos
- Tarefas criadas/concluídas

### 9. Tarefas e Follow-up

**Entidade:** `crm_tasks`

| Campo | Tipo |
|---|---|
| `id` | int PK |
| `tenant_id` | int |
| `lead_id` | int FK |
| `assigned_user_id` | int FK |
| `title` | varchar |
| `description` | text |
| `task_type` | enum: `CALL`, `VISIT`, `WHATSAPP`, `EMAIL`, `PROPOSAL`, `OTHER` |
| `due_at` | datetime |
| `completed_at` | datetime |
| `status` | enum: `PENDING`, `DONE`, `OVERDUE`, `CANCELLED` |
| `priority` | enum: `LOW`, `MEDIUM`, `HIGH` |
| `metadata_json` | json |

**Funcionalidades:**
- Agendar retorno
- Marcar tarefa de contato
- Registrar visita
- Registrar proposta pendente
- Alertas de vencimento
- Dashboard de tarefas pendentes

### 10. Canais e Números

**Entidades:**
- `crm_channels`
- `crm_phone_assets`

**Campos de `crm_channels`:**

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int PK | |
| `tenant_id` | int | |
| `type` | enum | `WHATSAPP`, `PHONE`, `EMAIL`, `FORM`, `CHAT` |
| `name` | varchar | Nome interno do canal |
| `status` | enum | `ACTIVE`, `INACTIVE`, `BLOCKED` |
| `provider` | varchar | |
| `public_label` | varchar | Nome exibido ao cliente |
| `business_main_phone` | varchar | Número principal institucional |
| `operational_phone` | varchar | Número operacional de campanha |
| `tracking_phone` | varchar | Número intermediário de rastreamento |
| `destination_phone` | varchar | Número real de destino |
| `meta_waba_id` | varchar | |
| `meta_phone_number_id` | varchar | |
| `google_customer_id` | varchar | |
| `config_json` | json | |

**Campos de `crm_phone_assets`:**

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | int PK | |
| `tenant_id` | int | |
| `label` | varchar | |
| `phone_number` | varchar | |
| `country_code` | varchar | |
| `role_type` | enum | `MAIN`, `OPERATIONAL`, `TRACKING`, `DESTINATION` |
| `provider` | varchar | |
| `is_whatsapp_enabled` | boolean | |
| `is_google_ads_enabled` | boolean | |
| `is_meta_ads_enabled` | boolean | |
| `display_name` | varchar | |
| `risk_level` | enum | `LOW`, `MEDIUM`, `HIGH` |
| `can_receive_messages` | boolean | |
| `can_receive_calls` | boolean | |
| `forward_to_phone` | varchar | |
| `status` | enum | `ACTIVE`, `INACTIVE`, `SUSPENDED` |
| `notes` | text | |

### 11. Integração com Meta Ads

**Entidade:** `crm_integration_meta_events`

| Campo | Tipo |
|---|---|
| `id` | int PK |
| `tenant_id` | int |
| `event_type` | varchar |
| `external_event_id` | varchar (unique/tenant) |
| `campaign_name` | varchar |
| `adset_name` | varchar |
| `ad_name` | varchar |
| `form_name` | varchar |
| `payload_json` | json |
| `processing_status` | enum: `PENDING`, `PROCESSED`, `DUPLICATE`, `ERROR` |
| `processed_lead_id` | int FK |
| `error_message` | text |
| `received_at` | datetime |
| `processed_at` | datetime |

**Funcionalidades:**
- Meta Lead Ads
- Click to WhatsApp events
- Webhooks com validação de assinatura
- Auditoria do payload
- Deduplicação
- Processamento idempotente
- Reprocessamento manual em caso de falha

### 12. Integração com Google Ads

**Entidade:** `crm_integration_google_events`

| Campo | Tipo |
|---|---|
| `id` | int PK |
| `tenant_id` | int |
| `event_type` | varchar |
| `external_event_id` | varchar |
| `campaign_name` | varchar |
| `ad_group_name` | varchar |
| `asset_name` | varchar |
| `tracking_phone` | varchar |
| `destination_phone` | varchar |
| `payload_json` | json |
| `processing_status` | enum |
| `processed_lead_id` | int FK |
| `error_message` | text |
| `received_at` | datetime |
| `processed_at` | datetime |

### 13. Inbox / Omnichannel

**Entidades:**
- `crm_conversations`
- `crm_messages`
- `crm_message_templates`
- `crm_conversation_participants`

**Requisitos:**
- Inbox por usuário, por equipe, por número
- Filtros por canal
- Preview de última mensagem
- Status de conversa
- Contagem de não lidas
- Notas internas separadas de mensagens reais
- Preparado para WhatsApp e outros canais futuros

### 14. Automações

**Entidade:** `crm_automation_rules`

**Gatilhos:**
- Lead criado
- Lead sem primeiro contato em X minutos
- Lead sem atividade em X horas
- Mudança de etapa
- Chegada de mensagem
- Corretor recusou lead
- Limite diário atingido
- Fase de rollout alterada

**Ações:**
- Distribuir lead
- Redistribuir lead
- Notificar gestor
- Criar tarefa
- Mudar etapa
- Marcar tag
- Suspender usuário
- Trocar pool
- Arquivar lead

### 15. Relatórios e Dashboards

**KPIs operacionais:**
- Leads recebidos por período
- Tempo até primeiro contato
- Tempo médio por etapa
- Leads sem atendimento
- Leads redistribuídos
- Backlog por usuário
- Tarefas pendentes
- Taxa de aceite por corretor

**KPIs comerciais:**
- Leads por origem e campanha
- Leads por corretor e equipe
- Taxa de qualificação / agendamento / conversão / perda
- Motivos de perda
- Performance por corretor, campanha e empreendimento

**KPIs de canais:**
- Leads por número
- Performance por linha operacional
- Volume por conta
- Performance por tracking number
- Chamadas rastreadas
- Distribuição por canal

### 16. Auditoria

**Entidade:** `crm_audit_logs`

| Campo | Tipo |
|---|---|
| `id` | int PK |
| `tenant_id` | int |
| `entity_type` | varchar |
| `entity_id` | int |
| `action` | varchar |
| `actor_user_id` | int FK |
| `actor_type` | enum: `USER`, `SYSTEM`, `WEBHOOK` |
| `old_data_json` | json |
| `new_data_json` | json |
| `metadata_json` | json |
| `ip_address` | varchar |
| `user_agent` | text |
| `created_at` | datetime |

**Eventos auditados:**
- Criação/edição de lead
- Distribuição e redistribuição
- Troca de etapa e responsável
- Visualização/exportação sensível
- Alterações em regras, integrações, canais, números, permissões
- Recebimento de webhooks e falhas de processamento
- Ações administrativas

### 17. Segurança Obrigatória

- Isolamento por tenant em **todas** as queries
- Autorização server-side
- Validação de escopo por perfil
- Rate limit em endpoints críticos
- Validação de assinatura de webhooks
- Idempotência para eventos externos
- Logs estruturados
- Mascaramento de telefone/e-mail para perfis sem acesso
- Controle de exportação
- Soft delete quando aplicável
- Secrets somente no backend
- Tratamento robusto de erros
- Validações de payload
- Trilha de aceite/recusa de lead

---

## ENDPOINTS

### Admin / Configuração
```
GET  /api/crm/config
PUT  /api/crm/config
GET  /api/crm/rollout-phases
PUT  /api/crm/rollout-phases/:id/activate
```

### Leads
```
GET    /api/crm/leads
POST   /api/crm/leads
GET    /api/crm/leads/:id
PUT    /api/crm/leads/:id
POST   /api/crm/leads/:id/archive
POST   /api/crm/leads/:id/convert
POST   /api/crm/leads/:id/loss
```

### Distribution
```
GET    /api/crm/distribution/pools
POST   /api/crm/distribution/pools
PUT    /api/crm/distribution/pools/:id
GET    /api/crm/distribution/rules
POST   /api/crm/distribution/rules
POST   /api/crm/leads/:id/assign
POST   /api/crm/leads/:id/redistribute
```

### Pipeline
```
GET    /api/crm/pipelines
POST   /api/crm/pipelines
PUT    /api/crm/pipelines/:id
POST   /api/crm/leads/:id/move-stage
```

### Inbox
```
GET    /api/crm/conversations
GET    /api/crm/conversations/:id
POST   /api/crm/conversations/:id/messages
POST   /api/crm/conversations/:id/transfer
```

### Tasks
```
GET    /api/crm/tasks
POST   /api/crm/tasks
PUT    /api/crm/tasks/:id
POST   /api/crm/tasks/:id/complete
```

### Integrations
```
POST   /api/crm/webhooks/meta
POST   /api/crm/webhooks/google
POST   /api/crm/integrations/meta/test
POST   /api/crm/integrations/google/test
```

### Reports
```
GET    /api/crm/reports/operational
GET    /api/crm/reports/conversion
GET    /api/crm/reports/channels
GET    /api/crm/reports/distribution
```

---

## TELAS FRONTEND

### Admin
- Configuração geral do CRM
- Fases de rollout
- Usuários e permissões
- Equipes
- Canais
- Números e contas
- Pipelines e etapas
- Motivos de perda
- Pools de distribuição
- Regras de distribuição
- Integrações
- Automações

### Operação
- Dashboard operacional
- Lista de leads
- Kanban
- Detalhe do lead
- Timeline do lead
- Inbox
- Tarefas / follow-ups
- Carteira por usuário
- Leads redistribuídos
- Agenda

### Gestão
- Dashboard gerencial
- Relatórios
- Ranking
- Auditoria

---

## REGRAS DE UX

- Filtros persistidos por usuário
- Tabela + kanban
- Badges de canal, origem e etapa
- SLA vencido com destaque visual
- Timeline centralizada no detalhe do lead
- Ações rápidas
- Mascaramento visual de dados sensíveis
- Indicação clara de:
  - Número principal institucional
  - Número operacional
  - Tracking number
  - Destination number
- Interface administrativa amigável

---

## ESTRUTURA DE CÓDIGO ESPERADA

```
backend/
  migrations/
    YYYYMMDD-create-crm-*.js   (uma por entidade principal)
  src/
    models/
      Crm*.js
    controllers/
      crm/
        CrmLeadsController.js
        CrmPipelineController.js
        CrmDistributionController.js
        CrmTasksController.js
        CrmChannelsController.js
        CrmReportsController.js
        CrmAdminController.js
        CrmWebhookMetaController.js
        CrmWebhookGoogleController.js
        CrmAuditController.js
    services/
      crm/
        leadService.js
        distributionEngine.js
        pipelineService.js
        deduplicationService.js
        webhookMetaService.js
        webhookGoogleService.js
        crmAuditService.js
        rolloutService.js
    validators/
      crmValidators.js
    middlewares/
      crmAccess.js          # verificação de permissões CRM
      crmTenantScope.js     # isolamento por tenant

frontend/
  src/
    modules/
      crm/
        pages/
          CrmDashboard.jsx
          CrmLeads.jsx
          CrmLeadDetalhe.jsx
          CrmKanban.jsx
          CrmTarefas.jsx
          CrmInbox.jsx
          CrmRelatorios.jsx
          CrmAdmin.jsx
          crm-admin/
            CrmAdminPipeline.jsx
            CrmAdminDistribuicao.jsx
            CrmAdminCanais.jsx
            CrmAdminNumeros.jsx
            CrmAdminIntegracoes.jsx
            CrmAdminRollout.jsx
        components/
          LeadCard.jsx
          LeadTimeline.jsx
          KanbanBoard.jsx
          DistribuicaoPoolCard.jsx
          PhoneAssetBadge.jsx
          SlaIndicator.jsx
        hooks/
          useCrmLeads.js
          useCrmPipeline.js
          useCrmTasks.js
        services/
          crmApi.js
```

---

## ORDEM DE IMPLEMENTAÇÃO

### FASE 1 — Base operacional
- Core do módulo + feature flag
- Config por tenant
- Permissões granulares (backend)
- Entidades base: leads, pipeline, etapas, motivos de perda
- CRUD de leads (cadastro manual)
- Pipeline básico
- Distribuição piloto (round robin simples)
- Auditoria base
- Telas: lista de leads, kanban, detalhe do lead

### FASE 2 — Operação expandida
- Timeline do lead (`crm_interactions`)
- Tarefas e follow-up (`crm_tasks`)
- Carteira por usuário
- Relatórios operacionais
- Rollout phases (`crm_rollout_phases`)
- Telas: tarefas, dashboard operacional, carteira

### FASE 3 — Canais e integrações
- Canais (`crm_channels`)
- Números e phone assets (`crm_phone_assets`)
- Meta webhook base (`crm_integration_meta_events`)
- Google webhook base (`crm_integration_google_events`)
- Deduplicação robusta
- Telas: admin canais, admin números, admin integrações

### FASE 4 — Inbox e automações
- Inbox unificado (`crm_conversations`, `crm_messages`)
- Automações (`crm_automation_rules`)
- Dashboards gerenciais
- Redistribuição por SLA
- Exportações seguras
- Telas: inbox, automações, dashboard gerencial

### FASE 5 — Maturidade e expansão
- Suporte completo a pré-qualificação interna
- Expansão de pools
- Otimizações de performance
- Hardening de segurança
- Melhorias de UX baseadas em uso real

---

## RESULTADO ESPERADO

Um módulo CRM realmente utilizável dentro do FLUXY, com qualidade de produto real, arquitetura profissional, regras configuráveis, segurança, rastreabilidade e preparado para crescer sem retrabalho.

Não um CRUD simples de leads. Um **motor comercial modular completo**, preparado para operação real com equipes internas, corretores externos, múltiplos canais, distribuição configurável e rastreabilidade total.
