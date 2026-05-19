# Modulo Fiscal - Diagnostico Tecnico Fase 1

Data: 2026-05-19

Escopo: diagnostico do sistema atual para preparar o Modulo Fiscal. Nenhuma funcionalidade fiscal foi implementada nesta fase.

## Estado do Workspace

No momento do diagnostico, o workspace ja possuia alteracoes abertas de outras tarefas. Essas alteracoes nao foram revertidas nem limpas.

Arquivos/pastas observados como alterados ou nao rastreados antes do registro desta documentacao:

- `.claude/settings.local.json`
- `backend/.env.example`
- arquivos de conciliacao/financeiro em `backend/src` e `frontend/src`
- `.agents/`
- `legal-pages/`
- migration `backend/migrations/202605190004_financeiro_tarifas_bancarias.js`
- controller `backend/src/controllers/TarifaBancariaConfigController.js`

## Estrutura Atual

### Backend

O backend segue padrao centralizado:

- `backend/src/app.js`
- `backend/src/routes.js`
- `backend/src/config`
- `backend/src/controllers`
- `backend/src/services`
- `backend/src/models`
- `backend/src/middlewares`
- `backend/src/validators`
- `backend/src/database`
- `backend/migrations`

Contagem atual aproximada:

- 130 models Sequelize.
- 69 migrations.
- 73 controllers.
- 89 services.

O backend ainda nao possui um padrao amplo `backend/src/modules/*`. Existem services por dominio e alguns subdiretorios, mas rotas, controllers e models continuam majoritariamente centralizados.

### Frontend

O frontend usa React/Vite, com:

- `frontend/src/App.jsx`
- `frontend/src/layout/Layout.jsx`
- `frontend/src/pages`
- `frontend/src/modules`
- `frontend/src/services`
- `frontend/src/utils`

Ha cerca de 101 paginas JSX e 32 arquivos de services.

Alguns dominios novos ja usam `frontend/src/modules`, como compras e CRM. Para Fiscal, a estrutura modular no frontend e recomendada.

Decisao posterior ao diagnostico: o backend do Fiscal tambem deve nascer isolado em `backend/src/modules/fiscal`, sem modularizar o restante do sistema.

## Bootstrap, Rotas e Middlewares

### Backend App

`backend/src/app.js`:

- Carrega `env` por `backend/src/config/env.js`.
- Configura CORS dinamico por instalacao/runtime.
- Usa `helmet`.
- Usa `cookie-parser`.
- Usa `express.json` e `express.urlencoded`.
- Guarda `rawBody` apenas para `/api/crm/webhooks/`.
- Serve `/uploads` local com headers de seguranca.
- Monta rotas principais em `/api`.
- Possui handlers globais de erro e upload.
- Executa varias rotinas historicas de preparacao de banco em `prepararBanco()`.

Risco para Fiscal:

- O Fiscal nao deve adicionar DDL ad-hoc em `app.js`; deve usar migrations formais.
- Se webhook/SEFAZ exigir raw SOAP/XML, sera preciso configurar parsing por rota ou middleware especifico, sem afetar JSON global.

### Rotas

`backend/src/routes.js` concentra as rotas.

Rotas publicas antes de auth:

- login e MFA.
- instalacao publica.
- tema.
- cotacoes publicas por token.
- CRM webhooks Meta/Google.
- D4Sign webhook.
- BB payments webhook.

Depois:

- `router.use(auth)`.
- `router.use(csrfProtection)`.
- `router.use(requireMfaCompletion)`.
- middlewares de modulo habilitado por prefixo.

Modulos ja protegidos por `requireEnabledModule`:

- `SOLICITACOES`
- `COMPRAS`
- `FINANCEIRO`
- `CONTRATOS`
- `COMERCIAL`
- `PROVISOES`
- `RH_DP`
- `INTEGRACAO_SIENGE`
- `BOLETOS`
- `BIBLIOTECA_MODELOS`
- `COMUNICACAO_INTERNA`

Nao existe ainda modulo `FISCAL`.

## Feature Flags e Modulos

`backend/src/services/moduleConfigService.js` define o catalogo `MODULE_CATALOG` e a chave `MODULOS_HABILITADOS` em `configuracoes_sistema`.

Modulo Fiscal deve ser adicionado ali com:

- key: `FISCAL`
- label: `Fiscal`
- packageKey: `FISCAL`
- enabled: `false`
- locked: `false`
- sem dependencia obrigatoria de Financeiro/Compras no MVP.

Frontend usa `frontend/src/utils/acessoProduto.js` com `hasEnabledModule(user, moduleKey)` e o menu em `frontend/src/layout/Layout.jsx`.

## Permissoes

### Backend

Permissoes atuais ficam em `backend/src/services/authorizationService.js` e `backend/src/middlewares/permissions.js`.

O sistema combina:

- perfis (`SUPERADMIN`, `ADMINISTRADOR`, `ADMIN`, `FINANCEIRO`, etc.).
- capacidades de setor.
- configuracao em `configuracoes_sistema`.
- permissoes granulares de areas em `PERMISSOES_AREAS_USUARIOS`.

O padrao mais moderno e usar `userHasAreaPermission` com chaves como:

- `financeiro.titulos.visualizar`
- `compras.pedidos.visualizar`
- `crm.configuracoes.gerenciar`

Para Fiscal, criar novas chaves:

- `fiscal.view`
- `fiscal.sync.run`
- `fiscal.document.view`
- `fiscal.document.manifest`
- `fiscal.document.link`
- `fiscal.document.ignore`
- `fiscal.config.manage`
- `fiscal.logs.view`
- `fiscal.certificate.validate`

### Frontend

Permissoes do frontend ficam em `frontend/src/utils/acessoProduto.js` e rotas em `frontend/src/App.jsx`.

O menu lateral e montado em `frontend/src/layout/Layout.jsx`, dentro de `menuGroups`.

Para Fiscal:

- criar helper `canAccessFiscal`.
- criar wrappers de rota em `App.jsx`.
- adicionar grupo `Fiscal` no menu somente para usuario autorizado e modulo habilitado.

## Models e Tabelas Relevantes

### Empresas

- `EmpresaGrupo` -> `empresas_grupo`
- `RhEmpresaGrupo` tambem usa `empresas_grupo`, indicando transicao recente para autoridade compartilhada fora do RH.

Campos atuais de `empresas_grupo`:

- `codigo`
- `nome`
- `razao_social`
- `cnpj`
- `ativo`
- `criado_por`
- `atualizado_por`

Reaproveitamento:

- `fiscal_companies.empresa_id` pode apontar para `empresas_grupo.id`.
- Ainda faltam UF, inscricao estadual e ambiente fiscal no cadastro atual.

### Parceiros / Fornecedores / Credores

- `Parceiro` -> `parceiros`
- possui `cpf_cnpj`, `nome`, `tipo_pessoa`, flags `cliente`, `fornecedor`, `corretor`, `testemunha`, dados de contato e endereco.
- `FornecedorCompra` -> `fornecedores_compra`, usado no modulo de cotacoes/compras.

Reaproveitamento:

- Emitente da nota pode ser cruzado com `Parceiro.cpf_cnpj`.
- No inicio, sugerir vinculo ou cadastro pendente; nao sobrescrever dados automaticamente.

### Obras e Centro de Custo

- `Obra` -> tabela inferida `Obras`/`obras`, com campos `codigo`, `cidade`, `nome`, `ativo`, `classificacao`, `vgv`, `planilha_geral`, `margem_custo_esperada`.
- `Apropriacao` -> `apropriacoes`, vinculada a `obra_id`, com `codigo`, `descricao`, `valor_orcado`.

No FLUXY atual, "centro de custo" pratico e representado por obra + apropriacao.

### Solicitacoes

- `Solicitacao` -> `solicitacoes`
- `SolicitacaoPagamento` -> `solicitacao_pagamentos`
- `Historico` -> `historicos`
- `Anexo` -> `anexos`
- `SolicitacaoVisibilidadeUsuario` -> `solicitacao_visibilidade_usuario`

Vinculo fiscal futuro deve ser opcional por `solicitacao_id`.

### Compras, Cotacoes e Pedidos

- `SolicitacaoCompra` -> `solicitacao_compras`
- `SolicitacaoCompraItem` -> `solicitacao_compra_itens`
- `SolicitacaoCompraItemManual` -> `solicitacao_compra_itens_manuais`
- `SolicitacaoCompraFornecedor` -> `solicitacao_compra_fornecedores`
- `SolicitacaoCompraRespostaItem` -> `solicitacao_compra_resposta_itens`
- `SolicitacaoCompraLog` -> `solicitacao_compra_logs`
- `PedidoCompra` -> `pedido_compras`
- `PedidoCompraItem` -> `pedido_compra_itens`
- `PedidoCompraItemLog` -> `pedido_compra_item_logs`

Pedido possui `fornecedor_compra_id`, `obra_id`, `valor_total`, `status`, `origem`.

Reaproveitamento:

- Matching fiscal por CNPJ fornecedor, valor, data, obra e itens.
- Criar apenas `fiscal_document_links` sugeridos no inicio.

### Financeiro

Principais tabelas:

- `ContaBancaria` -> `contas_bancarias`
- `CategoriaFinanceira` -> `categorias_financeiras`
- `FormaPagamentoFinanceira` -> `financeiro_formas_pagamento`
- `TituloFinanceiro` -> `titulos_financeiros`
- `MovimentoFinanceiro` -> `movimentos_financeiros`
- `ConciliacaoBancaria` -> `conciliacoes_bancarias`
- `ConciliacaoBancariaImportacao` -> `conciliacao_bancaria_importacoes`
- `CaixaFinanceiroSessao` -> `financeiro_caixa_sessoes`
- `TransferenciaFinanceira` -> `transferencias_financeiras`
- pagamentos em massa em `payment_*`

Titulo financeiro tem `empresa_id`, `parceiro_id`, `obra_id`, `categoria_financeira_id`, `solicitacao_id`, valores, vencimento, baixa e status.

Reaproveitamento:

- Fiscal deve apenas preparar `financeiro_titulo_id` opcional em `fiscal_document_links`.
- Nao gerar titulo automaticamente no MVP.

### Anexos e Arquivos

- `Anexo` -> `anexos`
- `ContratoAnexo` -> `contrato_anexos`
- `Comprovante` -> inferido
- `ProvisaoFinanceiraAnexo` -> `provisao_financeira_anexos`
- `ArquivoModelo` -> `arquivos_modelos`

Arquivos fiscais devem ter storage proprio e nao devem ser misturados com `anexos`.

### Usuarios e Setores

- `User` -> `users`
- `Setor` -> `setores`
- `UsuarioSetor` -> `usuario_setores`
- `UsuarioObra` -> `usuarios_obras`
- `SetorPermissao` -> `setor_permissoes`

### Auditoria e Logs

Tabelas/padroes existentes:

- `SecurityEventLog` -> `security_event_logs`.
- `CrmAuditLog` -> `crm_audit_logs`.
- `SolicitacaoCompraLog` -> `solicitacao_compra_logs`.
- `PedidoCompraItemLog` -> `pedido_compra_item_logs`.
- `Historico` -> `historicos`.
- `LogExclusao` -> `logs_exclusao`.
- `IntegracaoSiengeLog` -> `sienge_integracao_logs`.

Para Fiscal:

- usar `security_event_logs` para eventos de seguranca/acesso.
- criar `fiscal_sync_logs` para logs operacionais SEFAZ.
- criar logs especificos para manifestacao, URL assinada, vinculos e validacao de certificado.

## Uploads e S3

### Upload atual

Uploads usam:

- `backend/src/config/uploadComprovantes.js`
- `backend/src/config/uploadOfx.js`
- `backend/src/config/createSecureUpload.js`
- `backend/src/middlewares/uploadFileSecurity.js`
- `backend/src/services/uploadBinaryValidationService.js`

O upload e feito em memoria via multer.

### S3 atual

`backend/src/services/s3.js`:

- usa `@aws-sdk/client-s3`.
- usa `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`.
- em desenvolvimento pode cair para fallback local `/uploads`.
- `uploadToS3(file, folder)` retorna URL S3.
- `getPresignedUrl(urlOrKey, expiresIn=300)` gera URL assinada.
- XML esta na lista de extensoes perigosas para forcar download/attachment.

### Presigned URLs

`AnexoController.presign`:

- exige arquivo registrado via `fileAccessService`.
- gera presigned URL apenas apos validar acesso.
- registra negacao em `SecurityEventLog`.

Recomendacao para Fiscal:

- criar `fiscalS3Service` separado.
- usar bucket fiscal privado separado.
- salvar keys, nao URLs publicas.
- criar endpoint especifico de URL assinada com auditoria de acesso.
- manter expiracao curta.
- nao usar `AWS_S3_BUCKET` geral para documentos fiscais.

## Variaveis de Ambiente

`backend/src/config/env.js` carrega `.env` do backend via dotenv.

Ja existem grupos para:

- DB.
- JWT/cookies/CSRF.
- uploads/rate limit/Redis/ClamAV.
- OPS.
- CRM automation.
- SIENGE.
- boleto Caixa.
- pagamentos Banco do Brasil.

Nao existem variaveis fiscais ainda.

Recomendado adicionar em `env.js` apenas apos validacao do plano:

- `FISCAL_MODULE_ENABLED`
- `FISCAL_SEFAZ_ENABLED`
- `FISCAL_ENV`
- `FISCAL_S3_BUCKET`
- `FISCAL_S3_REGION`
- `FISCAL_S3_PREFIX`
- `FISCAL_S3_PRESIGNED_EXPIRES_SECONDS`
- `FISCAL_CERT_STORAGE`
- `FISCAL_CERT_PATH`
- `FISCAL_CERT_PASSWORD_ENCRYPTED`
- `FISCAL_SEFAZ_AMBIENTE`
- `FISCAL_SEFAZ_UF`
- `FISCAL_SEFAZ_SYNC_INTERVAL_MINUTES`
- `FISCAL_SEFAZ_MAX_DOCS_PER_RUN`
- `FISCAL_CRYPTO_KEY`

## Migrations

Runner:

- `backend/src/database/runMigrations.js`.
- migrations ficam em `backend/migrations`.
- tabela de controle: `schema_migrations`.
- executa somente `up`.
- injeta `{ DataTypes, queryInterface, sequelize }`.
- possui protecao para `addColumn` idempotente.

Observacao importante:

- O runner atual nao executa `down`.
- Portanto, "rollback" precisa ser planejado como migration corretiva ou scripts manuais seguros.
- Fiscal deve usar migrations novas e isoladas, sem alterar tabelas atuais no primeiro bloco.

## Erros e Logs

Padrao atual:

- Controllers retornam JSON `{ error: 'mensagem' }`.
- Erros globais nao tratados caem em `console.error('Erro nao tratado na API:', err)`.
- Muitos services criam erro manual com `statusCode`.
- `SecurityEventLog` registra negacoes, rate limit, acesso a arquivos, login, eventos financeiros, etc.

Recomendacao Fiscal:

- criar helpers `createFiscalError` e `respondFiscalError`.
- mascarar CNPJ/chave de acesso em console.
- nunca logar XML completo, certificado ou senha.
- guardar raw SEFAZ apenas no S3 fiscal privado quando configurado.

## Dependencias Tecnicas

Backend possui:

- AWS SDK S3.
- Express.
- Sequelize.
- MySQL.
- multer.
- pdf-lib/pdfkit/puppeteer.
- xlsx.
- Redis.

Nao foi identificada dependencia especifica para:

- SOAP SEFAZ.
- assinatura XML.
- parser XML robusto.
- certificado A1/PKCS#12.
- DANFE/NFe.
- zip/gzip fiscal.

Essas dependencias precisam ser avaliadas antes da Fase 5. Para NFeDistribuicaoDFe, provavelmente sera necessario adicionar bibliotecas de XML/SOAP/assinatura/certificado ou implementar cliente HTTP SOAP com TLS A1 cuidadosamente.

## O Que Pode Ser Reaproveitado

- `ConfiguracaoSistema` para feature flags e configuracoes leves.
- `moduleConfigService` para habilitar/desabilitar modulo Fiscal.
- `authorizationService` e `PERMISSOES_AREAS_USUARIOS` para permissoes fiscais granulares.
- `SecurityEventLog` para auditoria de acesso e eventos sensiveis.
- `EmpresaGrupo` para vincular CNPJs monitorados.
- `Parceiro` para fornecedores/emitentes.
- `Obra` e `Apropriacao` para centro de custo.
- `PedidoCompra` e `PedidoCompraItem` para matching.
- `TituloFinanceiro` para vinculo futuro, sem geracao automatica.
- `createSecureUpload`/validadores binarios como referencia, nao como storage final fiscal.
- `getPresignedUrl` como referencia, mas com service fiscal separado.
- Padrao frontend de rotas protegidas e menu por permissao.

## O Que Precisa Ser Criado

- Modulo `FISCAL` em catalogo de modulos.
- Permissoes fiscais no backend e frontend.
- Models fiscais e migrations isoladas.
- Service S3 fiscal com bucket proprio.
- Service de certificado A1 seguro.
- Service de criptografia para senha do certificado.
- Services SEFAZ, processamento DFe, manifestacao e matching.
- Jobs com lock, retry e backoff.
- Rotas `/api/fiscal/*`.
- Paginas frontend fiscais.
- Auditoria fiscal especifica.
- Testes unitarios/integracao/seguranca.

## O Que Nao Deve Ser Alterado Agora

- Fluxo atual de solicitacoes.
- Status de solicitacoes, compras, pedidos, financeiro.
- Geracao/baixa de titulos.
- Conciliacao bancaria.
- Upload geral de anexos.
- Bucket S3 geral.
- Rotas publicas existentes.
- Regras de pedidos/cotacoes.
- Rotinas de producao/PM2.

## Riscos de Quebra

- Adicionar parser XML global pode quebrar APIs JSON se feito em `app.js`.
- Misturar XML fiscal no bucket geral pode expor documentos sensiveis.
- Gerar titulo financeiro automaticamente pode duplicar obrigacoes.
- Rodar scheduler SEFAZ sem lock pode causar consumo indevido.
- Atualizar `ult_nsu` antes de persistir lote pode perder documentos.
- Salvar certificado/senha de forma incorreta cria risco critico.
- Alterar `moduleConfigService` sem preservar defaults pode ocultar modulos existentes.
- Inserir novas rotas antes/depois de auth de forma errada pode expor documentos.
- Incluir XML completo em logs de console pode vazar dados fiscais.

## Ordem Recomendada de Implementacao

1. Validacao humana deste diagnostico.
2. Criar estrutura `backend/src/modules/fiscal` com `controllers`, `services`, `jobs`, `models`, `validators`, `routes` e `constants`.
3. Registrar `fiscalRoutes` no roteador central atual com `router.use('/fiscal', fiscalRoutes)`.
4. Criar feature flag `FISCAL` e permissoes fiscais, sem menu funcional sensivel ainda.
5. Criar migrations fiscais isoladas.
6. Criar `fiscalS3Service` e configurar bucket DEV.
7. Criar `fiscalCertificateService` com criptografia/validacao local.
8. Criar tela/rotas de configuracoes fiscais.
9. Criar sync manual mockado/controlado.
10. Integrar SEFAZ em homologacao/DEV.
11. Criar Caixa de Entrada Fiscal.
12. Criar manifestacao.
13. Criar matching sugerido.
14. Criar vinculo manual.
15. Criar divergencias.
16. Planejar lote contabil.
17. Planejar rollout em producao.

## Pontos que Exigem Validacao Humana

- CNPJs monitorados e empresas do grupo que entram no Fiscal.
- UF principal para SEFAZ.
- Ambiente inicial: homologacao ou producao somente consulta.
- Onde guardar certificado A1 no DEV.
- Como criptografar senha do certificado: chave `.env`, KMS ou Secrets Manager.
- Bucket fiscal: nomes definitivos DEV/PROD.
- IAM: access key temporaria ou role EC2.
- Biblioteca/estrategia para NFeDistribuicaoDFe.
- Politica de manifestacao automatica ou apenas manual.
- Prazo de retencao dos XML/PDF/DANFE.
- Quem pode acessar XML fiscal no MVP.
- Decisao tomada: Fiscal entra em `backend/src/modules/fiscal` desde o inicio, mantendo apenas o registro central em `src/routes.js`.

## Conclusao da Fase 1

O FLUXY tem base boa para receber o Modulo Fiscal: autenticacao, feature flags, permissoes, auditoria, S3, configuracoes, empresas do grupo, parceiros, obras, compras/pedidos e financeiro ja existem.

A principal lacuna e tecnica/fiscal: ainda nao ha suporte a SEFAZ, XML fiscal, certificado A1, storage fiscal segregado, jobs com NSU e modelos fiscais. A implementacao deve nascer isolada, sem tocar fluxos atuais, e so avancar para integracoes depois da Caixa de Entrada Fiscal estar validada em DEV.
