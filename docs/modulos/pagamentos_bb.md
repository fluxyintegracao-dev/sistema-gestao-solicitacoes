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

- dupla aprovacao por usuarios diferentes;
- bloqueio para o criador aprovar o proprio lote;
- MFA step-up para aprovar e enviar;
- job persistente em `payment_jobs`;
- provider Banco do Brasil em modo `MOCK_HOMOLOGACAO`;
- simulacao de confirmacao/rejeicao bancaria;
- baixa manual confirmada pelo financeiro apos confirmacao bancaria;
- criacao de `movimentos_financeiros` somente no clique de confirmar baixa;
- vinculo em `payment_reconciliations`.

### Fase 4 - Interface operacional

- menu Financeiro > Pagamentos em Massa;
- listagem de titulos elegiveis;
- criacao de lote;
- revisao de lote com status por item;
- aprovacao, rejeicao, envio mockado e simulacao de retorno;
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

Fase 5:

- testes/validacoes dos cenarios de aceite;
- checklist de homologacao futura com BB real;
- hardening de seguranca e mascaramento de snapshots.

Fase 6:

- trocar o provider mockado pelo adapter real do Banco do Brasil;
- implementar OAuth2, mTLS e tratamento de endpoints reais;
- adicionar polling/webhook conforme produto contratado;
- preparar evidencias formais de homologacao.

## Validacoes executadas

- `node -c` nos services/controllers/rotas de pagamento;
- carregamento de `backend/src/routes.js`;
- carregamento de `backend/src/models`;
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
