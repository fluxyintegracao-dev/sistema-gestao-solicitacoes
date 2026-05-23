# Arquitetura - Visao Geral

## Topologia

- frontend React/Vite consumindo API REST
- backend Node.js/Express concentrando validacao, autorizacao e regras
- MySQL como persistencia principal
- S3 para anexos e comprovantes com leitura por URL assinada

## Principios Arquiteturais

- backend como fonte de verdade
- single-tenant por instalacao
- validacao critica no servidor
- migrations controladas
- configuracao por `.env` e por runtime config
- modulos habilitaveis e desabilitaveis por configuracao central, sem acoplar um fluxo ao outro

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
