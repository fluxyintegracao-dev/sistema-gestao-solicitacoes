# FLUXY CRM — Fase 2 Entregue

> **Status:** Concluída  
> **Data:** 2026-04-20  
> **Módulo:** `CRM`  
> **Produto:** FLUXY Core (`sistema_gestao_solicitacoes`)

---

## O que foi entregue

### Backend

#### Migration
| Arquivo | Conteúdo |
|---|---|
| `backend/migrations/202604200002_crm_fase2.js` | Cria 3 novas tabelas com seeds |

**Tabelas criadas:**

| Tabela | Descrição | Seed |
|---|---|---|
| `crm_interactions` | Timeline de interações do lead (ligação, WhatsApp, nota, etc.) | — |
| `crm_tasks` | Tarefas e follow-ups com tipos, prioridade, prazo e status | — |
| `crm_rollout_phases` | Fases de implantação por tenant | 4 fases padrão |

**Fases de rollout padrão:**
1. `pilot_selected_brokers` — Piloto com corretores selecionados *(is_current = true)*
2. `expanded_broker_base` — Base expandida de corretores
3. `internal_prequalification` — Pré-qualificação interna
4. `full_omnichannel` — Operação omnichannel completa

#### Modelos Sequelize
| Arquivo | Model |
|---|---|
| `src/models/CrmInteraction.js` | `CrmInteraction` — updatedAt: false |
| `src/models/CrmTask.js` | `CrmTask` |
| `src/models/CrmRolloutPhase.js` | `CrmRolloutPhase` |

Registrados em `src/models/index.js` com associações:
- `CrmInteraction` → `belongsTo(CrmLead)`, `belongsTo(User, as: 'usuario')`
- `CrmLead` → `hasMany(CrmInteraction)`
- `CrmTask` → `belongsTo(CrmLead)`, `belongsTo(User, as: 'responsavel')`, `belongsTo(User, as: 'criadoPor')`
- `CrmLead` → `hasMany(CrmTask)`

#### Services
| Arquivo | Responsabilidade |
|---|---|
| `src/services/crmInteractionService.js` | CRUD de interações, atualiza ultima_interacao_at e primeiro_contato_at |
| `src/services/crmTaskService.js` | CRUD de tarefas, conclusão, cancelamento, atualiza proximo_followup_at |

**Funções exportadas — crmInteractionService:**
- `listarInteracoes(leadId, query)` — paginado por lead
- `registrarInteracao(leadId, dados, userId, req)` — cria + audit + atualiza lead

**Funções exportadas — crmTaskService:**
- `listarTarefas(query)` — filtros: status, task_type, assigned_user_id, lead_id, vencidas
- `criarTarefa(dados, userId, req)` — cria + audit + atualiza proximo_followup_at
- `atualizarTarefa(id, dados, userId, req)` — campos permitidos
- `concluirTarefa(id, userId, req)` — status DONE + completed_at
- `cancelarTarefa(id, userId, req)` — status CANCELLED

#### Controllers
| Arquivo | Endpoints cobertos |
|---|---|
| `src/controllers/CrmTasksController.js` | index, create, update, complete, cancel |
| `src/controllers/CrmDashboardController.js` | operacional |
| `src/controllers/CrmLeadsController.js` | + listInteractions, createInteraction (adicionados) |

#### Rotas registradas (`src/routes.js`)
```
GET    /api/crm/leads/:id/interactions
POST   /api/crm/leads/:id/interactions
GET    /api/crm/tasks
POST   /api/crm/tasks
PATCH  /api/crm/tasks/:id
PATCH  /api/crm/tasks/:id/complete
PATCH  /api/crm/tasks/:id/cancel
GET    /api/crm/dashboard/operacional
```
Todas protegidas por `requireEnabledModule('CRM')` + `requireCrmModule()`.

---

### Frontend

#### Service
Adicionado em `src/services/crm.js`:
- `listarInteracoes(leadId, params)`
- `registrarInteracao(leadId, dados)`
- `listarTarefas(params)`
- `criarTarefa(dados)`
- `atualizarTarefa(id, dados)`
- `concluirTarefa(id)`
- `cancelarTarefa(id)`
- `obterDashboardOperacional()`

#### Páginas novas
| Arquivo | Rota | Descrição |
|---|---|---|
| `modules/crm/pages/CrmDashboard.jsx` | `/crm/dashboard` | KPIs operacionais: leads, SLA, tarefas, distribuição lifecycle, backlog por responsável |
| `modules/crm/pages/CrmTarefas.jsx` | `/crm/tarefas` | Lista global de tarefas com filtros, concluir/cancelar inline |
| `modules/crm/pages/CrmCarteira.jsx` | `/crm/carteira` | Leads atribuídos ao usuário logado com filtros |

#### Página atualizada
`CrmLeadDetalhe.jsx` — adicionados:
- Seção **Interacoes**: lista de interações do lead + formulário inline para registrar (tipo + título + conteúdo)
- Seção **Tarefas**: lista de tarefas do lead + formulário inline para criar (título, tipo, prioridade, prazo) + botões concluir/cancelar

#### Menu lateral (`Layout.jsx`)
Grupo CRM agora inclui:
- Dashboard → `/crm/dashboard`
- Leads → `/crm/leads`
- Minha Carteira → `/crm/carteira`
- Novo Lead → `/crm/leads/novo`
- Kanban → `/crm/kanban`
- Tarefas → `/crm/tarefas`

#### App.jsx
3 novos lazy imports (`CrmDashboard`, `CrmTarefas`, `CrmCarteira`) e 3 novas rotas registradas sob `CrmRoute`.

---

## Comportamentos relevantes

- **Interações de contato** (CALL, WHATSAPP, EMAIL, MEETING) atualizam `primeiro_contato_at` do lead se ainda não registrado
- **Criação de tarefa** com `due_at` atualiza `proximo_followup_at` do lead (se a data for mais próxima que a existente)
- **Dashboard SLA**: alerta de leads sem primeiro contato há mais de 60 minutos
- **Carteira**: filtra automaticamente por `assigned_user_id = user.id` do usuário logado
- **Fase de rollout ativa**: `crm_rollout_phases` com `is_current = true` = `pilot_selected_brokers` por padrão

---

## Pendências de Fase 2 (não implementado — planejado para fases seguintes)

- Alertas/notificações de tarefas vencendo (motor de alertas) → Fase 3+
- Atribuição de leads a usuários (motor de distribuição) → Fase 3
- Filtro "Minhas Tarefas" na CrmCarteira → pode ser adicionado
- Dashboard gerencial (relatórios por período, funil, conversão por corretor) → Fase 4

---

## Próxima fase

O estado atual consolidado esta em `docs/modulos/crm/README.md`.

Escopo Fase 3:
- `crm_channels` — canais de comunicação (WhatsApp, Phone, Email, Form)
- `crm_phone_assets` — ativos de número com papel (MAIN, OPERATIONAL, TRACKING, DESTINATION)
- `crm_integration_meta_events` — webhooks Meta Ads
- `crm_integration_google_events` — webhooks Google Ads
- Telas admin: canais, números, integrações
