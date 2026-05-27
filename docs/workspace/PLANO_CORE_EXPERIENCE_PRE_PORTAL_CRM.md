# Plano Core + Experience Antes De Portal/CRM

## Decisao

O agente principal assume a coordenacao dos dois projetos ate a borda de construcao funcional do Portal Cliente e CRM.

Nesta etapa o objetivo e estabilizar:

- contrato Core Gateway;
- comercial real no Experience;
- deploy futuro em `experience.jrfluxy.com.br`;
- banco Experience separado;
- API Experience em EC2;
- frontend Experience em Vercel;
- documentacao de handoff.

## Ownership Operacional

O agente principal passa a conduzir os dois projetos nesta etapa preparatoria:

- FLUXY Core: contratos oficiais, Core Gateway, autorizacao, seguranca, deploy backend e documentacao institucional.
- FLUXY Experience: validacao da integracao comercial, plano de deploy, variaveis, fallback, contrato de consumo e preparacao de ambiente.

O agente auxiliar nao deve iniciar construcao funcional de Portal Cliente ou CRM ate receber prompt especifico do agente principal.

## Fora Do Escopo Desta Etapa

Nao construir ainda:

- autenticacao completa do cliente;
- telas reais do Portal Cliente;
- CRM operacional completo;
- funil comercial real;
- oficializacao de venda;
- proposta oficial;
- contrato oficial;
- financeiro oficial pelo Experience.

Quando chegar nessa etapa, sera gerado prompt especifico para o agente auxiliar.

## Arquitetura Alvo

```text
experience.jrfluxy.com.br
        ->
Frontend Experience na Vercel
        ->
API Experience na EC2
        ->
Banco Experience separado no RDS
        ->
Core Gateway do FLUXY Core por HMAC
```

## Regras

- Experience nunca acessa banco do Core.
- Core continua fonte da verdade.
- Banco do Experience deve ser separado do banco Core, ainda que no mesmo RDS.
- Frontend nao recebe chaves do Core.
- API Experience guarda segredo HMAC em `.env`.
- Portal Cliente continua em mock ate o Core implementar autorizacao oficial.

## Core

Manter e validar:

- `GET /api/gateway/health`;
- `GET /api/gateway/comercial/empreendimentos`;
- `GET /api/gateway/comercial/unidades`;
- `GET /api/gateway/comercial/mapa-unidades`;
- `POST /api/gateway/comercial/simulacao`;
- `GET /api/gateway/events/catalog`.

Portal permanece:

```text
POST /api/gateway/portal/autorizacao = fundacao de seguranca
demais rotas /portal/* = 501 PLANNED
```

## Fases Da Coordenacao Atual

### Fase A - Contrato e seguranca

- manter HMAC oficial Core -> Experience;
- manter segredo apenas no backend Experience;
- documentar headers, payloads e endpoints;
- validar que o frontend nao possui chaves sensiveis.

### Fase B - Comercial real

- validar empreendimentos;
- validar unidades;
- validar mapa de unidades;
- validar simulacao nao oficial;
- manter disclaimer e fallback local/mock.

### Fase C - Deploy Experience

- preparar `experience.jrfluxy.com.br` na Vercel;
- preparar API Experience em EC2;
- preparar banco separado no RDS;
- documentar variaveis e CORS.

### Fase D - Marco De Handoff

- congelar contrato Core Gateway atual;
- registrar o que esta pronto;
- registrar pendencias;
- entregar prompt fechado para o agente auxiliar iniciar Portal Cliente e CRM.

## Experience

Manter e validar:

- client HMAC server-side;
- proxy comercial local;
- fallback mock/local;
- mapa de unidades;
- listagem de empreendimentos/unidades;
- simulador com disclaimer nao oficial.

## Dominio Temporario

Subdominio escolhido:

```text
experience.jrfluxy.com.br
```

Depois sera possivel migrar para dominio proprio da construtora sem hardcode.

## Gatilho Para Passar Ao Agente Auxiliar

Quando os itens abaixo estiverem estaveis:

- comercial real validado;
- deploy documentado;
- banco Experience definido;
- API Experience pronta para EC2;
- Vercel preparada;
- contratos de portal documentados;

o agente principal deve entregar prompt para o agente auxiliar iniciar:

1. Portal Cliente;
2. CRM comercial.

Antes desse gatilho, qualquer trabalho do agente auxiliar deve ficar limitado a ajustes, testes, documentacao ou preparacao sem criar regra operacional nova.
