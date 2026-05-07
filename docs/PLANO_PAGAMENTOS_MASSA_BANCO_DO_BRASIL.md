# Plano para Pagamento em Massa Banco do Brasil

Data da analise: 2026-05-07

Este documento consolida a leitura da estrutura atual do FLUXY V2, da documentacao do repositorio e dos pontos que precisam ser planejados para implementar pagamento em massa pelo Banco do Brasil Developers com seguranca, rastreabilidade, controle transacional, idempotencia, aprovacao e governanca operacional.

Observacao importante: esta analise cobre o estado interno do FLUXY. Requisitos exatos de endpoints, campos, limites, certificados, homologacao e fluxos do Banco do Brasil devem ser confirmados diretamente na documentacao oficial vigente do BB Developers antes da implementacao.

## 1. Resumo executivo

O FLUXY ja possui uma base financeira centralizada, com titulos, baixas, contas bancarias, categorias, parceiros, conciliacao OFX, auditoria de eventos sensiveis, permissoes por area e infraestrutura em Node/Express/Sequelize/MySQL.

Apesar disso, o sistema ainda nao possui uma camada de execucao bancaria. Hoje o fluxo financeiro cobre criacao de titulos, baixa manual e conciliacao posterior por OFX. Nao ha lote de pagamentos, bordero, agendamento bancario, envio ao banco, maquina de estados bancaria, idempotencia por pagamento, dupla aprovacao, limites por usuario ou armazenamento seguro de credenciais/certificados BB.

Conclusao pratica: antes de integrar a API do Banco do Brasil, o FLUXY precisa criar um motor transacional de pagamentos, separado da baixa financeira. A baixa deve ocorrer somente apos confirmacao bancaria confiavel, e nao no momento do envio do lote.

## 2. Fontes analisadas

Principais documentos:

- `AGENTS.md`
- `docs/README.md`
- `docs/arquitetura/visao_geral.md`
- `docs/arquitetura/stack_e_componentes.md`
- `docs/arquitetura/backend.md`
- `docs/arquitetura/banco_dados.md`
- `docs/arquitetura/fluxos_principais.md`
- `docs/arquitetura/deploy_ambientes.md`
- `docs/arquitetura/infra-deploy.md`
- `docs/arquitetura/runtime-ativo.md`
- `docs/arquitetura/mensageria_escalabilidade.md`
- `docs/modulos/financeiro.md`
- `docs/regras_negocio/financeiro.md`
- `docs/MANUAL_FLUXO_OPERACIONAL_FINANCEIRO.md`
- `docs/modulos/conciliacao_ofx.md`
- `docs/modulos/financeiro-comprovantes.md`
- `docs/modulos/compras.md`
- `docs/regras_negocio/compras.md`
- `docs/modulos/comercial.md`
- `docs/modulos/rh_dp.md`
- `docs/modulos/integracao_sienge.md`
- `docs/seguranca/visao_geral.md`
- `docs/seguranca/autenticacao_autorizacao.md`
- `docs/seguranca/auditoria_logs.md`
- `docs/seguranca/boas_praticas.md`
- `docs/seguranca/checklist-operacional.md`

Principais arquivos de codigo:

- `backend/src/models/TituloFinanceiro.js`
- `backend/src/models/MovimentoFinanceiro.js`
- `backend/src/models/ContaBancaria.js`
- `backend/src/models/Parceiro.js`
- `backend/src/models/ConciliacaoBancaria.js`
- `backend/src/models/ConciliacaoBancariaImportacao.js`
- `backend/src/models/Comprovante.js`
- `backend/src/models/SolicitacaoPagamento.js`
- `backend/src/models/IntegracaoSiengeFila.js`
- `backend/src/models/IntegracaoSiengeLog.js`
- `backend/src/services/tituloFinanceiroService.js`
- `backend/src/services/conciliacaoBancariaService.js`
- `backend/src/services/financeiroCadastroService.js`
- `backend/src/services/authorizationService.js`
- `backend/src/services/securityLogService.js`
- `backend/src/services/integracaoSiengeService.js`
- `backend/src/services/boletoCaixaService.js`
- `backend/src/routes.js`
- `backend/src/config/env.js`
- `backend/.env.example`
- `frontend/src/pages/FinanceiroTitulos.jsx`
- `frontend/src/pages/FinanceiroTituloNovo.jsx`
- `frontend/src/pages/FinanceiroTituloDetalhe.jsx`
- `frontend/src/pages/FinanceiroConciliacao.jsx`
- `frontend/src/pages/FinanceiroCadastros.jsx`

## 3. Arquitetura atual do FLUXY

### 3.1 Stack

- Backend: Node.js, Express, Sequelize, MySQL.
- Frontend: React, Vite, React Router, Tailwind.
- Autenticacao: JWT por bearer token ou cookie HTTP, com CSRF para modo cookie.
- Infra atual: backend em EC2 com PM2 e Nginx, frontend na Vercel, anexos em S3.
- Banco de dados: MySQL com migrations JS controladas por `schema_migrations`.
- Redis/Valkey: previsto no `.env.example`, usado principalmente como store de rate limit/realtime. Nao ha fila de pagamentos baseada em Redis hoje.
- Worker dedicado: nao existe worker separado para financeiro ou bancos.

### 3.2 Modulos relevantes

- Solicitacoes: hub operacional.
- Compras: solicitacao de compra, cotacao, fornecedor, comparativo e pedido.
- Financeiro: titulos, baixas, contas bancarias, categorias, relatorios e conciliacao OFX.
- Comercial: gera titulos a receber e, em alguns casos, comissoes a pagar.
- RH/DP: fechamento pode gerar titulos a pagar no financeiro.
- SIENGE: possui fila/log de integracao externa, mas nao e motor bancario.
- Boletos Caixa: modulo separado para boletos a receber, com guardas de homologacao.

## 4. Modelo financeiro atual

### 4.1 Entidades principais

| Necessidade | Estrutura atual | Observacao para BB |
| --- | --- | --- |
| Contas a pagar | `titulos_financeiros.tipo = PAGAR` | Base existe, mas sem dados bancarios de pagamento. |
| Contas a receber | `titulos_financeiros.tipo = RECEBER` | Usa camada de cobranca externa em alguns fluxos. |
| Titulos | `titulos_financeiros` | Entidade central do financeiro. |
| Parcelas | Titulos individuais; comercial cria titulos por parcela | Nao ha entidade generica de parcela para pagamento em massa. |
| Fornecedores | `parceiros` e `fornecedores_compra` | Parceiro e o cadastro mestre; faltam dados de favorecido bancario. |
| Favorecidos | Nao existe entidade bancaria propria | Precisa ser criada ou acoplada ao parceiro. |
| Centros de custo | `obras`, `apropriacoes`, `categorias_financeiras` | Existem dimensoes de classificacao, mas titulo nao e multiempresa. |
| Obras | `obras` | Obra existe, mas sem conta pagadora propria obrigatoria. |
| Empresas | `rh_empresas_grupo` no RH/DP | Nao ha empresa financeira nativa vinculada a titulo/conta. |
| Aprovacoes | Fluxos de solicitacao, compras, diretoria e permissoes | Nao ha aprovacao financeira de pagamento/lote. |
| Baixas | `movimentos_financeiros` | Baixa e manual e atualiza saldo/status do titulo. |
| Comprovantes | `comprovantes` e anexos | Nao ha comprovante bancario ligado a transacao BB. |
| Borderos/lotes | Ausente para pagamento | OFX tem importacao em lote, mas e pos-fato. |
| Logs/auditoria | `security_event_logs`, `Historico`, logs SIENGE | Existe base, mas faltam eventos tecnicos bancarios. |

### 4.2 Titulo financeiro

Tabela: `titulos_financeiros`

Campos importantes atuais:

- `codigo`
- `solicitacao_id`
- `obra_id`
- `parceiro_id`
- `categoria_financeira_id`
- `tipo`
- `status`
- `descricao`
- `numero_documento`
- `valor_original`
- `valor_saldo`
- `valor_baixado`
- `data_emissao`
- `data_vencimento`
- `data_quitacao`
- `observacoes`
- `criado_por`
- `atualizado_por`

Campos de cobranca existentes para titulos a receber:

- `forma_cobranca`
- `status_cobranca`
- `banco_cobranca`
- `nosso_numero`
- `linha_digitavel`
- `codigo_barras`
- `identificador_externo`
- `boleto_emitido_em`

Campos ausentes para pagamento BB:

- CPF/CNPJ normalizado do favorecido no titulo ou snapshot.
- Nome do favorecido como snapshot imutavel do pagamento.
- Banco do favorecido.
- Agencia do favorecido.
- Conta do favorecido.
- Digito da conta/agencia, se exigido.
- Tipo de conta do favorecido.
- Chave PIX.
- Tipo de chave PIX.
- Conta pagadora.
- Empresa/CNPJ pagador.
- Convenio BB.
- Identificador de lote/bordero.
- Identificador de pagamento/idempotencia.
- Identificador de transacao bancaria.
- Status bancario.
- Payload/response BB.
- Correlation id.
- Data de envio ao banco.
- Data de liquidacao confirmada.

### 4.3 Movimento financeiro

Tabela: `movimentos_financeiros`

Campos atuais:

- `titulo_financeiro_id`
- `conta_bancaria_id`
- `forma_recebimento`
- `documento_referencia`
- `tipo_movimento`
- `status`
- `valor`
- `juros`
- `multa`
- `desconto`
- `valor_quitacao`
- `data_movimento`
- `observacoes`
- `criado_por`
- `estornado_por`
- `estornado_em`

Uso atual: registrar baixa manual, total ou parcial, e recalcular saldo/status do titulo.

Lacuna para BB: movimento hoje representa baixa financeira, nao transacao bancaria. Para pagamento em massa, deve existir transacao bancaria antes da baixa. O movimento deve ser criado somente quando o pagamento for confirmado como pago/liquidado.

### 4.4 Conta bancaria

Tabela: `contas_bancarias`

Campos atuais:

- `nome`
- `banco`
- `agencia`
- `conta`
- `tipo_conta`
- `ativo`
- `criado_por`
- `atualizado_por`

Lacunas para BB:

- Empresa pagadora.
- CNPJ da empresa pagadora.
- Codigo banco padronizado.
- Agencia/conta com digitos separados.
- Tipo de conta em formato aceito pelo banco.
- Convenio BB.
- Client id / client secret / developer app key.
- Referencia segura para certificado mTLS.
- Ambiente da credencial: homologacao/producao.
- Politica de limite por conta.
- Politica de quem pode aprovar/enviar por conta.

### 4.5 Parceiro e favorecido

Tabela mestre: `parceiros`

Campos atuais relevantes:

- `cpf_cnpj`
- `nome`
- `telefone`
- `email`
- dados de identidade/endereco
- flags `cliente`, `fornecedor`, `corretor`
- `ativo`

Lacunas:

- Dados bancarios do favorecido.
- Dados PIX do favorecido.
- Validacao cadastral de favorecido.
- Snapshot de dados usados em cada pagamento.
- Historico de alteracao de conta/chave PIX.

Complemento definido para a primeira etapa: o cadastro mestre de pessoas/parceiros deve aceitar ate tres chaves PIX opcionais, sendo duas chaves fixas e uma terceira chave variavel. Esses campos tambem devem estar disponiveis no modal de cadastro de credor da tela de Nova Solicitacao para evitar retrabalho operacional.

Essas chaves no parceiro funcionam como base cadastral inicial. O lote de pagamento ainda deve usar `payment_beneficiaries` e snapshots imutaveis em `payment_intents`, para que alteracoes futuras no cadastro da pessoa nao modifiquem pagamentos ja aprovados, enviados ou confirmados.

Recomendacao: criar uma entidade propria de favorecido bancario, vinculada ao parceiro, para evitar alterar o cadastro mestre de forma fragil.

Exemplo:

- `favorecidos_pagamento`
- `parceiro_id`
- `nome_favorecido`
- `cpf_cnpj_favorecido`
- `metodo_preferencial`
- `banco_codigo`
- `agencia`
- `agencia_digito`
- `conta`
- `conta_digito`
- `tipo_conta`
- `pix_tipo_chave`
- `pix_chave`
- `ativo`
- `validado_em`
- `validado_por`

## 5. Fluxo financeiro atual

### 5.1 Fluxo principal documentado

O fluxo atual e:

1. Solicitacao ou outro modulo origina necessidade financeira.
2. Usuario gera um titulo no financeiro.
3. Titulo nasce com status aberto.
4. Financeiro registra baixa manual, informando conta, data, valor e ajustes.
5. Sistema cria movimento financeiro.
6. Sistema recalcula saldo e status do titulo.
7. OFX e importado depois para conferencia.
8. Conciliacao e confirmada manualmente ou por sugestoes seguras.

### 5.2 Compras e pedidos

Compras possui fluxo robusto de solicitacao, cotacao, fornecedor, comparativo, selecao e pedido. Entretanto, a leitura atual nao encontrou uma camada de pagamento automatica partindo de pedido de compra para banco.

Para BB, o pedido de compra pode ser uma origem importante, mas o pagamento deve ser sempre ancorado no titulo financeiro a pagar.

### 5.3 Comercial e RH/DP

Comercial cria titulos a receber e algumas comissoes a pagar. RH/DP pode gerar titulos a pagar a partir de fechamento. Esses fluxos reforcam que o titulo financeiro e a melhor entidade de origem para um motor de pagamento.

## 6. Status atuais

### 6.1 Titulos financeiros

Status usados/documentados:

- `ABERTO`
- `PARCIAL`
- `QUITADO`
- `CANCELADO`
- `ESTORNADO`

### 6.2 Movimentos financeiros

- `ATIVO`
- `ESTORNADO`

### 6.3 Cobranca externa

- `NAO_APLICAVEL`
- `PENDENTE_EMISSAO`
- `EMITIDO`
- `PAGO_BANCO`
- `CONCILIADO`
- `CANCELADO`

### 6.4 Conciliacao bancaria

- `PENDENTE`
- `CONCILIADO`
- `IGNORADO`

### 6.5 SIENGE

A fila de integracao SIENGE usa:

- `PENDENTE`
- `SUCESSO`
- `ERRO`

### 6.6 Lacuna de status para pagamento bancario

Nao existem status como:

- `PENDENTE_APROVACAO`
- `APROVADO`
- `PROGRAMADO`
- `EM_LOTE`
- `ENVIANDO`
- `ENVIADO_AO_BANCO`
- `PROCESSANDO_BANCO`
- `PAGO_BANCO`
- `REJEITADO_BANCO`
- `FALHA_API`
- `CANCELADO_BANCO`
- `BAIXADO`
- `CONCILIADO`

Esses status devem ficar em novas entidades de pagamento, e nao substituir diretamente o status do titulo. O titulo deve continuar representando o estado contabil/financeiro interno.

## 7. Multiempresa, multiconta e segregacao

### 7.1 O que existe hoje

- O sistema e descrito como single-tenant por instalacao.
- Pode haver varias obras.
- Pode haver varias contas bancarias.
- RH/DP possui empresas do grupo.
- Obras possuem classificacao e orcamento.
- Usuarios podem ter escopo por obra e permissoes por area.

### 7.2 O que ainda nao existe para BB

- Empresa financeira nativa vinculada a titulo.
- CNPJ pagador no titulo ou lote.
- Relacao entre obra, empresa e conta pagadora.
- Relacao entre conta bancaria e convenio BB.
- Multiplos certificados/credenciais por conta ou empresa.
- Politica formal de qual usuario pode operar cada conta.

### 7.3 Decisao operacional necessaria

Antes da implementacao, e preciso escolher:

- Pagamento centralizado em uma unica conta.
- Pagamento por empresa.
- Pagamento por obra.
- Pagamento por SPE/filial.
- Pagamento por centro de custo.

Recomendacao inicial: comecar com pagamento centralizado ou por empresa, evitando regras por obra na primeira homologacao. A modelagem deve permitir evoluir para obra/SPE depois.

## 8. Aprovacao financeira

### 8.1 Estado atual

O sistema possui:

- Perfis e setores.
- Permissoes por area.
- Permissoes financeiras gerais.
- Fluxos de solicitacao, compras e diretoria.
- MFA obrigatorio para perfis administrativos especificos.
- Auditoria de eventos sensiveis.

Nao foi encontrada uma estrutura de aprovacao financeira para pagamento/lote com:

- niveis de aprovacao;
- limite por usuario;
- dupla aprovacao;
- segregacao entre quem cria, aprova e envia;
- trava de alteracao apos aprovacao;
- justificativa para excecoes;
- trilha de aprovacao vinculada a lote/transacao.

### 8.2 Recomendacao

Criar uma camada propria de aprovacao para pagamento:

- Aprovacao por item e/ou por lote.
- Regra de alcada por valor.
- Regra por conta pagadora.
- Regra por empresa.
- Regra por metodo de pagamento.
- Dupla aprovacao para valores acima do limite.
- Impedir que o mesmo usuario crie e aprove sozinho quando a politica exigir segregacao.
- MFA step-up obrigatorio para aprovar e enviar ao banco.

Permissoes sugeridas:

- `financeiro.pagamentos.visualizar`
- `financeiro.pagamentos.preparar`
- `financeiro.pagamentos.aprovar`
- `financeiro.pagamentos.aprovar_alcada_superior`
- `financeiro.pagamentos.enviar_banco`
- `financeiro.pagamentos.cancelar`
- `financeiro.pagamentos.reprocessar`
- `financeiro.pagamentos.conciliar`
- `financeiro.pagamentos.auditar`
- `financeiro.pagamentos.configurar`

## 9. Lote, bordero e fila de pagamento

### 9.1 Estado atual

Nao ha lote/bordero de pagamento no financeiro atual.

O sistema possui conceitos relacionados, mas nao equivalentes:

- Importacao OFX em lote, para conciliacao posterior.
- Fila SIENGE, para integracao de titulos com sistema externo.
- Logs SIENGE com snapshots de request/response.

### 9.2 Modelo necessario

Para BB, criar:

- lote/bordero financeiro;
- itens do lote;
- status do lote;
- totalizadores;
- revisao antes do envio;
- aprovacao do lote;
- envio assincrono;
- log tecnico por tentativa;
- retorno bancario por item;
- conciliacao/baixa por item pago.

O usuario deve conseguir:

1. Filtrar titulos elegiveis.
2. Selecionar varios titulos.
3. Gerar lote.
4. Revisar favorecidos, valores, datas e conta pagadora.
5. Resolver pendencias cadastrais.
6. Submeter para aprovacao.
7. Aprovar conforme alcada.
8. Enviar ao banco.
9. Acompanhar status por item.
10. Baixar automaticamente somente itens confirmados.
11. Reprocessar falhas idempotentemente.

## 10. Auditoria, rastreabilidade e idempotencia

### 10.1 O que existe hoje

Ja existe:

- `security_event_logs` para eventos sensiveis.
- Historico de solicitacao.
- Auditoria de criacao/baixa/estorno de titulo.
- Deteccao de remessa OFX duplicada por hash.
- Fila/log SIENGE com payload e response snapshot.
- Rate limit em rotas criticas.

### 10.2 Lacunas para BB

Faltam:

- idempotency key por pagamento;
- idempotency key por lote;
- correlacao entre lote, item, tentativa e resposta BB;
- hash do payload canonico;
- armazenamento de request/response tecnico;
- status HTTP;
- codigo de erro BB;
- transaction id BB;
- correlation id interno;
- correlation id externo;
- numero de tentativa;
- politica de retry;
- bloqueio de reenvio acidental;
- lock transacional em titulo/item;
- trilha de aprovacao;
- trilha de cancelamento;
- trilha de reprocessamento.

### 10.3 Regra fundamental

O sistema deve impedir:

- pagamento duplicado;
- reenvio acidental do mesmo item como nova ordem;
- dupla baixa;
- baixa antes de confirmacao bancaria;
- alteracao de favorecido/valor/data apos aprovacao sem invalidar aprovacao;
- envio de lote com item pendente de dado bancario;
- envio por usuario sem permissao especifica e MFA valido.

## 11. Backend, filas e processamento assincrono

### 11.1 Estado atual

O backend atual e monolitico Node/Express.

Nao foi identificado:

- BullMQ;
- RabbitMQ;
- SQS;
- worker financeiro separado;
- processamento assincrono de pagamentos;
- retry automatico para bancos.

Redis existe como infraestrutura opcional, mas hoje e usado principalmente para rate limit/realtime. A integracao SIENGE tem uma tabela de fila persistente e logs, mas o envio e acionado por servico/rota, nao por worker bancario dedicado.

### 11.2 Recomendacao

Pagamento em massa nao deve rodar de forma sincrona em request HTTP.

Modelo recomendado:

1. API cria lote e itens em transacao.
2. API valida permissao, MFA, status e idempotencia.
3. API coloca um job persistente para envio.
4. Worker processa o lote.
5. Worker chama o adapter BB.
6. Worker grava tentativa e retorno.
7. Worker atualiza status por item.
8. Worker agenda polling/webhook reconciliation quando necessario.
9. Worker cria baixa somente quando item for confirmado como pago.

Opcoes:

- Usar tabela propria de jobs/outbox no MySQL no primeiro ciclo.
- Evoluir para BullMQ/Redis se a operacao exigir throughput maior.
- Usar lock pessimista/transacional em `payment_intents` e `titulos_financeiros`.

## 12. Infraestrutura, certificados e segredos

### 12.1 Estado atual

Ambiente atual:

- Backend em EC2.
- PM2 para processo Node.
- Nginx como proxy.
- Frontend na Vercel.
- S3 para anexos.
- Variaveis sensiveis em `.env`.
- `.env.example` possui DB, JWT, cookies, CSRF, MFA, S3, Redis, ClamAV, SIENGE, Caixa boleto e outras configuracoes.

Nao foram encontrados parametros BB no `.env.example`.

### 12.2 Lacunas

Para BB, planejar:

- armazenamento de certificado mTLS fora do repositorio;
- acesso restrito ao certificado;
- rotacao e renovacao;
- separacao homologacao/producao;
- referencia segura por conta/empresa;
- backup seguro das credenciais;
- criptografia em repouso;
- auditoria de acesso aos segredos;
- plano de revogacao.

### 12.3 Recomendacao

Preferir:

- AWS Secrets Manager; ou
- AWS Systems Manager Parameter Store com KMS; ou
- armazenamento criptografado controlado na EC2 somente como etapa temporaria.

Nunca versionar certificado, chave privada, client secret ou token no repositorio.

## 13. Seguranca e permissoes

### 13.1 Estado atual

O sistema possui:

- JWT.
- Cookie auth opcional.
- CSRF para cookie auth.
- bcrypt.
- MFA TOTP.
- MFA obrigatorio para `SUPERADMIN`, `ADMINISTRADOR` e `ADMIN`.
- Rate limit.
- `security_event_logs`.
- Autorizacao por perfil, setor, obra e permissoes por area.
- Permissoes financeiras cadastradas em `backend/src/constants/moduloPermissoes.js`.

Permissoes financeiras atuais:

- `financeiro.titulos.visualizar`
- `financeiro.titulos.criar`
- `financeiro.titulos.baixar`
- `financeiro.titulos.estornar`
- `financeiro.comprovantes.excluir`
- `financeiro.relatorios.visualizar`
- `financeiro.relatorios.resultado_obras`
- `financeiro.conciliacao.visualizar`
- `financeiro.conciliacao.importar`
- `financeiro.conciliacao.conciliar`
- `financeiro.cadastros.visualizar`
- `financeiro.cadastros.gerenciar`

### 13.2 Ponto de atencao

As rotas financeiras atuais usam em muitos pontos uma liberacao ampla por `allowFinanceiro`. Para pagamento bancario isso e insuficiente.

Pagamento em massa deve exigir permissoes granulares e validacao backend especifica por acao:

- preparar lote;
- editar lote;
- aprovar lote;
- enviar lote;
- cancelar item;
- reprocessar item;
- consultar retorno;
- forcar conciliacao;
- alterar dados bancarios do favorecido.

Tambem e recomendavel exigir MFA step-up no momento de aprovar ou enviar, mesmo que o usuario ja esteja logado.

## 14. Modelo interno recomendado

### 14.1 Objetivo

Criar uma camada neutra de pagamentos, sem acoplar o financeiro diretamente ao Banco do Brasil. Isso permite homologar BB agora e integrar outros provedores no futuro.

### 14.2 Entidades sugeridas

#### `payment_providers`

Representa o provedor bancario.

Campos:

- `id`
- `codigo` como `BB`
- `nome`
- `ambiente`
- `ativo`
- `config_ref`
- `created_at`
- `updated_at`

#### `payment_accounts`

Pode ser nova tabela ou extensao segura de `contas_bancarias`.

Campos:

- `id`
- `conta_bancaria_id`
- `empresa_id`
- `cnpj_pagador`
- `provider_id`
- `banco_codigo`
- `agencia`
- `agencia_digito`
- `conta`
- `conta_digito`
- `tipo_conta`
- `convenio`
- `client_id_ref`
- `client_secret_ref`
- `certificate_ref`
- `ambiente`
- `ativo`
- `created_by`
- `updated_by`

#### `payment_beneficiaries`

Favorecido bancario vinculado ao parceiro.

Campos:

- `id`
- `parceiro_id`
- `nome`
- `cpf_cnpj`
- `metodo_preferencial`
- `banco_codigo`
- `agencia`
- `agencia_digito`
- `conta`
- `conta_digito`
- `tipo_conta`
- `pix_tipo_chave`
- `pix_chave`
- `ativo`
- `validado_em`
- `validado_por`
- `created_by`
- `updated_by`

#### `payment_intents`

Intencao de pagamento individual.

Campos:

- `id`
- `titulo_financeiro_id`
- `payment_account_id`
- `payment_beneficiary_id`
- `provider_id`
- `metodo`
- `valor`
- `data_pagamento`
- `status`
- `idempotency_key`
- `correlation_id`
- `payload_hash`
- `beneficiary_snapshot`
- `titulo_snapshot`
- `aprovado_em`
- `aprovado_por`
- `enviado_em`
- `confirmado_em`
- `cancelado_em`
- `motivo_cancelamento`
- `created_by`
- `updated_by`

#### `payment_batches`

Lote/bordero.

Campos:

- `id`
- `codigo`
- `provider_id`
- `payment_account_id`
- `empresa_id`
- `status`
- `quantidade_itens`
- `valor_total`
- `data_programada`
- `idempotency_key`
- `correlation_id`
- `aprovacao_status`
- `created_by`
- `submitted_by`
- `submitted_at`
- `sent_by`
- `sent_at`
- `closed_at`

#### `payment_batch_items`

Relacao entre lote e intent.

Campos:

- `id`
- `payment_batch_id`
- `payment_intent_id`
- `sequencia`
- `status`
- `valor`
- `erro_codigo`
- `erro_mensagem`

#### `payment_approvals`

Trilha de aprovacao.

Campos:

- `id`
- `entity_type`
- `entity_id`
- `nivel`
- `acao`
- `status`
- `valor_limite_usuario`
- `aprovado_por`
- `aprovado_em`
- `justificativa`
- `mfa_verified_at`
- `snapshot_hash`

#### `payment_transactions`

Tentativas tecnicas contra o banco.

Campos:

- `id`
- `payment_intent_id`
- `payment_batch_id`
- `provider_id`
- `attempt`
- `status`
- `http_status`
- `provider_transaction_id`
- `provider_batch_id`
- `correlation_id`
- `idempotency_key`
- `request_snapshot`
- `response_snapshot`
- `error_code`
- `error_message`
- `started_at`
- `finished_at`

#### `payment_events`

Eventos de retorno, polling ou webhook.

Campos:

- `id`
- `payment_intent_id`
- `payment_batch_id`
- `provider_id`
- `event_type`
- `provider_event_id`
- `payload`
- `received_at`
- `processed_at`
- `processing_status`
- `processing_error`

#### `payment_reconciliations`

Vinculo entre pagamento confirmado, movimento financeiro e conciliacao.

Campos:

- `id`
- `payment_intent_id`
- `movimento_financeiro_id`
- `conciliacao_bancaria_id`
- `status`
- `matched_by`
- `matched_at`
- `created_by`

## 15. Maquina de estados recomendada

### 15.1 PaymentIntent

Status sugeridos:

- `RASCUNHO`
- `PENDENTE_DADOS_FAVORECIDO`
- `PRONTO_PARA_LOTE`
- `EM_LOTE`
- `PENDENTE_APROVACAO`
- `APROVADO`
- `AGENDADO`
- `ENVIANDO`
- `ENVIADO_AO_BANCO`
- `PROCESSANDO_BANCO`
- `PAGO_BANCO`
- `REJEITADO_BANCO`
- `FALHA_INTEGRACAO`
- `CANCELADO`
- `BAIXADO`
- `CONCILIADO`

### 15.2 PaymentBatch

Status sugeridos:

- `RASCUNHO`
- `EM_REVISAO`
- `PENDENTE_APROVACAO`
- `APROVADO`
- `ENFILEIRADO`
- `ENVIANDO`
- `ENVIADO_AO_BANCO`
- `PROCESSANDO_BANCO`
- `PARCIALMENTE_PAGO`
- `PAGO`
- `PARCIALMENTE_REJEITADO`
- `REJEITADO`
- `FALHA_INTEGRACAO`
- `CANCELADO`
- `FECHADO`

### 15.3 Regras criticas

- Titulo `ABERTO` ou `PARCIAL` pode gerar PaymentIntent.
- PaymentIntent aprovado deve travar valor, favorecido e conta pagadora.
- Mudanca de valor/favorecido/data apos aprovacao deve invalidar aprovacao.
- Envio ao banco nao cria baixa.
- Confirmacao bancaria cria baixa em transacao atomica.
- OFX ou retorno bancario pode reforcar conciliacao, mas nao deve duplicar baixa.
- Reprocessamento deve reutilizar idempotency key quando tecnicamente correto.

## 16. Fluxo operacional recomendado

### 16.1 Fase inicial recomendada

Recomendacao para primeira versao: cenario manual controlado.

Fluxo:

1. Financeiro filtra titulos a pagar elegiveis.
2. Usuario seleciona titulos.
3. Sistema valida favorecido, valor, vencimento, conta e permissoes.
4. Sistema cria lote em rascunho.
5. Usuario revisa lote.
6. Sistema envia lote para aprovacao.
7. Aprovadores aprovam conforme alcada.
8. Tesouraria envia ao banco com MFA step-up.
9. Worker processa envio.
10. Sistema acompanha retorno.
11. Itens pagos geram baixa automaticamente.
12. OFX/retorno confirma conciliacao.

### 16.2 Evolucao futura

Depois da homologacao inicial:

- Cenario semi automatico: sistema sugere lotes por vencimento/conta, usuario revisa e aprova.
- Cenario automatico: somente depois de regras maduras de alcada, bloqueio, monitoramento, conciliacao e contingencia.

## 17. Tipos de pagamento e prioridades

Recomendacao de fases:

### Fase 1

- PIX por chave.
- PIX para favorecido cadastrado.
- Lote simples.
- Retorno por consulta/polling ou webhook, conforme disponibilidade do BB.

### Fase 2

- Transferencia entre contas BB.
- TED/transferencia para outros bancos, se aplicavel ao convenio/API contratada.

### Fase 3

- Pagamento de boleto.
- Tributos.
- Folha.

Motivo: PIX e lote simples reduzem a superficie inicial. Boletos, tributos e folha costumam ter validacoes, campos e regras operacionais mais especificas.

## 18. Estrategia de homologacao

### 18.1 Pre-homologacao interna

Antes de acionar o BB:

- Criar massa de titulos PAGAR de teste.
- Criar favorecidos com dados completos.
- Criar conta pagadora homologacao.
- Criar lote simples com poucos itens.
- Validar idempotencia.
- Validar dupla aprovacao.
- Validar logs.
- Validar retry e timeout.
- Validar cancelamento antes do envio.
- Validar rejeicao de item.
- Validar baixa somente apos confirmacao.
- Validar tentativa de pagamento duplicado.

### 18.2 Evidencias para homologacao

Preparar evidencias de:

- OAuth2 e mTLS configurados.
- Certificado fora do repositorio.
- Credenciais protegidas.
- Idempotencia por item/lote.
- Correlation id por envio.
- Logs tecnicos de request/response.
- Auditoria de usuario.
- Alcadas e aprovacoes.
- Segregacao entre criar/aprovar/enviar.
- Controle de retry.
- Tratamento de rejeicao.
- Conciliacao/baixa.
- Plano de contingencia.

## 19. Contingencia operacional

Implementar desde a primeira versao:

- Painel de lotes com status por item.
- Botao de reprocessar somente falhas elegiveis.
- Botao de cancelar item/lote antes do envio.
- Bloqueio de reenvio quando status externo for desconhecido.
- Estado `STATUS_DESCONHECIDO` ou equivalente quando houver timeout apos envio.
- Consulta manual ao banco para recuperar status.
- Exportacao CSV/PDF do lote.
- Registro de justificativa em operacoes manuais.
- Alerta para divergencia entre status BB e saldo/titulo interno.

## 20. Riscos principais

| Risco | Estado atual | Mitigacao |
| --- | --- | --- |
| Pagamento duplicado | Nao ha idempotencia bancaria | Criar idempotency key unica por intent/lote e constraints no banco. |
| Dupla baixa | Baixa manual existe e pode concorrer com rotina automatica futura | Lock transacional e regra de baixa unica por intent confirmado. |
| Baixa antes da liquidacao | Fluxo atual e manual | Separar PaymentIntent de MovimentoFinanceiro. |
| Usuario com acesso financeiro amplo | `allowFinanceiro` e permissao ampla em rotas atuais | Criar permissoes granulares para pagamento. |
| Favorecido incompleto | Parceiro nao tem dados bancarios/PIX | Criar cadastro de favorecido e validacao obrigatoria. |
| Falha de API no meio do lote | Nao ha worker/retry financeiro | Criar fila, retry e status por item. |
| Certificado em local inseguro | Nao ha desenho BB/cert | Usar Secrets Manager/Parameter Store/KMS. |
| Multiempresa inconsistente | Financeiro nao possui empresa nativa | Criar relacao empresa-conta-titulo-lote. |
| Auditoria insuficiente para banco | Logs atuais nao cobrem BB | Criar logs tecnicos e trilha de aprovacao. |
| Rejeicao parcial de lote | Nao ha lote financeiro | Status por item e totalizadores por lote. |

## 21. Decisoes pendentes

Antes de escrever codigo da integracao BB, decidir:

1. A primeira operacao sera PIX, transferencia BB, TED ou boleto?
2. O pagamento sera centralizado em uma conta ou por empresa/obra?
3. Qual CNPJ sera pagador na homologacao?
4. Quantos convenios BB existem ou serao contratados?
5. Quantos certificados serao usados?
6. Havera uma credencial por empresa ou uma credencial central?
7. Quais usuarios podem preparar lote?
8. Quais usuarios podem aprovar lote?
9. Quais usuarios podem enviar ao banco?
10. Havera dupla aprovacao?
11. Quais limites por usuario?
12. Quem pode alterar dados bancarios de favorecido?
13. Qual evento cria PaymentIntent: manual, vencimento, pedido aprovado, titulo criado ou outro?
14. A baixa sera automatica apos retorno BB ou exigira conferencia na primeira versao?
15. O BB fornecera webhook/callback no escopo contratado ou sera necessario polling?

## 22. Roadmap tecnico sugerido

### Etapa 0 - Confirmacao externa

- Validar documentacao oficial BB Developers.
- Confirmar produtos/API contratados.
- Confirmar ambiente de homologacao.
- Confirmar campos obrigatorios por tipo de pagamento.
- Confirmar formato de lote.
- Confirmar idempotencia suportada pelo BB.
- Confirmar retorno: webhook, polling ou ambos.
- Confirmar exigencias de mTLS/certificado.

### Etapa 1 - Cadastros e permissoes

- Criar cadastro de favorecido bancario.
- Criar ou estender conta bancaria para dados BB.
- Criar relacao empresa pagadora.
- Criar permissoes de pagamento.
- Criar politica de MFA step-up.
- Criar auditoria de alteracao de favorecido/conta.

### Etapa 2 - Motor interno de pagamentos

- Criar `payment_intents`.
- Criar `payment_batches`.
- Criar `payment_batch_items`.
- Criar `payment_approvals`.
- Criar `payment_transactions`.
- Criar `payment_events`.
- Criar `payment_reconciliations`.
- Criar constraints de idempotencia.
- Criar validacoes de elegibilidade.

### Etapa 3 - UX operacional

- Lista de titulos elegiveis.
- Criacao de lote.
- Revisao de lote.
- Pendencias de favorecido.
- Aprovacao.
- Envio ao banco.
- Painel de acompanhamento.
- Tela de auditoria tecnica.

### Etapa 4 - Provider BB

- Criar adapter `BancoDoBrasilPaymentProvider`.
- Implementar OAuth2.
- Implementar mTLS.
- Implementar envio de lote.
- Implementar consulta de status.
- Implementar tratamento de erros.
- Implementar retry idempotente.
- Implementar gravacao de snapshots.

### Etapa 5 - Baixa e conciliacao

- Criar baixa automatica apos confirmacao.
- Integrar com conciliacao OFX quando aplicavel.
- Impedir dupla baixa.
- Registrar comprovante/recibo bancario.
- Exibir trilha completa no titulo.

### Etapa 6 - Homologacao e producao

- Rodar massa de testes.
- Gerar evidencias.
- Ajustar cenarios de rejeicao.
- Ativar modo producao somente apos homologacao.
- Separar credenciais homologacao/producao.
- Criar monitoramento operacional.

## 23. Modelo de integracao tecnica recomendado

### 23.1 Estrutura de pastas sugerida

No backend:

- `backend/src/modules/payments/models`
- `backend/src/modules/payments/services`
- `backend/src/modules/payments/controllers`
- `backend/src/modules/payments/providers`
- `backend/src/modules/payments/providers/bancoDoBrasil`
- `backend/src/modules/payments/workers`
- `backend/src/modules/payments/validators`
- `backend/src/modules/payments/routes.js`

Se o repositorio preferir manter padrao atual sem `modules/`, usar:

- `backend/src/models/PaymentIntent.js`
- `backend/src/models/PaymentBatch.js`
- `backend/src/services/paymentService.js`
- `backend/src/services/paymentProviderBancoDoBrasil.js`
- `backend/src/controllers/PaymentController.js`

### 23.2 Padrao de adapter

Interface desejada:

- `authenticate()`
- `submitBatch(batch)`
- `submitPayment(intent)`
- `getBatchStatus(providerBatchId)`
- `getPaymentStatus(providerTransactionId)`
- `cancelPayment(intent)`
- `normalizeError(error)`
- `normalizeStatus(response)`

### 23.3 Outbox/worker

Criar uma fila persistente:

- `payment_jobs`
- `job_type`
- `entity_type`
- `entity_id`
- `status`
- `attempts`
- `next_run_at`
- `locked_at`
- `locked_by`
- `last_error`

Isso permite rodar com PM2 no inicio e migrar para BullMQ depois.

## 24. Regras de elegibilidade de titulo para pagamento

Um titulo deve poder entrar em lote somente se:

- `tipo = PAGAR`
- `status` em `ABERTO` ou `PARCIAL`
- `valor_saldo > 0`
- parceiro ativo;
- favorecido ativo e completo;
- obra/empresa/conta pagadora resolvidas;
- data de pagamento valida;
- usuario tem permissao para preparar lote;
- nao existe PaymentIntent ativo para o mesmo titulo/saldo;
- titulo nao esta cancelado/estornado/quitado;
- titulo nao esta bloqueado por pendencia de aprovacao ou divergencia.

## 25. Relacao com baixa atual

O servico atual `tituloFinanceiroService` ja possui regras importantes de baixa e estorno. Para pagamento BB, o ideal e reutilizar a baixa apenas no momento certo.

Fluxo correto:

1. PaymentIntent confirmado como pago.
2. Transacao abre lock do titulo.
3. Sistema verifica saldo e status.
4. Sistema cria `movimentos_financeiros`.
5. Sistema atualiza `titulos_financeiros`.
6. Sistema grava auditoria.
7. Sistema vincula `payment_reconciliations`.

Nao recomendado:

- Marcar titulo como quitado no envio.
- Baixar todos os itens do lote antes do retorno por item.
- Reenviar item rejeitado criando novo intent sem fechar o anterior.

## 26. Resposta direta aos pontos solicitados

### Estrutura financeira atual

O financeiro atual tem titulo, baixa, conta bancaria, categoria, parceiro, obra, apropriacao, conciliacao OFX, importacao OFX e auditoria. Nao tem lote/bordero bancario, status bancario, fila de pagamento ou conciliacao bancaria automatica por API.

### Multiempresa/multiconta

Ha varias contas bancarias e varias obras. RH/DP possui empresas do grupo. O financeiro central ainda nao modela empresa/CNPJ pagador por titulo/lote/conta, nem convenios/certificados BB por conta.

### Aprovacao financeira

Ha permissoes e fluxos de negocio, mas nao uma aprovacao financeira de pagamento com alcadas, dupla aprovacao e segregacao criar/aprovar/enviar.

### Estrutura dos titulos

Titulos possuem valor, vencimento, parceiro, obra, categoria, documento e descricao. Parceiro possui CPF/CNPJ e nome. Faltam dados bancarios e PIX do favorecido, snapshot imutavel e identificadores bancarios.

### Lote/bordero

Nao existe hoje para pagamento. Precisa ser criado.

### Auditoria

Ha base de auditoria e logs sensiveis. Faltam logs tecnicos BB, payload/response, correlation id, idempotencia, transaction id e status HTTP.

### Backend

Backend e Node/Express/Sequelize/MySQL. Nao ha worker financeiro ou fila dedicada. Redis existe mas nao como fila de pagamento.

### Infraestrutura

Backend roda em EC2 com PM2/Nginx. Frontend em Vercel. S3 para anexos. Nao ha desenho atual de certificado mTLS BB ou Secrets Manager.

### Seguranca

Ha RBAC, permissoes por area, MFA, CSRF, JWT, logs e rate limit. Para BB, faltam permissoes granulares, MFA step-up e governanca especifica de pagamentos.

### Fluxo operacional

Recomendado iniciar manual controlado: selecionar titulos, gerar lote, revisar, aprovar e enviar. Automatizacao deve vir depois.

### Tipos de pagamento

Prioridade recomendada: PIX e lote simples primeiro; depois transferencia/TED; depois boleto, tributos e folha.

### Homologacao

A homologacao deve ser precedida por evidencias de seguranca, idempotencia, logs, aprovacao, segregacao, retry, tratamento de falha e conciliacao.

### Modelo financeiro interno

Criar PaymentIntent, PaymentBatch, PaymentTransaction, PaymentProvider, PaymentEvent e PaymentReconciliation antes de chamar a API BB em producao.

## 27. Conclusao

O FLUXY esta bem posicionado porque ja tem titulo financeiro central, baixa, conciliacao OFX, permissoes, auditoria, MFA e integracoes externas como SIENGE. O maior trabalho nao e chamar a API do BB, e sim construir a camada de pagamento transacional com governanca.

A ordem correta e:

1. fortalecer cadastros e permissoes;
2. criar o motor interno de pagamentos;
3. criar lote/bordero e aprovacao;
4. implementar provider BB com mTLS/OAuth2;
5. processar assincronamente;
6. baixar somente apos confirmacao;
7. conciliar e auditar ponta a ponta.
