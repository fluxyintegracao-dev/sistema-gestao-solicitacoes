# Arquitetura - Visao Geral

## Topologia

- frontend React/Vite consumindo API REST
- backend Node.js/Express concentrando validacao, autorizacao e regras
- MySQL como persistencia principal
- S3 para anexos e comprovantes com leitura por URL assinada

## Principios Arquiteturais

- backend como fonte de verdade
- single-tenant por instalacao
- multiempresa dentro da instalacao
- validacao critica no servidor
- migrations controladas
- configuracao por `.env` e por runtime config
- modulos habilitaveis e desabilitaveis por configuracao central, sem acoplar um fluxo ao outro
- core operacional separado de camada experimental/lab
- dado operacional critico nao deve depender de fallback, inferencia ou simulacao
- relatorios devem demonstrar inconsistencia de dados em vez de preencher lacunas por suposicao

## Posicionamento Arquitetural Atual

O FLUXY entrou na fase de consolidacao operacional e institucionalizacao.

O repositorio atual deve ser tratado como sistema institucional single-tenant por instalacao, com suporte a multiempresa, holding, intercompany, obras e centros de custo dentro da mesma instalacao.

O repositorio atual nao deve ser convertido em SaaS multi-tenant com base compartilhada. Caso o modelo multi-tenant seja retomado no futuro, ele deve nascer em nova geracao arquitetural, baseada nas regras estabilizadas e na experiencia operacional acumulada.

O documento oficial desta mudanca e `docs/REPOSICIONAMENTO_ESTRATEGICO_FLUXY.md`.

## Camadas

### Frontend

Responsavel por:

- navegacao
- experiencia visual
- formulacao e exibicao de dados
- chamadas a API

Nao e autoridade para:

- permissoes
- escopo de obra
- valores financeiros finais
- status criticos

### Backend

Responsavel por:

- autenticacao e autorizacao
- validacao de input
- regras de negocio
- auditoria e logs
- persistencia
- emissao de PDF
- upload controlado

### Banco de dados

Responsavel por:

- persistir dados operacionais
- manter historico e rastreabilidade
- suportar consultas de relatorio, dashboard e conciliacao

## Inicializacao da Aplicacao

`backend/server.js` executa:

1. validacao de ambiente
2. migrations pendentes
3. carga das configuracoes de runtime
4. subida da API

Nao existe dependencia de `sync({ alter: true })`.

A migration historica `202603280001_legacy_schema_bootstrap.js` preserva compatibilidade com bancos antigos, mas nao executa `sequelize.sync()` por padrao. Qualquer bootstrap legado com `sync()` exige a variavel explicita `ALLOW_LEGACY_SCHEMA_BOOTSTRAP_SYNC=true` e deve ser tratado como operacao excepcional e controlada.

## Modularidade de Produto

O FLUXY usa configuracao central de modulos habilitados para controlar menu, rotas e disponibilidade funcional por instalacao.

Principios para novos modulos:

- cada modulo deve possuir chave propria de habilitacao
- backend deve proteger rotas do modulo
- frontend deve ocultar menu e telas quando o modulo estiver desabilitado
- integracoes opcionais, como boleto bancario, devem ficar em modulo ou submodulo separado quando houver dependencia de homologacao externa

## Core Operacional e Lab

### Core Operacional

Inclui solicitacoes, compras, financeiro, obras, contratos, apropriacoes, RH/DP, SST, fiscal operacional, integracoes criticas, seguranca, auditoria e permissoes.

Mudancas no core exigem:

- regra de negocio clara;
- validacao no backend;
- revisao de permissoes;
- migration controlada quando houver banco;
- teste/build aplicavel;
- atualizacao documental;
- orientacao de deploy e rollback quando houver risco.

### Camada Experimental / Lab

Inclui IA, Fluxy Experience, WebXR, 3D, automacoes avancadas e prototipos de integracoes.

Essa camada deve ser desacoplada do core, preferencialmente por modulo, feature flag ou configuracao, sem comprometer rotinas operacionais criticas.
