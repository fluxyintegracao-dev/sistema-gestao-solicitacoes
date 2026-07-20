# Pagamentos BB - Motor Interno

Data inicial: 2026-05-07

Este documento descreve o modulo interno de pagamentos bancarios do FLUXY V2, preparado para futura integracao com Banco do Brasil. A primeira etapa tem foco em PIX por chave e provider mockado. Nao ha chamada real para API BB nesta fase.

## Objetivo

Criar um motor de pagamentos separado do titulo financeiro.

O titulo financeiro continua sendo a origem contabil/financeira. O pagamento bancario passa a ser controlado por entidades proprias:

- `payment_providers`
- `payment_accounts`
- `payment_beneficiaries`
- `payment_beneficiary_audit_logs`
- `payment_intents`
- `payment_batches`
- `payment_batch_items`
- `payment_approvals`
- `payment_transactions`
- `payment_events`
- `payment_reconciliations`
- `payment_jobs`

## Regra central

Nunca baixar um titulo no momento do envio do lote.

A baixa e semiautomatica:

1. lote e enviado ao provider mockado;
2. provider confirma/rejeita os itens;
3. intents confirmadas ficam em `AGUARDANDO_CONFIRMACAO_BAIXA`;
4. usuario financeiro com permissao especifica confirma a baixa;
5. o sistema cria o movimento financeiro e vincula a conciliacao de pagamento.

## Fases implementadas nesta entrega

### Fase 1 - Base estrutural

- migration `202605070001_payments_engine_base.js`;
- seed do provider `BB` em ambiente `HOMOLOGACAO` com `config_ref = BB_MOCK_HOMOLOGACAO`;
- models Sequelize de pagamentos;
- relacionamentos principais em `backend/src/models/index.js`;
- permissoes de pagamentos/favorecidos em `backend/src/constants/moduloPermissoes.js`;
- helpers de autorizacao especificos em `backend/src/services/authorizationService.js`.

### Fase 2 - Services e rotas

- cadastro de favorecido bancario com auditoria;
- elegibilidade de titulo a pagar;
- criacao de lote a partir de titulos;
- consulta de providers e contas pagadoras;
- rotas REST protegidas por permissao especifica;
- detalhe de lote com itens, aprovacoes e tentativas tecnicas.

### Fase 3 - Execucao mockada e baixa semiautomatica

- uma aprovacao por usuario diferente do criador do lote;
- bloqueio para o criador aprovar o proprio lote;
- MFA step-up para aprovar e enviar;
- job persistente em `payment_jobs`;
- provider Banco do Brasil em modo `MOCK_HOMOLOGACAO`;
- adapter Banco do Brasil centralizado em `paymentProviderBancoDoBrasil`, com modo real explicitamente bloqueado ate confirmacao OAuth2/mTLS;
- snapshots tecnicos do provider com referencias de segredo mascaradas;
- simulacao de confirmacao/rejeicao bancaria;
- cancelamento auditavel de lote antes do envio ao banco, liberando as intents para nova tentativa;
- reprocessamento auditavel de lotes com falha/rejeicao elegivel, com MFA e bloqueio de job duplicado;
- baixa manual confirmada pelo financeiro apos confirmacao bancaria;
- criacao de `movimentos_financeiros` somente no clique de confirmar baixa;
- vinculo em `payment_reconciliations`.

### Fase 4 - Interface operacional

- menu Financeiro > Pagamentos em Massa;
- listagem de titulos elegiveis;
- criacao de lote;
- revisao de lote com status por item;
- aprovacao, rejeicao, envio mockado e simulacao de retorno;
- cancelamento de lote nos status anteriores ao envio bancario;
- botao de reprocessar para lotes com falha/rejeicao elegivel;
- tela de pagamentos aguardando baixa;
- bloco "Pagamentos bancarios" no detalhe do titulo;
- secao "Dados para pagamento do credor" na criacao de titulo a pagar;
- cadastro simples de favorecidos PIX em Cadastros Financeiros.

### Complemento - Chaves PIX no cadastro de pessoas

O cadastro mestre de pessoas/parceiros passa a aceitar chaves PIX opcionais para apoiar o preparo financeiro:

- primeira chave PIX fixa;
- segunda chave PIX fixa;
- terceira chave PIX variavel.

Cada chave possui tipo (`CPF`, `CNPJ`, `EMAIL`, `TELEFONE` ou `ALEATORIA`) e valor. Os mesmos campos tambem aparecem no modal de cadastro de credor da tela de Nova Solicitacao.

Esses dados servem como fonte cadastral inicial. Eles nao substituem o cadastro de favorecido bancario nem o snapshot imutavel salvo em `payment_intents` no momento da criacao do lote. Alteracoes futuras no parceiro nao devem alterar retroativamente lotes aprovados, enviados ou confirmados.

### Complemento - UX de credor, favorecido e conta pagadora

Na criacao de nova conta, a selecao do credor foi separada em:

- consulta por CPF/CNPJ;
- busca por nome com lista de credores/clientes para selecao.

Quando o usuario seleciona pelo nome, o CPF/CNPJ do cadastro e preenchido automaticamente na consulta. Isso evita duplicidade visual entre "buscar credor" e "credor" e reduz erro de selecao.

No bloco "Preparar PIX", o campo "Favorecido bancario vinculado" representa o cadastro bancario rastreado que sera usado no lote. O usuario tambem pode marcar "usar o mesmo credor como favorecido"; nesse caso o sistema preenche nome, CPF/CNPJ, tipo de chave e chave PIX a partir das chaves cadastradas na pessoa.

A label "Data prevista" passa a ser "Data de Pagamento".

As contas pagadoras BB sao cadastradas em Cadastros Financeiros. Cada conta pagadora vincula uma conta bancaria interna a CNPJ pagador, convenio BB, ambiente, referencias seguras de credenciais e `empresa_id` opcional. Esse desenho deixa o sistema pronto para multiplas empresas e multiplos convenios no futuro, sem gravar secrets reais no repositorio.

## Permissoes

Pagamentos:

- `financeiro.pagamentos.visualizar`
- `financeiro.pagamentos.preparar`
- `financeiro.pagamentos.aprovar`
- `financeiro.pagamentos.enviar_banco`
- `financeiro.pagamentos.cancelar`
- `financeiro.pagamentos.reprocessar`
- `financeiro.pagamentos.confirmar_baixa`
- `financeiro.pagamentos.auditar`
- `financeiro.pagamentos.configurar`

Favorecidos:

- `financeiro.favorecidos.visualizar`
- `financeiro.favorecidos.gerenciar`
- `financeiro.favorecidos.auditar`

Fallback operacional inicial quando o usuario nao tem permissoes granulares configuradas:

- setor/perfil FINANCEIRO pode preparar, enviar e confirmar baixa;
- Diretoria Administrativa e Diretoria Executiva podem aprovar;
- FINANCEIRO e essas diretorias podem gerenciar favorecidos;
- SUPERADMIN e ADMINISTRADOR mantem bypass administrativo.

## Status de PaymentIntent

- `RASCUNHO`
- `PENDENTE_DADOS_FAVORECIDO`
- `PRONTO_PARA_LOTE`
- `EM_LOTE`
- `PENDENTE_APROVACAO`
- `APROVADO`
- `ENFILEIRADO`
- `ENVIANDO`
- `ENVIADO_AO_BANCO`
- `PROCESSANDO_BANCO`
- `CONFIRMADO_BANCO`
- `AGUARDANDO_CONFIRMACAO_BAIXA`
- `BAIXADO`
- `REJEITADO_BANCO`
- `FALHA_INTEGRACAO`
- `CANCELADO`

## Status de PaymentBatch

- `RASCUNHO`
- `EM_REVISAO`
- `PENDENTE_APROVACAO`
- `APROVADO`
- `ENFILEIRADO`
- `ENVIANDO`
- `ENVIADO_AO_BANCO`
- `PROCESSANDO_BANCO`
- `CONFIRMADO_BANCO`
- `PARCIALMENTE_CONFIRMADO`
- `AGUARDANDO_CONFIRMACAO_BAIXA`
- `BAIXADO`
- `PARCIALMENTE_REJEITADO`
- `REJEITADO`
- `FALHA_INTEGRACAO`
- `CANCELADO`
- `FECHADO`

## Constraints importantes

- `payment_intents.idempotency_key` unico;
- `payment_intents.correlation_id` unico;
- `payment_batches.codigo` unico;
- `payment_batches.idempotency_key` unico;
- `payment_batches.correlation_id` unico;
- `payment_batch_items.payment_batch_id + payment_intent_id` unico;
- `payment_approvals.entity_type + entity_id + aprovado_por` unico;
- `payment_intents.active_titulo_key` unico por titulo para status ativos.

A coluna `active_titulo_key` e gerada pelo MySQL e impede mais de uma intent ativa para o mesmo titulo. Status finais como `BAIXADO`, `REJEITADO_BANCO`, `FALHA_INTEGRACAO` e `CANCELADO` liberam nova tentativa futura, quando a regra de negocio permitir.

## Proximas fases

## Provider Banco do Brasil

O provider real do Banco do Brasil atende homologacao e producao por configuracao de ambiente, mantendo o mock como caminho seguro quando a integracao real estiver desabilitada.

Variaveis de ambiente adicionadas:

- `BB_PAYMENTS_ENABLED`
- `BB_PAYMENTS_PROVIDER`
- `BB_PAYMENTS_ENV`
- `BB_PROVIDER_MODE`: usar `real` para chamada real ao BB e `mock` para simulacao interna.
- `BB_PAYMENTS_BASE_URL`: producao `https://pagamentos-lote.mtls.api.bb.com.br/v1`; homologacao `https://pagamentos-lote.mtls.api.hm.bb.com.br/v1`.
- `BB_OAUTH_TOKEN_URL`: producao `https://oauth.bb.com.br/oauth/token`; homologacao conforme ambiente liberado pelo BB.
- `BB_CLIENT_ID`
- `BB_CLIENT_SECRET`
- `BB_APP_KEY`
- `BB_CERT_TYPE`
- `BB_CERT_PATH`
- `BB_CERT_PASSPHRASE`
- `BB_CA_CERT_PATH`
- `BB_TLS_REJECT_UNAUTHORIZED`: manter `true` por padrao. Em homologacao/sandbox, pode ser definido como `false` temporariamente se o endpoint do BB retornar `SELF_SIGNED_CERT_IN_CHAIN` e a cadeia CA oficial ainda nao estiver configurada em `BB_CA_CERT_PATH`. Nao usar `false` em producao.
- `BB_NUMERO_CONTRATO_PAGAMENTO`
- `BB_AGENCIA_DEBITO`
- `BB_CONTA_CORRENTE_DEBITO`
- `BB_DIGITO_CONTA_CORRENTE_DEBITO`
- `BB_CNPJ_PAGADOR`
- `BB_AUTO_LIBERAR_LOTE`
- `BB_REQUEST_TIMEOUT_MS`
- `BB_TOKEN_CACHE_TTL_SECONDS`
- `BB_OAUTH_MAX_ATTEMPTS`: quantidade maxima de tentativas para obter token OAuth2 em caso de falha temporaria de conexao com o BB. Padrao recomendado: `3`.
- `BB_REAL_PROVIDER_ENABLED`
- `BB_SANDBOX_REAL_ENABLED`: variavel legada para ambientes antigos; preferir `BB_REAL_PROVIDER_ENABLED`.
- `BB_WEBHOOK_ENABLED`
- `BB_WEBHOOK_PATH`
- `BB_WEBHOOK_REQUIRE_MTLS`

Regras de seguranca:

- `BB_REAL_PROVIDER_ENABLED=false` mantem o fluxo mockado.
- `BB_REAL_PROVIDER_ENABLED=true` exige `BB_CLIENT_ID`, `BB_CLIENT_SECRET`, `BB_APP_KEY` e certificado A1 configurado fora do repositorio.
- certificado, senha, app key, token e client secret nunca devem ser versionados nem expostos no frontend.
- snapshots tecnicos sao mascarados antes de gravar em `payment_transactions`.

Certificado A1, CA e TLS:

- o certificado A1 configurado em `BB_CERT_PATH` e a identidade da empresa usada no mTLS com o Banco do Brasil;
- a cadeia CA/TLS e a cadeia de confianca que o Node usa para validar o certificado apresentado pelo servidor do Banco do Brasil;
- erro `SELF_SIGNED_CERT_IN_CHAIN` normalmente indica problema de confianca na cadeia TLS do servidor ou ausencia de CA intermediaria/local, nao necessariamente erro no A1;
- em homologacao, `BB_TLS_REJECT_UNAUTHORIZED=false` pode ser usado temporariamente para teste controlado quando a cadeia do endpoint de homologacao nao for aceita pelo Node;
- em producao, `BB_TLS_REJECT_UNAUTHORIZED` deve permanecer `true`;
- se producao apresentar erro de cadeia TLS, a correcao deve ser configurar a cadeia CA correta em `BB_CA_CERT_PATH`, nao relaxar a validacao TLS.

Endpoints BB usados:

- `POST /lotes-transferencias-pix`
- `POST /liberar-pagamentos`
- `GET /{id}`
- `GET /{id}/solicitacao`
- `GET /pagamentos`

Escopos OAuth2:

- `pagamentos-lote.transferencias-pix-requisicao`
- `pagamentos-lote.lotes-requisicao`
- `pagamentos-lote.lotes-info`

Rotas internas FLUXY adicionadas:

- `GET /api/financeiro/pagamentos/bb/health`
- `POST /api/financeiro/pagamentos/lotes/:id/enviar-bb`
- `POST /api/financeiro/pagamentos/lotes/:id/enviar-bb-sandbox` (compatibilidade legada)
- `POST /api/financeiro/pagamentos/lotes/:id/sincronizar-status-bb`
- `GET /api/financeiro/pagamentos/lotes/:id/transacoes-bb`
- `GET /api/financeiro/pagamentos/eventos`
- `POST /api/payments/bb/webhook`

Fluxo real BB:

1. lote e criado e recebe uma aprovacao de usuario diferente do criador;
2. usuario financeiro informa MFA e envia pelo botao `Enviar ao BB`;
3. backend cria job `BB_SUBMIT_PIX_BATCH`;
4. provider monta payload `RequisicaoPOSTLotePagamentosTransferenciaPix`;
5. OAuth2 gera token client credentials;
6. chamada usa mTLS com certificado A1;
7. request/response sao gravados em `payment_transactions`;
8. consulta posterior sincroniza status do lote;
9. status `Pago` vira `AGUARDANDO_CONFIRMACAO_BAIXA`;
10. baixa continua manual/semiautomatica pelo financeiro.

Numero da requisicao BB:

- `numeroRequisicao` e controlado pelo FLUXY, mas o Banco do Brasil nao permite reutilizar um numero ja recebido;
- o lote interno do FLUXY mantem seu `id` e `codigo`;
- no envio real, o `numeroRequisicao` enviado ao BB e gerado na faixa de 6 digitos, evitando numeros ja usados no historico local do lote;
- reprocessar um lote em `FALHA_INTEGRACAO` deve gerar novo `numeroRequisicao`, porque o numero anterior pode ter sido registrado pelo BB mesmo quando a resposta foi `400`;
- se uma tentativa tiver status externo desconhecido, consultar/sincronizar antes de reenviar para reduzir risco de duplicidade.

Formato de data PIX:

- a API BB recebe `listaTransferencias[].data` como inteiro no formato `ddmmaaaa`;
- por ser inteiro, apenas zero no inicio do numero e omitido;
- exemplo: `05/11/2020` deve ser enviado como `5112020`;
- exemplo: `08/05/2026` deve ser enviado como `8052026`;
- nao remover zeros internos de dia/mes antes de concatenar a data.

Mapeamento de status BB:

- `Consistente`, `Pendente`, `Agendado`, `Debitado` -> `PROCESSANDO_BANCO`
- `Pago` -> `AGUARDANDO_CONFIRMACAO_BAIXA`
- `Devolvido`, `Inconsistente`, `Rejeitado`, `Vencido` -> `REJEITADO_BANCO`
- `Cancelado` -> `CANCELADO`

Webhook:

- rota preparada em `/api/payments/bb/webhook`;
- por padrao `BB_WEBHOOK_ENABLED=false`;
- quando desabilitado, responde como indisponivel;
- quando habilitado, exige `BB_WEBHOOK_SECRET`;
- o segredo deve vir no header configurado em `BB_WEBHOOK_SECRET_HEADER` ou no padrao `x-fluxy-bb-webhook-secret`;
- payload sem identificador do evento do provedor e recusado para preservar idempotencia e rastreabilidade;
- notificacao repetida com o mesmo identificador reaproveita o evento ja registrado;
- eventos aceitos, duplicados e recusados sao registrados na auditoria de seguranca;
- validacao mTLS via Nginx/EC2 deve ser fechada em fase posterior.

Auditoria tecnica:

- usuarios com permissao `financeiro.pagamentos.auditar` podem consultar `GET /api/financeiro/pagamentos/eventos`;
- filtros disponiveis: `status`, `event_type`, `provider_event_id`, `payment_batch_id`, `payment_intent_id`, `data_inicio`, `data_fim` e `limit`;
- a auditoria tecnica mostra comunicacao com banco/provider, polling e webhook;
- evento tecnico nao equivale a baixa financeira e nao deve ser usado sozinho como comprovante de liquidacao.

Homologacao BB - pendencias:

- validar payload final no Swagger/OpenAPI BB com massa real do convenio;
- validar certificado A1, cadeia CA e senha no servidor privado;
- validar se a liberacao sera manual ou automatica;
- confirmar se `numeroRequisicao` deve seguir sequencia propria do convenio;
- confirmar limites por lote e regras de janela bancaria;
- testar retorno 201 de `POST /lotes-transferencias-pix`;
- testar consulta de lote e pagamentos;
- testar rejeicao/inconsistencia sem baixar titulo;
- testar que `Pago` nao cria baixa automatica;
- validar webhook mTLS em Nginx antes de habilitar.

Fase 5:

- testes/validacoes dos cenarios de aceite;
- checklist de homologacao futura com BB real;
- hardening de seguranca e mascaramento de snapshots.

Fase 6:

- executar testes reais em sandbox com credenciais e certificado configurados na AWS;
- ajustar payload conforme retorno oficial do convenio;
- implementar liberacao manual/automatica conforme decisao operacional;
- adicionar polling recorrente e webhook mTLS conforme produto contratado;
- preparar evidencias formais de homologacao antes de qualquer producao.

## Validacoes executadas

- `node -c` nos services/controllers/rotas de pagamento;
- carregamento de `backend/src/routes.js`;
- carregamento de `backend/src/models`;
- `npm run test:payments` para validar payloads, rotas e guardas criticas do motor de pagamentos sem depender de banco local;
- `npm run test:payments` tambem valida que a execucao passa pelo adapter BB e que o modo real permanece bloqueado nesta etapa;
- `npm run build` no frontend.

Pendente por ambiente local:

- `npm run migrate` nao rodou nesta maquina porque o `.env` local nao contem `DB_USER`, `DB_NAME`, `JWT_SECRET` e `DB_PASSWORD`.

## Checklist de homologacao futura BB real

- confirmar documentacao oficial vigente do BB Developers;
- confirmar escopo do convenio BB;
- confirmar formato de lote PIX;
- confirmar idempotencia suportada pelo BB;
- confirmar OAuth2 e mTLS;
- manter certificados e credenciais fora do repositorio;
- usar referencias seguras para secrets;
- mascarar dados sensiveis em logs;
- manter provider mockado para testes internos;
- ativar provider real apenas apos homologacao.
