# Ownership Ativo

## Objetivo

Registrar quais sessoes ou chats estao com ownership ativo de arquivos neste repositorio ou em trabalho coordenado com outros repositorios.

## Status atual

- Nenhum ownership ativo registrado nesta sessao.

## Ownership ativo

- Sessao:
  - escopo: governanca Core + Experience e planejamento Core Gateway
  - repositorio: c:\Fluxy
  - arquivos:
    - docs/COLABORACAO_AGENTES.md
    - docs/core-gateway/FRONTEIRAS_CORE_EXPERIENCE.md
    - docs/core-gateway/CONTRATOS_API_EXPERIENCE.md
    - docs/core-gateway/LGPD_DADOS_EXPERIENCE.md
    - docs/core-gateway/EVENTOS_CORE_EXPERIENCE.md
    - docs/core-gateway/ROADMAP_EXECUCAO_CORE_GATEWAY.md
    - docs/workspace/OWNERSHIP_ATIVO.md
    - docs/workspace/INTEGRACOES_ATIVAS.md
    - docs/workspace/HANDOFF_GLOBAL.md
    - backend/.env.example
    - backend/src/app.js
    - backend/src/config/env.js
    - backend/src/modules/coreGateway/
  - iniciado_em: 2026-05-27
  - observacoes: agente principal no FLUXY CORE; agente auxiliar deve trabalhar apenas em C:\Fluxy_Experience e consultar os contratos publicados aqui

- Sessao:
  - escopo: coordenacao multirrepositorio Core + Experience ate a borda de Portal/CRM
  - repositorio: c:\Fluxy e c:\Fluxy_Experience
  - arquivos:
    - docs/workspace/OWNERSHIP_ATIVO.md
    - docs/workspace/HANDOFF_GLOBAL.md
    - docs/core-gateway/CONTRATOS_API_EXPERIENCE.md
    - docs/core-gateway/PORTAL_CLIENTE_AUTENTICACAO_AUTORIZACAO.md
    - ../Fluxy_Experience/docs/workspace/
    - ../Fluxy_Experience/docs/core-integration/
    - ../Fluxy_Experience/docs/deploy/DEPLOY_EXPERIENCE_SUBDOMINIO.md
  - iniciado_em: 2026-05-27
  - observacoes: agente principal assume coordenacao dos dois projetos ate o ponto de iniciar construcao funcional de Portal Cliente e CRM

- Sessao:
  - escopo: atualizacao em tempo real leve para solicitacoes via SSE + refresh pontual no frontend
  - repositorio: c:\Fluxy
  - arquivos:
    - docs/workspace/OWNERSHIP_ATIVO.md
    - backend/src/routes.js
    - backend/src/controllers/SolicitacaoController.js
    - backend/src/controllers/AnexoController.js
    - backend/src/controllers/LiveUpdatesController.js
    - backend/src/services/liveUpdatesBroker.js
    - backend/src/services/solicitacaoRealtimeService.js
    - frontend/src/main.jsx
    - frontend/src/contexts/LiveUpdatesContext.jsx
    - frontend/src/services/solicitacoes.js
    - frontend/src/pages/Solicitacoes/index.jsx
    - frontend/src/pages/Solicitacoes/TabelaSolicitacoes.jsx
    - frontend/src/pages/Solicitacoes/LinhaSolicitacao.jsx
    - frontend/src/pages/SolicitacaoDetalhe/index.jsx
  - iniciado_em: 2026-05-08
  - observacoes: sem sobrepor arquivos ja modificados localmente fora do fluxo de solicitacoes

## Modelo

```md
## Ownership ativo
- Sessao:
  - escopo:
  - repositorio:
  - arquivos:
    - caminho/do/arquivo
  - iniciado_em:
  - observacoes:
```
