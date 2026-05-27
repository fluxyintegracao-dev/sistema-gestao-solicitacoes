# Handoff Global

## Objetivo

Registrar o estado mais recente do trabalho para que outra sessao ou outro chat consiga continuar sem perder contexto.

## Modelo

```md
## Handoff
- data:
- sessao:
- escopo concluido:
- repositorio:
- arquivos alterados:
  - caminho/do/arquivo
- validacao executada:
  - comando
- riscos conhecidos:
  - descricao
- proximo passo recomendado:
  - descricao
```

## Estado atual

- data: 2026-05-27
- sessao: agente principal Core
- escopo concluido:
  - criada base documental para colaboracao Core + Experience
  - definidas fronteiras Core/Experience
  - criada classificacao LGPD inicial
  - criado contrato inicial de APIs do Core Gateway
  - criado catalogo inicial de eventos Core -> Experience
  - registrado roadmap de execucao do Core Gateway
- repositorio: C:\Fluxy
- arquivos alterados:
  - docs/COLABORACAO_AGENTES.md
  - docs/core-gateway/FRONTEIRAS_CORE_EXPERIENCE.md
  - docs/core-gateway/LGPD_DADOS_EXPERIENCE.md
  - docs/core-gateway/CONTRATOS_API_EXPERIENCE.md
  - docs/core-gateway/EVENTOS_CORE_EXPERIENCE.md
  - docs/core-gateway/ROADMAP_EXECUCAO_CORE_GATEWAY.md
  - docs/workspace/OWNERSHIP_ATIVO.md
  - docs/workspace/INTEGRACOES_ATIVAS.md
  - docs/workspace/HANDOFF_GLOBAL.md
- validacao executada:
  - revisao documental por leitura e `rg`
- riscos conhecidos:
  - contratos ainda sao rascunho e precisam ser validados antes de implementacao real
  - Core Gateway ainda nao implementado no backend
- proximo passo recomendado:
  - agente auxiliar deve atualizar documentacao do Experience e preparar estrutura/mocks sem consumir APIs reais ate Core Gateway existir

## Handoff
- data: 2026-05-27
- sessao: agente principal Core
- escopo concluido:
  - implementado skeleton backend do Core Gateway
  - adicionada feature flag `CORE_GATEWAY_ENABLED`
  - adicionadas credenciais HMAC por `.env`
  - plugada rota `GET /api/gateway/health`
  - reservadas rotas comerciais e portal cliente com retorno `501 PLANNED`
  - criada autenticacao HMAC backend-to-backend para o Experience
  - criada auditoria inicial do gateway em `SecurityEventLog`
- repositorio: C:\Fluxy
- arquivos alterados:
  - backend/.env.example
  - backend/src/app.js
  - backend/src/config/env.js
  - backend/src/modules/coreGateway/index.js
  - backend/src/modules/coreGateway/audit/coreGatewayAuditService.js
  - backend/src/modules/coreGateway/controllers/CoreGatewayController.js
  - backend/src/modules/coreGateway/middlewares/coreGatewayAuth.js
  - backend/src/modules/coreGateway/routes/index.js
  - backend/src/modules/coreGateway/services/coreGatewayService.js
  - backend/src/modules/coreGateway/validators/coreGatewayValidators.js
  - docs/core-gateway/CONTRATOS_API_EXPERIENCE.md
  - docs/core-gateway/ROADMAP_EXECUCAO_CORE_GATEWAY.md
- validacao executada:
  - `node -c backend/src/modules/coreGateway/services/coreGatewayService.js`
  - `node -c backend/src/modules/coreGateway/audit/coreGatewayAuditService.js`
  - `node -c backend/src/modules/coreGateway/middlewares/coreGatewayAuth.js`
  - `node -c backend/src/modules/coreGateway/controllers/CoreGatewayController.js`
  - `node -c backend/src/modules/coreGateway/routes/index.js`
  - `node -c backend/src/modules/coreGateway/index.js`
  - `node -c backend/src/config/env.js`
  - `node -c backend/src/app.js`
  - `node -e "require('./backend/src/modules/coreGateway'); console.log('coreGateway ok')"`
- riscos conhecidos:
  - endpoints reais ainda precisam de services/views oficiais antes de expor dados ao Experience
  - secrets do gateway devem ser configurados apenas no `.env` da EC2
  - Experience deve implementar assinatura HMAC exatamente conforme contrato
- proximo passo recomendado:
  - implementar `api/src/services/coreGatewayClient.js` no Experience usando HMAC e mocks ate as views oficiais do Core ficarem prontas

## Handoff
- data: 2026-05-27
- sessao: agente principal Core
- escopo concluido:
  - implementadas primeiras APIs comerciais reais no Core Gateway
  - `GET /api/gateway/comercial/empreendimentos`
  - `GET /api/gateway/comercial/unidades`
  - `GET /api/gateway/comercial/mapa-unidades`
  - `POST /api/gateway/comercial/simulacao`
  - mantidos endpoints de Portal Cliente como `501 PLANNED`
  - documentado payload atual e limites de dados enviados ao Experience
- repositorio: C:\Fluxy
- arquivos alterados:
  - backend/src/modules/coreGateway/controllers/CoreGatewayController.js
  - backend/src/modules/coreGateway/routes/index.js
  - backend/src/modules/coreGateway/services/coreGatewayCommercialService.js
  - docs/core-gateway/CONTRATOS_API_EXPERIENCE.md
  - docs/core-gateway/ROADMAP_EXECUCAO_CORE_GATEWAY.md
- validacao executada:
  - `node -c backend/src/modules/coreGateway/services/coreGatewayCommercialService.js`
  - `node -c backend/src/modules/coreGateway/controllers/CoreGatewayController.js`
  - `node -c backend/src/modules/coreGateway/routes/index.js`
  - `node -e "require('./backend/src/app'); console.log('app ok')"`
- riscos conhecidos:
  - payload comercial depende dos cadastros existentes em `empreendimentos` e `unidades_comerciais`
  - simulacao ainda e preliminar e nao deve ser apresentada como proposta oficial
- proximo passo recomendado:
  - Experience pode consumir as rotas comerciais reais quando `CORE_GATEWAY_ENABLED=true`; para Portal Cliente deve continuar usando mocks ate a proxima fase Core

## Handoff
- data: 2026-05-27
- sessao: agente principal Core
- escopo concluido:
  - criado catalogo tecnico de eventos Core -> Experience no backend
  - criado endpoint autenticado `GET /api/gateway/events/catalog`
  - documentado endpoint em `docs/core-gateway/EVENTOS_CORE_EXPERIENCE.md`
- repositorio: C:\Fluxy
- arquivos alterados:
  - backend/src/modules/coreGateway/events/coreGatewayEvents.js
  - backend/src/modules/coreGateway/controllers/CoreGatewayController.js
  - backend/src/modules/coreGateway/routes/index.js
  - docs/core-gateway/EVENTOS_CORE_EXPERIENCE.md
  - docs/core-gateway/ROADMAP_EXECUCAO_CORE_GATEWAY.md
- validacao executada:
  - `node -c backend/src/modules/coreGateway/events/coreGatewayEvents.js`
  - `node -c backend/src/modules/coreGateway/controllers/CoreGatewayController.js`
  - `node -c backend/src/modules/coreGateway/routes/index.js`
- riscos conhecidos:
  - endpoint atual e apenas catalogo; ainda nao existe publicacao/persistencia/event bus
- proximo passo recomendado:
  - implementar publicacao persistente de eventos somente quando houver consumidor Experience definido

## Handoff
- data: 2026-05-27
- sessao: agente principal Core
- escopo concluido:
  - registrado handoff especifico para calibracao do `coreGatewayClient.js` no Experience
  - documentado ajuste dos headers genericos `X-Gateway-*` para headers oficiais `X-Fluxy-Experience-*`
  - documentado que o Core nao usa `nonce` nesta versao
- repositorio: C:\Fluxy
- arquivos alterados:
  - docs/core-gateway/HANDOFF_EXPERIENCE_CLIENT_CALIBRACAO.md
  - docs/core-gateway/CONTRATOS_API_EXPERIENCE.md
  - docs/workspace/HANDOFF_GLOBAL.md
- validacao executada:
  - revisao documental por leitura
- riscos conhecidos:
  - o Experience precisa ajustar payload de assinatura caso esteja incluindo nonce no HMAC
- proximo passo recomendado:
  - enviar ao agente auxiliar o conteudo do handoff de calibracao ou o resumo dos headers oficiais

## Handoff
- data: 2026-05-27
- sessao: agente principal Core
- escopo concluido:
  - registrado retorno do agente auxiliar confirmando calibracao do `coreGatewayClient.js`
  - documentada ativacao controlada Core/Experience via `.env`
  - atualizado status da integracao ativa Core <-> Experience
- repositorio: C:\Fluxy
- arquivos alterados:
  - docs/core-gateway/HANDOFF_EXPERIENCE_CLIENT_CALIBRACAO.md
  - docs/workspace/INTEGRACOES_ATIVAS.md
  - docs/workspace/HANDOFF_GLOBAL.md
- validacao executada:
  - revisao documental por leitura
- riscos conhecidos:
  - Core Gateway segue desligado por padrao ate configurar `.env` e reiniciar backend
  - Portal Cliente continua em mock no Experience porque o Core ainda retorna `501 PLANNED`
- proximo passo recomendado:
  - configurar variaveis do Core Gateway na EC2 dev e executar teste `GET /api/admin/gateway/health` no Experience

## Handoff
- data: 2026-05-27
- sessao: agente principal Core
- escopo concluido:
  - preparado contrato arquitetural do Portal Cliente
  - definido que o Experience autentica o cliente e o Core autoriza dados oficiais
  - definidos headers adicionais planejados `X-Fluxy-Portal-Client-Id` e `X-Fluxy-Portal-Client-Document-Hash`
  - documentado que `/portal/*` permanece em mock no Experience ate implementacao Core
- repositorio: C:\Fluxy
- arquivos alterados:
  - docs/core-gateway/PORTAL_CLIENTE_AUTENTICACAO_AUTORIZACAO.md
  - docs/core-gateway/CONTRATOS_API_EXPERIENCE.md
  - docs/core-gateway/ROADMAP_EXECUCAO_CORE_GATEWAY.md
  - docs/workspace/HANDOFF_GLOBAL.md
- validacao executada:
  - revisao documental por leitura
- riscos conhecidos:
  - autorizacao do portal envolve dados sensiveis e deve ser implementada com testes negativos
  - hash de documento precisa ser normalizado igualmente nos dois sistemas
- proximo passo recomendado:
  - apos o agente auxiliar concluir comercial real, implementar services do Portal Cliente no Core Gateway com autorizacao por contrato

## Handoff
- data: 2026-05-27
- sessao: agente principal Core
- escopo concluido:
  - confirmado que a fonte oficial de cliente para Portal sera `Parceiro`
  - documentado uso obrigatorio de `Parceiro.ativo = true` e `Parceiro.cliente = true`
  - documentado vinculo por `ContratoComercial.parceiro_id` e `ContratoComercialComprador.parceiro_id`
  - registrado retorno do agente auxiliar sobre integracao comercial real no Experience
- repositorio: C:\Fluxy
- arquivos alterados:
  - docs/core-gateway/PORTAL_CLIENTE_AUTENTICACAO_AUTORIZACAO.md
  - docs/core-gateway/CONTRATOS_API_EXPERIENCE.md
  - docs/workspace/HANDOFF_GLOBAL.md
- validacao executada:
  - leitura dos models `Parceiro`, `ContratoComercial` e `ContratoComercialParcela`
  - busca por regras existentes de cliente no Core
- riscos conhecidos:
  - hash de CPF/CNPJ precisa usar a mesma normalizacao no Core e Experience
  - contratos com multiplos compradores exigem testes especificos
- proximo passo recomendado:
  - implementar helper de autorizacao do Portal Cliente no Core Gateway antes de qualquer endpoint financeiro/documental real

## Handoff
- data: 2026-05-27
- sessao: agente principal Core
- escopo concluido:
  - alinhado contrato comercial do Core Gateway com a normalizacao feita pelo Experience
  - `mapa-unidades` agora retorna `grupos`, `torres` e `unidades`
  - `simulacao` agora retorna objeto `restricoes` com `disponiveis=false` quando nao ha politica oficial configurada
  - documentado contrato atualizado em `docs/core-gateway/CONTRATOS_API_EXPERIENCE.md`
- repositorio: C:\Fluxy
- arquivos alterados:
  - backend/src/modules/coreGateway/controllers/CoreGatewayController.js
  - docs/core-gateway/CONTRATOS_API_EXPERIENCE.md
  - docs/workspace/HANDOFF_GLOBAL.md
- validacao executada:
  - `node -c backend/src/modules/coreGateway/controllers/CoreGatewayController.js`
  - `node -e "require('./backend/src/app'); console.log('app ok')"`
- riscos conhecidos:
  - `restricoes` ainda nao representa politica comercial oficial; Experience deve manter disclaimer e defaults proprios
- proximo passo recomendado:
  - apos commit/deploy, Experience pode remover parte da normalizacao defensiva ou mante-la como fallback

## Handoff
- data: 2026-05-27
- sessao: coordenacao multirrepositorio Core + Experience
- escopo concluido:
  - agente principal assumiu coordenacao dos dois projetos ate a borda de Portal/CRM
  - criado plano `docs/workspace/PLANO_CORE_EXPERIENCE_PRE_PORTAL_CRM.md`
  - criado plano espelho no Experience
  - atualizado deploy Experience para `experience.jrfluxy.com.br` na Vercel e API em EC2
  - criado contrato atual do Core Gateway no Experience
  - validada sintaxe Core Gateway e TypeScript do Experience
- repositorio: C:\Fluxy
- arquivos alterados:
  - docs/workspace/OWNERSHIP_ATIVO.md
  - docs/workspace/HANDOFF_GLOBAL.md
  - docs/workspace/PLANO_CORE_EXPERIENCE_PRE_PORTAL_CRM.md
  - ../Fluxy_Experience/docs/workspace/OWNERSHIP_ATIVO.md
  - ../Fluxy_Experience/docs/workspace/HANDOFF_GLOBAL.md
  - ../Fluxy_Experience/docs/workspace/PLANO_CORE_EXPERIENCE_PRE_PORTAL_CRM.md
  - ../Fluxy_Experience/docs/core-integration/CONTRATO_ATUAL_CORE_GATEWAY_20260527.md
  - ../Fluxy_Experience/docs/deploy/DEPLOY_EXPERIENCE_SUBDOMINIO.md
- validacao executada:
  - `node -c backend/src/modules/coreGateway/controllers/CoreGatewayController.js`
  - `node -c backend/src/modules/coreGateway/routes/index.js`
  - `node -e "require('./backend/src/app'); console.log('core ok')"`
  - `node --check api/src/services/coreGatewayClient.js`
  - `node --check api/src/controllers/GatewayComercialController.js`
  - `npx tsc --noEmit` em `C:\Fluxy_Experience`
- riscos conhecidos:
  - `C:\Fluxy_Experience` local ainda nao esta inicializado como repositorio Git nesta maquina
  - Portal Cliente e CRM ainda nao devem ser construidos sem prompt especifico
- proximo passo recomendado:
  - se o comercial real estiver aprovado visualmente, preparar prompt para o agente auxiliar iniciar Portal Cliente ou CRM conforme prioridade do usuario

## Handoff
- data: 2026-05-27
- sessao: coordenacao multirrepositorio Core + Experience
- escopo concluido:
  - registrada decisao de o agente principal assumir os dois projetos ate a borda de Portal Cliente e CRM
  - atualizada fase preparatoria em `PLANO_CORE_EXPERIENCE_PRE_PORTAL_CRM.md`
  - criado marco formal de handoff em `MARCO_HANDOFF_PORTAL_CRM.md`
  - registrado que o agente auxiliar nao deve iniciar Portal/CRM sem prompt especifico
- repositorio: C:\Fluxy
- arquivos alterados:
  - docs/workspace/PLANO_CORE_EXPERIENCE_PRE_PORTAL_CRM.md
  - docs/workspace/MARCO_HANDOFF_PORTAL_CRM.md
  - ../Fluxy_Experience/docs/workspace/PLANO_CORE_EXPERIENCE_PRE_PORTAL_CRM.md
  - ../Fluxy_Experience/docs/workspace/MARCO_HANDOFF_PORTAL_CRM.md
- validacao executada:
  - revisao documental por leitura
- riscos conhecidos:
  - `C:\Fluxy_Experience` local ainda nao esta inicializado como repositorio Git nesta maquina
  - Portal Cliente e CRM continuam bloqueados ate prompt especifico
- proximo passo recomendado:
  - validar visualmente a integracao comercial real e concluir checklist de ambiente Experience antes de entregar prompt ao agente auxiliar

## Handoff
- data: 2026-05-27
- sessao: fundacao Core Gateway Portal Cliente
- escopo concluido:
  - implementada fundacao de autorizacao do Portal Cliente no Core Gateway
  - criada rota `POST /api/gateway/portal/autorizacao`
  - criada validacao por `Parceiro.ativo`, `Parceiro.cliente`, hash de CPF/CNPJ e contratos autorizados
  - mantidas rotas operacionais do Portal Cliente como `501 PLANNED`
  - documentado que nenhum dado financeiro/documental foi liberado nesta etapa
- repositorio: C:\Fluxy
- arquivos alterados:
  - backend/src/modules/coreGateway/services/coreGatewayPortalAuthService.js
  - backend/src/modules/coreGateway/controllers/CoreGatewayController.js
  - backend/src/modules/coreGateway/routes/index.js
  - docs/core-gateway/CONTRATOS_API_EXPERIENCE.md
  - docs/core-gateway/PORTAL_CLIENTE_AUTENTICACAO_AUTORIZACAO.md
  - docs/core-gateway/ROADMAP_EXECUCAO_CORE_GATEWAY.md
  - docs/workspace/PLANO_CORE_EXPERIENCE_PRE_PORTAL_CRM.md
  - docs/workspace/MARCO_HANDOFF_PORTAL_CRM.md
  - docs/workspace/HANDOFF_GLOBAL.md
- validacao executada:
  - `node -c backend/src/modules/coreGateway/services/coreGatewayPortalAuthService.js`
  - `node -c backend/src/modules/coreGateway/controllers/CoreGatewayController.js`
  - `node -c backend/src/modules/coreGateway/routes/index.js`
  - `node -e "const s=require('./backend/src/modules/coreGateway/services/coreGatewayPortalAuthService'); console.log(s.normalizeDocument('123.456.789-09'), s.documentHash('123.456.789-09').length)"`
  - `node -e "require('./backend/src/app'); console.log('core gateway portal auth ok')"`
- riscos conhecidos:
  - Experience ainda precisa consumir esse endpoint no futuro, mas sem iniciar Portal real agora
  - `X-Fluxy-Portal-Client-Id` deve corresponder ao `Parceiro.id` oficial do Core
  - o Experience deve gerar o hash com CPF/CNPJ apenas digitos para bater com o Core
- proximo passo recomendado:
  - preparar checklist de ambiente Experience e, depois da validacao comercial, gerar prompt especifico para o agente auxiliar

## Handoff
- data: 2026-05-27
- sessao: checklist ambiente Experience
- escopo concluido:
  - criado checklist de ambiente para publicar Experience sem iniciar Portal/CRM
  - documentadas variaveis de Core, API Experience e Vercel
  - documentado teste de health do Core Gateway e da API Experience
  - documentado Go/No-Go antes de iniciar Portal Cliente e CRM
- repositorio: C:\Fluxy
- arquivos alterados:
  - docs/workspace/CHECKLIST_AMBIENTE_EXPERIENCE.md
  - docs/workspace/HANDOFF_GLOBAL.md
- validacao executada:
  - revisao documental por leitura
- riscos conhecidos:
  - Experience local ainda precisa de repositorio Git/projeto publicado para deploy real
  - API Experience ainda precisa ser provisionada na EC2
- proximo passo recomendado:
  - validar o checklist em ambiente real e, quando aprovado, emitir prompt de Portal Cliente/CRM ao agente auxiliar
