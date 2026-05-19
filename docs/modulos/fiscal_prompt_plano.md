# Modulo Fiscal - Prompt Mestre e Plano de Execucao

Data de registro: 2026-05-19

Este documento registra o prompt mestre recebido para abertura do Modulo Fiscal do FLUXY e consolida o plano de execucao aprovado para orientar continuidade entre agentes.

## Objetivo Geral

Construir um Modulo Fiscal profissional, isolado e seguro para o FLUXY, capaz de consultar documentos fiscais emitidos contra os CNPJs das empresas do grupo, inicialmente via SEFAZ NFeDistribuicaoDFe, certificado digital A1 e controle de NSU.

O primeiro objetivo operacional e:

- Consultar automaticamente DF-e emitidos contra CNPJ monitorado.
- Salvar resumo, XML completo quando disponivel, eventos e logs.
- Criar Caixa de Entrada Fiscal.
- Permitir analise, manifestacao e vinculo futuro com pedidos, solicitacoes, obras, centros de custo e financeiro.
- Armazenar XML, PDF e DANFE em bucket S3 privado especifico do Fiscal.
- Nao alterar fluxo atual dos usuarios em producao.
- Nao gerar lancamentos financeiros automaticamente na primeira fase.
- Nao substituir processos atuais ate validacao completa em DEV/staging.

## Regras Absolutas de Seguranca

- Nao modificar producao diretamente.
- Nao rodar migrations em producao sem autorizacao.
- Nao alterar telas usadas atualmente por usuarios.
- Nao alterar status existentes de Solicitacoes, Compras, Pedidos ou Financeiro.
- Nao criar dependencia obrigatoria do Fiscal nos modulos atuais.
- Nao expor certificado A1 no frontend.
- Nao salvar senha do certificado em texto puro.
- Nao deixar XML, PDF ou DANFE em bucket publico.
- Nao usar URLs publicas permanentes.
- Nao registrar dados sensiveis em logs abertos.
- Todo Fiscal deve nascer atras de feature flag/modulo habilitavel.
- Todo vinculo com modulos atuais deve ser opcional no inicio.
- Toda migration deve ser segura e, quando possivel, reversivel.
- Todo processamento automatico deve ter logs, retry controlado, idempotencia e lock contra execucao duplicada.

## Fases Planejadas

### Fase 1 - Diagnostico

Mapear o sistema atual sem implementar funcionalidade fiscal:

- Models Sequelize, migrations, rotas, controllers, services e paginas.
- Tabelas de empresas, obras, centros de custo/apropriacoes, plano financeiro, parceiros, solicitacoes, compras, cotacoes, pedidos, financeiro, anexos, usuarios, setores, permissoes, modulos e auditoria.
- Uploads, S3, presigned URLs, env, PM2/deploy, migrations e logging.
- Reaproveitamento, lacunas, riscos e ordem recomendada.

Resultado registrado em `docs/modulos/fiscal_diagnostico_fase1.md`.

### Fase 2 - Arquitetura

Criar Fiscal como modulo isolado. O backend atual ainda nao usa `src/modules` de forma ampla, mas a decisao aprovada e iniciar o Fiscal em `backend/src/modules/fiscal`, sem modularizar o restante do sistema.

Estrutura-alvo sugerida:

- `backend/src/modules/fiscal/controllers`
- `backend/src/modules/fiscal/services`
- `backend/src/modules/fiscal/services/sefaz`
- `backend/src/modules/fiscal/services/storage`
- `backend/src/modules/fiscal/services/matching`
- `backend/src/modules/fiscal/jobs`
- `backend/src/modules/fiscal/routes`
- `backend/src/modules/fiscal/validators`
- `backend/src/modules/fiscal/utils`
- `backend/src/modules/fiscal/constants`

Frontend sugerido:

- `frontend/src/pages/Fiscal/DashboardFiscal.jsx`
- `frontend/src/pages/Fiscal/CaixaEntradaDFe.jsx`
- `frontend/src/pages/Fiscal/DetalheDocumentoFiscal.jsx`
- `frontend/src/pages/Fiscal/ConfiguracoesFiscais.jsx`
- `frontend/src/pages/Fiscal/LogsSincronizacao.jsx`
- `frontend/src/services/fiscalApi.js`
- `frontend/src/components/fiscal`

Menu inicial:

- Fiscal
- Painel Fiscal
- Caixa de Entrada SEFAZ
- Documentos Fiscais
- Divergencias
- Exportacao Contabil
- Configuracoes
- Logs de Sincronizacao

### Fase 3 - Banco de Dados

Criar novas tabelas fiscais, sem alterar tabelas atuais inicialmente:

- `fiscal_companies`
- `fiscal_certificates`
- `fiscal_dfe_sync_states`
- `fiscal_dfe_documents`
- `fiscal_dfe_events`
- `fiscal_sync_logs`
- `fiscal_document_links`
- `fiscal_divergences`
- `fiscal_accounting_batches`
- `fiscal_accounting_batch_items`

Todos os vinculos com solicitacao, compra, pedido, financeiro, obra, apropriacao/centro de custo e parceiro devem nascer opcionais.

### Fase 4 - S3 Privado Fiscal

Criar bucket privado separado por ambiente:

- `fluxy-fiscal-dev-ACCOUNT_ID`
- `fluxy-fiscal-prod-ACCOUNT_ID`

Regras:

- Block Public Access ativo.
- Versioning ativo.
- Encryption at rest.
- Presigned URLs curtas.
- Frontend nunca acessa objetos sem autorizacao.
- IAM separado para DEV e PROD.

### Fase 5 - Services Backend

Services previstos:

- `fiscalS3Service`
- `fiscalCertificateService`
- `sefazDfeDistributionService`
- `fiscalDfeProcessorService`
- `fiscalManifestationService`
- `fiscalMatchingService`
- `fiscalAccountingExportService`

### Fase 6 - Jobs

Jobs previstos:

- `syncDFeJob`
- `manifestationPendingJob`
- `fiscalMatchingJob`

No MVP, o sync deve iniciar manualmente por endpoint admin antes de ativar scheduler.

### Fase 7 - Rotas Backend

Rotas previstas:

- `GET /api/fiscal/dashboard`
- `GET /api/fiscal/documents`
- `GET /api/fiscal/documents/:id`
- `GET /api/fiscal/documents/:id/xml-url`
- `GET /api/fiscal/documents/:id/pdf-url`
- `POST /api/fiscal/sync/run-manual`
- `GET /api/fiscal/sync/logs`
- `POST /api/fiscal/documents/:id/manifest`
- `POST /api/fiscal/documents/:id/link`
- `POST /api/fiscal/documents/:id/ignore`
- `GET /api/fiscal/config/companies`
- `POST /api/fiscal/config/companies`
- `PATCH /api/fiscal/config/companies/:id`
- `POST /api/fiscal/config/certificates/validate`

### Fase 8 - Frontend

Telas iniciais:

- Painel Fiscal.
- Caixa de Entrada SEFAZ.
- Detalhe Documento Fiscal.
- Configuracoes Fiscais.
- Logs de Sincronizacao.

### Fase 9 - Integracoes Opcionais

Preparar vinculos sem alterar comportamento atual:

- Parceiros/fornecedores por CNPJ.
- Pedidos por fornecedor, valor, data e itens.
- Recebimento apenas como alerta futuro.
- Financeiro apenas como vinculo futuro, sem gerar titulo automatico.
- Obras e centro de custo por pedido, quando houver.

### Fase 10 - Seguranca

Permissoes previstas:

- `fiscal.view`
- `fiscal.sync.run`
- `fiscal.document.view`
- `fiscal.document.manifest`
- `fiscal.document.link`
- `fiscal.document.ignore`
- `fiscal.config.manage`
- `fiscal.logs.view`
- `fiscal.certificate.validate`

Auditar acesso a XML, geracao de URL, manifestacao, vinculos, documentos ignorados, configuracoes e validacao de certificado.

### Fase 11 - Testes

Cobrir:

- Parser XML.
- Geracao de chave S3.
- Deduplicacao por chave de acesso.
- Matching com pedido.
- Criptografia de senha do certificado.
- Upload/leitura S3 com presigned URL.
- Criacao de documentos, eventos e logs.
- Permissoes e seguranca.

### Fase 12 - Rollout

Ordem segura:

1. Bucket S3 Fiscal DEV.
2. IAM DEV.
3. `.env` DEV.
4. Migrations fiscais.
5. Services S3/certificado.
6. Configuracoes fiscais.
7. Sync manual em DEV.
8. Caixa de entrada fiscal.
9. Validacao com CNPJ real em DEV.
10. Matching sugerido.
11. Vinculo manual.
12. Divergencias.
13. Lote contabil.
14. Planejamento de producao.

## Criterio de Sucesso da Primeira Entrega

- Modulo aparece apenas para usuarios autorizados.
- Bucket fiscal privado configurado.
- Certificado A1 validado com seguranca.
- Sync manual seguro executado.
- Documentos fiscais encontrados e persistidos.
- Resumo/XML salvo no banco e S3.
- Duplicidade evitada.
- Caixa de Entrada Fiscal funcional.
- Logs de sincronizacao registrados.
- Nenhum modulo atual quebrado.
- Usuario comum nao percebe mudanca.

## Decisao Inicial

A execucao deve continuar somente apos validacao humana do diagnostico da Fase 1, especialmente nos pontos de certificado A1, bucket S3 fiscal e estrategia de criptografia.

## Decisao Arquitetural Aprovada

Decisao registrada em 2026-05-19:

O Modulo Fiscal deve nascer em estrutura propria:

```text
backend/src/modules/fiscal/
  controllers/
  services/
  jobs/
  models/
  validators/
  routes/
  constants/
```

O restante do sistema nao deve ser modularizado agora.

O backend continuara respeitando o padrao centralizado atual em `backend/src/routes.js`, registrando apenas:

```js
router.use('/fiscal', fiscalRoutes);
```

Assim o Fiscal nasce isolado e preparado para evolucao, mas sem forcar uma refatoracao estrutural ampla no ERP.
