# Colaboracao Agentes - FLUXY Core + FLUXY Experience

## Objetivo

Este documento coordena a execucao paralela entre:

- Agente Principal: FLUXY CORE em `C:\Fluxy`;
- Agente Auxiliar: FLUXY EXPERIENCE em `C:\Fluxy_Experience`.

O objetivo e evoluir CRM Experience, Portal do Cliente e Core Gateway sem quebrar a separacao entre verdade oficial e camada de experiencia.

## Regra central

O FLUXY CORE e a fonte oficial da verdade.

O FLUXY EXPERIENCE nao acessa banco do Core, nao oficializa contratos, nao oficializa financeiro, nao altera status final sozinho e nao executa regra critica que pertence ao Core.

Toda integracao deve passar por APIs oficiais do Core Gateway.

## Responsabilidades

### Agente Principal - Core

Responsavel por:

- governanca;
- dados oficiais;
- contratos oficiais;
- financeiro oficial;
- clientes oficiais;
- unidades oficiais;
- auditoria;
- permissoes;
- documentos oficiais;
- APIs seguras;
- Core Gateway;
- eventos oficiais.

### Agente Auxiliar - Experience

Responsavel por:

- site publico;
- CRM comercial;
- leads;
- funil;
- corretores externos;
- campanhas;
- simulador;
- mapa visual;
- portal do cliente;
- visualizacao financeira;
- visualizacao de obra;
- UX/UI;
- analytics comercial;
- experiencia 3D/VR.

## Arquivos de colaboracao

No Core:

```text
C:\Fluxy\docs\COLABORACAO_AGENTES.md
C:\Fluxy\docs\core-gateway\FRONTEIRAS_CORE_EXPERIENCE.md
C:\Fluxy\docs\core-gateway\CONTRATOS_API_EXPERIENCE.md
C:\Fluxy\docs\core-gateway\LGPD_DADOS_EXPERIENCE.md
C:\Fluxy\docs\core-gateway\EVENTOS_CORE_EXPERIENCE.md
C:\Fluxy\docs\core-gateway\ROADMAP_EXECUCAO_CORE_GATEWAY.md
C:\Fluxy\docs\workspace\OWNERSHIP_ATIVO.md
C:\Fluxy\docs\workspace\HANDOFF_GLOBAL.md
```

No Experience:

```text
C:\Fluxy_Experience\AGENTS.md
C:\Fluxy_Experience\docs\COLABORACAO_AGENTES.md
C:\Fluxy_Experience\docs\MASTER_VISAO.md
C:\Fluxy_Experience\docs\core-integration\CONSUMO_CORE_GATEWAY.md
C:\Fluxy_Experience\docs\core-integration\CONTRATOS_PAYLOADS.md
C:\Fluxy_Experience\docs\core-integration\LIMITES_EXPERIENCE.md
```

## Ownership inicial

### Core

Arquivos reservados ao Agente Principal:

- `docs/COLABORACAO_AGENTES.md`;
- `docs/core-gateway/*`;
- `docs/workspace/OWNERSHIP_ATIVO.md`;
- `docs/workspace/HANDOFF_GLOBAL.md`;
- `backend/.env.example`;
- `backend/src/app.js`;
- `backend/src/config/env.js`;
- `backend/src/modules/coreGateway/*`.

### Experience

Arquivos recomendados ao Agente Auxiliar:

- `docs/COLABORACAO_AGENTES.md`;
- `docs/core-integration/*`;
- `src/modules/crm/*`;
- `src/modules/corretor/*`;
- `src/modules/portal-cliente/*`;
- `src/lib/core-gateway/*`;
- `api/src/modules/crm/*`, se o backend Experience adotar estrutura modular.

## Fluxo de trabalho

1. Agente Principal documenta contrato no Core.
2. Agente Auxiliar consulta contrato e prepara mocks/clientes.
3. Agente Principal implementa endpoint em Core Gateway.
4. Agente Principal valida seguranca, permissao e auditoria.
5. Agente Auxiliar consome endpoint sem acessar banco do Core.
6. Ambos atualizam handoff e integracoes ativas.

## Regras proibitivas

O Experience nunca deve:

- acessar banco do Core;
- receber credenciais internas do Core;
- expor dados financeiros completos;
- armazenar documentos oficiais sensiveis sem necessidade;
- alterar contrato oficial;
- alterar parcela oficial;
- alterar status oficial de unidade;
- gerar boleto oficial;
- assinar ou cancelar contrato;
- inferir regra critica do Core.

O Core nunca deve:

- entregar dados sensiveis sem escopo claro;
- expor APIs internas para o Experience;
- permitir bypass de permissao;
- omitir auditoria de acesso a documentos ou dados financeiros;
- aceitar payload sem validacao.

## Status inicial

- Documentacao de fronteiras: criada.
- Contratos de API: rascunho inicial com assinatura HMAC documentada.
- Implementacao do Core Gateway: skeleton seguro criado em `backend/src/modules/coreGateway`.
- Rotas comerciais reais: implementadas com dados publicaveis.
- Rotas Portal Cliente: reservadas e retornam `501 PLANNED`.
- Implementacao CRM Experience: pendente para agente auxiliar.
- Implementacao Portal Cliente: pendente para agente auxiliar.
