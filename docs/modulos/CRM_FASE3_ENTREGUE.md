# CRM - Fase 3 Entregue

Data: 2026-04-20

## Escopo concluido

A Fase 3 do modulo CRM foi conectada ao padrao atual do FLUXY, mantendo CRM como modulo habilitavel por instalacao.

Entregas:

- Migration `202604200003_crm_fase3.js` com as tabelas `crm_channels`, `crm_phone_assets`, `crm_integration_meta_events` e `crm_integration_google_events`.
- Models Sequelize registrados em `src/models/index.js`.
- Associacoes dos eventos Meta/Google com leads processados.
- Services de canais, numeros, configuracao de integracoes, webhooks Meta e webhooks Google.
- Controllers administrativos e controllers publicos de webhook.
- Rotas administrativas protegidas por `requireEnabledModule('CRM')` e `requireCrmModule()`.
- Rotas publicas de webhook antes do auth, protegidas por modulo habilitado e validacao de token/assinatura.
- Frontend com telas:
  - `CRM > Canais`
  - `CRM > Numeros`
  - `CRM > Integracoes`
- Menu CRM atualizado.
- Services frontend atualizados em `src/services/crm.js`.

## Rotas backend adicionadas

Administrativas:

- `GET /api/crm/channels`
- `POST /api/crm/channels`
- `GET /api/crm/channels/:id`
- `PATCH /api/crm/channels/:id`
- `DELETE /api/crm/channels/:id`
- `GET /api/crm/phone-assets`
- `POST /api/crm/phone-assets`
- `GET /api/crm/phone-assets/:id`
- `PATCH /api/crm/phone-assets/:id`
- `DELETE /api/crm/phone-assets/:id`
- `GET /api/crm/integrations/config`
- `PATCH /api/crm/integrations/config`
- `GET /api/crm/integrations/meta/events`
- `POST /api/crm/integrations/meta/events/:id/reprocess`
- `GET /api/crm/integrations/google/events`
- `POST /api/crm/integrations/google/events/:id/reprocess`

Publicas de webhook:

- `GET /api/crm/webhooks/meta`
- `POST /api/crm/webhooks/meta`
- `POST /api/crm/webhooks/google`

## Observacoes de seguranca

As rotas de webhook nao usam JWT porque Meta/Google nao conseguem autenticar como usuarios internos do FLUXY. Por isso elas ficam antes do middleware de auth, mas ainda exigem:

- CRM habilitado na instalacao.
- Rate limit especifico para recebimento dos webhooks.
- Token de verificacao no handshake Meta.
- Assinatura HMAC quando o segredo estiver configurado.
- Registro persistente do payload recebido.
- Processamento idempotente e reprocessamento manual.

## Configuracoes CRM criadas

As configuracoes ficam em `crm_config`:

- `CRM_META_WEBHOOK_SECRET`
- `CRM_META_VERIFY_TOKEN`
- `CRM_GOOGLE_WEBHOOK_SECRET`

Na tela `CRM > Integracoes`, o admin pode configurar `verify token` da Meta e trocar os secrets de webhook. Secrets existentes nao sao exibidos integralmente na tela; a interface mostra apenas se ja estao configurados.

## Validacao executada

- `node --check` nos controllers, services e routes alterados.
- `npm run migrate` no backend, aplicando `202604200003_crm_fase3.js`.
- `npm run build` no frontend.

## Proxima fase sugerida

Fase 4:

- Inbox unificado.
- Conversas e mensagens.
- Automacoes de atendimento.
- Dashboards gerenciais de conversao, canais e distribuicao.
