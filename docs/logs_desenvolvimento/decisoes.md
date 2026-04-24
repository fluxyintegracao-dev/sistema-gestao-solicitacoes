# Logs de Desenvolvimento - Decisoes

## Decisoes Estruturais

- single-tenant por instalacao
- solicitacao como hub do fluxo
- backend como autoridade
- migracoes controladas no startup, sem dependencia de `sync({ alter: true })`
- runtime config por instalacao para identidade e comportamento basico

## Decisoes de Compras

- solicitacao de compra tem fluxo proprio
- apropriacao pode ser simples ou multipla por item
- cotacao usa link publico por token
- encerramento da cotacao gera base para pedido
- pedido pode ser ajustado manualmente com auditoria

## Decisoes Financeiras

- titulo financeiro e gerado manualmente
- titulo manual sem solicitacao e permitido
- categoria financeira depende do tipo do titulo
- OFX e camada de conferencia, nao gerador de titulo ou baixa
- juros, multa e desconto precisam permanecer auditaveis

## Decisoes de Gestao

- gestao de obras consolida orcamento, custos, parcelas, pedidos e arquivos
- frontend segue padrao visual unificado, mas sem romper fluxos operacionais existentes
- documentacao deve acompanhar o codigo para continuidade segura por IA e por equipe
