# Bancos Enterprise - Plano de Implantacao

## Objetivo

Consolidar a camada bancaria do FLUXY como um dominio operacional institucional dentro do Financeiro, preservando os motores ja existentes:

- pagamentos em massa Banco do Brasil;
- boletos Caixa CNAB 240;
- conciliacao OFX;
- financiamentos bancarios;
- contas bancarias;
- movimentos financeiros.

Esta implantacao nasce como camada de orquestracao e leitura consolidada. Nenhum fluxo atual de BB PIX, Caixa Boletos ou OFX deve ser substituido nesta fase.

## Principios

- Titulo financeiro continua sendo a origem da obrigacao financeira.
- Movimento financeiro continua sendo a verdade do realizado.
- Integracoes bancarias ficam desacopladas do titulo.
- Retornos bancarios nunca devem gerar baixa duplicada.
- Casos ambiguos de conciliacao permanecem pendentes para decisao humana.
- CNAB de cobranca e CNAB de pagamento sao contratos diferentes.

## Fases

### Fase 1 - Diagnostico e contratos

- Inventariar contas, movimentos, boletos, pagamentos, retornos, remessas, financiamentos e conciliacoes.
- Definir contratos internos:
  - `BankAccount`;
  - `BankMovement`;
  - `BankRemittance`;
  - `BankReturn`;
  - `BankProviderEvent`;
  - `BankReconciliation`;
  - `BankingHealth`.

### Fase 2 - Camada backend Banking

- Criar `backend/src/modules/banking`.
- Criar adapters de leitura para:
  - contas bancarias;
  - conciliacao OFX;
  - pagamentos BB;
  - boletos Caixa;
  - financiamentos bancarios;
  - movimentos financeiros.

### Fase 3 - Painel Bancos Enterprise

- Criar endpoint consolidado.
- Criar tela `/financeiro/bancos`.
- Exibir:
  - contas bancarias ativas;
  - pendencias de conciliacao;
  - remessas Caixa;
  - retornos Caixa;
  - lotes BB;
  - falhas bancarias;
  - financiamentos ativos;
  - eventos recentes.

### Fase 4 - Auditoria bancaria consolidada

- Consolidar eventos tecnicos e operacionais sem gravar dados sensiveis.
- Exibir eventos por origem, severidade, data e status.

### Fase 5 - Regras de conciliacao enterprise

- Manter score conservador.
- Bloquear conciliacao automatica em empate ou duplicidade por valor/data/conta.
- Suportar conciliacao parcial e multiplos movimentos para um titulo.

### Fase 6 - Remessas e retornos consolidados

- Padronizar visao de remessas e retornos.
- Caixa Boletos segue como provider atual de cobranca.
- CNAB Pagamentos deve nascer separado, sem reaproveitar Segmentos P/Q/T/U de boleto.

### Fase 7 - Providers bancarios

- Formalizar contratos:
  - `PaymentProvider`;
  - `BoletoProvider`;
  - `StatementProvider`;
  - `CnabPaymentProvider`.

### Fase 8 - Extratos e saldos

- Manter OFX manual como fallback.
- Preparar origem futura API/Open Finance.
- Registrar origem do saldo: manual, OFX, API ou conciliacao.

### Fase 9 - Pagamentos multi-modalidade

- Preservar BB PIX.
- Preparar TED/TEF, boleto pagamento, guias e transferencia entre contas por provider.

### Fase 10 - CNAB240 Pagamentos

- Usar como referencia o manual `Leiaute_CNAB240_Pagamentos_e_Debito_Automatico`.
- Implementar como contrato separado de cobranca.
- Status atual: geracao real habilitada para pagamento de boletos por codigo de barras/linha digitavel no Segmento J da CAIXA.
- TED/credito em conta, Pix QR Code e tributos permanecem em contrato separado por forma de lancamento.

### Fase 11 - Automacao controlada

- Automatizar apenas quando a correlacao for inequivoca.
- Manter aprovacao humana para divergencias, duplicidades e matches ambiguos.

### Fase 12 - Governanca e permissoes

- Permissoes granulares:
  - `financeiro.bancos.visualizar`;
  - `financeiro.bancos.auditar`;
  - `financeiro.bancos.conciliar`;
  - `financeiro.bancos.remessas`;
  - `financeiro.bancos.retornos`;
  - `financeiro.bancos.configurar`.

### Fase 13 - Relatorios bancarios

- Posicao bancaria.
- Pendencias de conciliacao.
- Falhas de integracao.
- Remessas e retornos por periodo.
- Movimentos entre empresas.
- Saldos por conta.

### Fase 14 - Testes e homologacao

- Validar que BB PIX continua criando, aprovando, enviando e reprocessando lotes.
- Validar que Caixa Boletos continua gerando remessa e importando retorno.
- Validar que OFX continua importando e sugerindo conciliacao.
- Validar que financiamentos continuam gerando titulos.

### Fase 15 - Go-live Bancos Enterprise

- Ativar primeiro apenas leitura consolidada.
- Depois auditoria consolidada.
- Depois automacoes controladas.
- Por fim, novos providers bancarios.

## Estado da implantacao

Implantacao concluida neste marco:

- `backend/src/modules/banking` criado como camada enterprise de orquestracao bancaria.
- Adapters de leitura criados para contas bancarias, movimentos financeiros, conciliacao OFX, pagamentos BB, boletos Caixa e financiamentos bancarios.
- Endpoint consolidado criado em `GET /financeiro/bancos/dashboard`.
- Endpoint de contrato CNAB240 Pagamentos criado em `GET /financeiro/bancos/cnab240-pagamentos`.
- Endpoints Caixa Pagamentos criados:
  - `GET /financeiro/bancos/caixa-pagamentos/convenios`;
  - `POST /financeiro/bancos/caixa-pagamentos/convenios`;
  - `PATCH /financeiro/bancos/caixa-pagamentos/convenios/:id`;
  - `GET /financeiro/bancos/caixa-pagamentos/titulos-elegiveis`;
  - `GET /financeiro/bancos/caixa-pagamentos/remessas`;
  - `POST /financeiro/bancos/caixa-pagamentos/remessas`;
  - `GET /financeiro/bancos/caixa-pagamentos/remessas/:id/download`.
- Tela operacional criada em `/financeiro/bancos`.
- Permissoes granulares adicionadas em `financeiro.bancos.*`.
- Contrato CNAB240 Pagamentos registrado a partir do manual de pagamentos/debito automatico, separado do CNAB240 de cobranca Caixa.
- Geracao real de arquivo CNAB240 Pagamentos foi implementada para boletos no Segmento J.
- A remessa nao baixa titulos automaticamente; baixa e conciliacao dependem do retorno bancario ou conciliacao bancaria posterior.
- Nenhum fluxo existente de BB PIX, Caixa Boletos, OFX, titulos financeiros ou financiamentos foi substituido.

## Remessa real Caixa Pagamentos

Fluxo operacional:

1. Cadastrar um convenio Caixa de pagamentos em `/financeiro/bancos`, vinculando empresa do grupo e conta bancaria de debito.
2. Informar agencia, conta, codigo do convenio, CNPJ/CPF e nome da empresa conforme contrato Caixa.
3. Marcar o convenio como homologado quando a Caixa liberar o uso em producao.
4. Selecionar o convenio e carregar titulos elegiveis.
5. Selecionar apenas titulos `PAGAR` em aberto com `codigo_barras` ou `linha_digitavel`.
6. Informar data de pagamento atual ou futura.
7. Gerar e baixar o arquivo `.REM`.

Guardrails implantados:

- titulo vencido nao entra na remessa de pagamento para evitar rejeicao silenciosa;
- titulo de outra empresa nao entra no convenio selecionado;
- titulo sem codigo de barras/linha digitavel nao aparece como elegivel;
- o arquivo e validado para garantir linhas de 240 caracteres;
- o conteudo gerado fica registrado com hash SHA-256;
- a numeracao de remessa e controlada por convenio.

Pendencias futuras:

- importar retorno Caixa de pagamentos e aplicar confirmacao sem baixa duplicada;
- liberar Segmentos A/B para credito em conta/TED quando houver dados bancarios obrigatorios do beneficiario;
- liberar J52 para Pix QR Code em arquivo separado;
- liberar tributos/concessionarias por segmentos especificos.

Este marco deixa o modulo pronto como base institucional consolidada para:

- acompanhar saude bancaria;
- auditar falhas e eventos;
- separar corretamente cobranca, pagamento, retorno e conciliacao;
- evoluir novos providers sem acoplar diretamente titulos financeiros aos layouts bancarios.
