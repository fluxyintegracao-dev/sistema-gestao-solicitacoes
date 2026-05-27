# Roadmap Execucao Core Gateway

## Fase 0 - Governanca

Entregas:

- `docs/COLABORACAO_AGENTES.md`;
- fronteiras Core x Experience;
- classificacao LGPD;
- contratos iniciais de API;
- eventos oficiais iniciais;
- ownership registrado.

Status: concluida em 2026-05-27 para a base documental inicial.

## Fase 1 - Estrutura backend

Criado:

```text
backend/src/modules/coreGateway/
  controllers/
  services/
  routes/
  validators/
  middlewares/
  audit/
```

Objetivo:

- modulo isolado;
- flag `CORE_GATEWAY_ENABLED`;
- health check;
- padrao de resposta;
- middleware de autenticacao entre sistemas;
- audit log inicial.

Status: concluida em 2026-05-27 como skeleton seguro.

Observacoes:

- `GET /api/gateway/health` esta ativo para monitoramento;
- endpoints de Portal Cliente estao reservados e retornam `501 PLANNED`;
- nenhuma view real do Core foi exposta nesta fase;
- autenticacao usa HMAC SHA256 com segredo no backend;
- `CORE_GATEWAY_ENABLED=false` mantem o gateway protegido por padrao.

## Fase 2 - APIs comerciais

Endpoints implementados em 2026-05-27:

- `GET /api/gateway/comercial/empreendimentos`;
- `GET /api/gateway/comercial/unidades`;
- `GET /api/gateway/comercial/mapa-unidades`;
- `POST /api/gateway/comercial/simulacao`.

Status: concluida para primeira versao publica controlada.

Observacoes:

- reaproveita dominio comercial oficial do Core;
- nao expõe clientes, contratos, reservas, dados financeiros internos ou documentos;
- simulacao e preliminar e marcada como nao oficial;
- toda chamada exige HMAC e feature flag ativa.

## Fase 3 - Portal Cliente

Fundacao implementada:

- `POST /api/gateway/portal/autorizacao`.

Endpoints:

- `GET /api/gateway/portal/dashboard`;
- `GET /api/gateway/portal/financeiro`;
- `GET /api/gateway/portal/parcelas`;
- `GET /api/gateway/portal/boletos/:id`;
- `GET /api/gateway/portal/documentos`;
- `GET /api/gateway/portal/obra`;
- `GET /api/gateway/portal/chamados`;
- `POST /api/gateway/portal/chamados`.

Status: contrato arquitetural preparado em 2026-05-27.

Documento:

```text
docs/core-gateway/PORTAL_CLIENTE_AUTENTICACAO_AUTORIZACAO.md
```

Decisoes:

- Experience autentica o cliente final;
- Core autoriza por vinculo oficial com `Parceiro`/`ContratoComercial`;
- Experience deve enviar id externo e hash de documento;
- Core nao retorna dados sensiveis sem validar contrato/parcela/documento;
- implementacao real permanece pendente.

## Fase 4 - Eventos

Implementado parcialmente em 2026-05-27:

- catalogo tecnico em `backend/src/modules/coreGateway/events/coreGatewayEvents.js`;
- endpoint autenticado `GET /api/gateway/events/catalog`.

Ainda pendente:

- persistencia/auditoria;
- endpoint ou worker de publicacao futura;
- idempotencia.

## Fase 5 - Segurança

Validar:

- autenticacao;
- rate limit;
- logs;
- auditoria;
- presigned URLs;
- segregacao por cliente;
- dados sensiveis;
- bloqueio de endpoints internos.

## Fase 6 - Homologacao conjunta

Validar com Experience:

- consumo de endpoints;
- payloads;
- erros;
- fallback;
- cache;
- seguranca;
- telas CRM/Portal.
