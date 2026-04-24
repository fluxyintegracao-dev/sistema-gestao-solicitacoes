# Modulo - Conciliacao OFX

## Objetivo

Conferir extratos bancarios contra movimentos financeiros ja registrados.

## O que o modulo entrega hoje

- importacao de OFX por conta bancaria
- leitura de remessa e historico de importacoes
- bloqueio de duplicidade por arquivo/remessa
- pendencias de conciliacao
- sugestao de match
- conciliacao manual individual
- conciliacao em lote dos itens com sugestao
- marcacao de pendencia como ignorada

## Regras Operacionais

- a conta do sistema deve corresponder a conta do extrato
- o OFX nao cria titulos
- o OFX nao cria baixa automaticamente
- a conciliacao compara o extrato com movimentos financeiros ativos
