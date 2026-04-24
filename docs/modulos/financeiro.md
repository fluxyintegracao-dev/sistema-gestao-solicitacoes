# Modulo - Financeiro

## Objetivo

Controlar contas a pagar e a receber de forma simples, auditavel e integrada ao fluxo operacional.

## O que o modulo entrega hoje

- geracao de titulo a partir da solicitacao
- criacao manual de conta sem solicitacao
- contas a pagar e a receber em titulo unico
- camada intermediaria para cobranca externa em contas a receber, com dados do boleto gerado no banco
- categorias financeiras por tipo
- baixa parcial ou total
- estorno de baixa
- correcao de conta bancaria, data, juros, multa e desconto
- historico e auditoria por titulo
- relatorios financeiros
- fluxo de caixa previsto x realizado
- conciliacao OFX

## Fontes de Dados do Relatorio

- previsto
  Titulos `ABERTO` e `PARCIAL`, usando saldo e vencimento.

- realizado
  Movimentos financeiros ativos, usando valor quitado e data do movimento.

## Telas Principais

- titulos financeiros
- nova conta manual
- detalhe do titulo
- cadastros financeiros
- relatorios financeiros
- resultado de obras
- conciliacao OFX

## Regras-Chave

- categoria financeira exibida conforme o tipo do titulo
- OFX nao cria titulo e nao baixa automaticamente
- quando a venda nasce no modulo comercial, o titulo financeiro ja existe antes da emissao do boleto no banco
- os dados do boleto devem complementar o titulo existente, e nao criar um novo titulo paralelo
- a cobranca externa pode registrar forma, status, banco, nosso numero, linha digitavel, codigo de barras e identificador externo
- backend valida valor, parceiro, obra, vencimento e escopo
- contratos e recebiveis de futuros modulos, como o comercial, devem usar o financeiro como motor central de titulos e movimentos
- integracoes bancarias especificas, como boleto, devem ficar desacopladas da regra central de titulos quando dependerem de homologacao externa
