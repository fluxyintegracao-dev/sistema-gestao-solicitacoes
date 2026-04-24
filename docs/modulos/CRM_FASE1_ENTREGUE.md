# FLUXY CRM — Fase 1 Entregue

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
| `backend/migrations/202604200001_crm_base.js` | Cria todas as tabelas base do CRM com seeds de dados padrão |

**Tabelas criadas:**

| Tabela | Descrição | Seed |
|---|---|---|
| `crm_config` | Configurações chave-valor do módulo CRM | 6 chaves padrão |
| `crm_pipelines` | Funis comerciais configuráveis | 1 pipeline padrão |
| `crm_pipeline_stages` | Etapas do funil com cores, SLA, flags | 11 etapas padrão |
| `crm_loss_reasons` | Catálogo de motivos de perda | 9 motivos padrão |
| `crm_leads` | Tabela principal de leads | — |
| `crm_audit_logs` | Trilha de auditoria de todas ações no CRM | — |

**Etapas padrão do funil:**
1. Novo Lead *(is_initial, SLA 60 min)*
2. Aguardando Contato *(SLA 120 min)*
3. Em Atendimento
4. Contato Realizado
5. Qualificado
6. Agendamento
7. Proposta
8. Negociação
9. Fechado Ganho *(is_won)*
10. Perdido *(is_lost, requires_loss_reason)*
11. Nutrição

#### Modelos Sequelize
| Arquivo | Model |
|---|---|
| `src/models/CrmConfig.js` | `CrmConfig` |
| `src/models/CrmPipeline.js` | `CrmPipeline` |
| `src/models/CrmPipelineStage.js` | `CrmPipelineStage` |
| `src/models/CrmLossReason.js` | `CrmLossReason` |
| `src/models/CrmLead.js` | `CrmLead` |
| `src/models/CrmAuditLog.js` | `CrmAuditLog` |

Todos registrados em `src/models/index.js` com relacionamentos completos:
- `CrmPipeline` → `hasMany(CrmPipelineStage)`
- `CrmLead` → `belongsTo(CrmPipeline, CrmPipelineStage, User, CrmLossReason)`
- `CrmLead` → `hasMany(CrmAuditLog)`

#### Middleware
| Arquivo | Função |
|---|---|
| `src/middlewares/crmAccess.js` | Valida módulo CRM habilitado + perfil autorizado |

Perfis com acesso padrão: `SUPERADMIN`, `ADMIN`, `ADMINISTRADOR`, `ADMIN_CRM`, `GESTOR_COMERCIAL`, `COORDENADOR_CRM`, `DIRETORIA`

#### Service
| Arquivo | Responsabilidade |
|---|---|
| `src/services/crmService.js` | CRUD leads, pipeline, kanban, dedup, perda, conversão, auditoria |

**Funções exportadas:**
- `listarLeads(query)` — listagem paginada com filtros (status, temperatura, stage, origem, busca textual)
- `obterLead(id)` — detalhe com includes (etapa, pipeline, responsável, motivo perda, últimos 50 logs)
- `criarLead(dados, userId, req)` — cria com dedup automático por telefone/email/documento/external_source_id
- `atualizarLead(id, dados, userId, req)` — atualização de campos permitidos
- `alterarEtapa(id, stageId, userId, req)` — move no funil com atualização de lifecycle_status automática
- `registrarPerda(id, motivoId, obs, userId, req)` — registra perda com motivo
- `registrarConversao(id, userId, req)` — registra conversão com timestamp
- `arquivarLead(id, userId, req)` — arquiva lead
- `listarPipelines()` — funis ativos com etapas
- `listarMotivosPerda()` — catálogo ativo
- `kanbanLeads(pipelineId, query)` — leads agrupados por etapa para o board
- `registrarAuditCrm({...})` — registra evento no crm_audit_logs

#### Controllers
| Arquivo | Endpoints cobridos |
|---|---|
| `src/controllers/CrmLeadsController.js` | index, show, create, update, changeStage, registerLoss, registerConversion, archive |
| `src/controllers/CrmPipelineController.js` | index, kanban, lossReasons |

#### Rotas registradas (`src/routes.js`)
```
GET    /api/crm/pipelines
GET    /api/crm/pipelines/:id/kanban
GET    /api/crm/loss-reasons
GET    /api/crm/leads
POST   /api/crm/leads
GET    /api/crm/leads/:id
PATCH  /api/crm/leads/:id
PATCH  /api/crm/leads/:id/stage
PATCH  /api/crm/leads/:id/loss
PATCH  /api/crm/leads/:id/convert
PATCH  /api/crm/leads/:id/archive
```
Todas protegidas por `requireEnabledModule('CRM')` + `requireCrmModule()`.

#### Catálogo de módulos
CRM adicionado em `src/services/moduleConfigService.js` — habilitável via Configurações > Módulos.

---

### Frontend

#### Service
| Arquivo | Funções |
|---|---|
| `src/services/crm.js` | `listarLeads`, `obterLead`, `criarLead`, `atualizarLead`, `alterarEtapaLead`, `registrarPerdaLead`, `registrarConversaoLead`, `arquivarLead`, `listarPipelines`, `obterKanban`, `listarMotivosPerda` |

#### Páginas
| Arquivo | Rota | Descrição |
|---|---|---|
| `modules/crm/pages/CrmLeads.jsx` | `/crm/leads` | Listagem com filtros, cards de resumo, tabela paginada |
| `modules/crm/pages/CrmNovoLead.jsx` | `/crm/leads/novo` | Formulário de cadastro manual com detecção de duplicata |
| `modules/crm/pages/CrmLeadDetalhe.jsx` | `/crm/leads/:id` | Detalhe completo: edição inline, troca de etapa, registrar perda/conversão, histórico de auditoria |
| `modules/crm/pages/CrmKanban.jsx` | `/crm/kanban` | Board kanban por etapas com seletor de pipeline |

#### Controle de acesso
- `canAccessCrm(user)` adicionado em `src/utils/acessoProduto.js`
- `CrmRoute` guard adicionado em `App.jsx`
- Grupo **CRM** adicionado no menu lateral em `Layout.jsx` (só aparece quando módulo habilitado + perfil autorizado)
- Lazy imports e rotas registradas em `App.jsx`

---

## Como habilitar

1. Acessar **Configurações > Módulos** como SUPERADMIN ou ADMINISTRADOR
2. Habilitar o módulo **CRM**
3. O menu CRM aparecerá automaticamente para perfis com acesso

---

## Pendências de Fase 1 (não implementado — planejado para fases seguintes)

- Distribuição de leads (motor round-robin/weighted) → Fase 2
- Rollout phases por tenant → Fase 2
- Timeline/interações do lead → Fase 2
- Tarefas e follow-up → Fase 2
- Dashboard operacional → Fase 2
- Canais e números (crm_channels, crm_phone_assets) → Fase 3
- Integração Meta Ads webhook → Fase 3
- Integração Google Ads webhook → Fase 3
- Inbox omnichannel → Fase 4
- Automações → Fase 4
- Relatórios gerenciais → Fase 4
- Exportação segura de leads → Fase 4

---

## Próxima fase

Ver `PLANO_MODULO_CRM.md` — **Fase 2: Operação expandida**

Escopo Fase 2:
- `crm_interactions` — timeline completa do lead
- `crm_tasks` — tarefas e follow-up com alertas
- `crm_rollout_phases` — fases de implantação por tenant
- Carteira por usuário (minha carteira)
- Dashboard operacional (backlog, SLA, follow-ups vencidos)
- Telas: CrmTarefas, CrmDashboard, página carteira pessoal
