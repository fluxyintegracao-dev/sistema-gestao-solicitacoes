# Modulo - Solicitacoes

## Objetivo

Controlar o fluxo operacional entre setores, mantendo rastreabilidade por obra, parceiro, anexos, comentarios e historico.

## O que o modulo entrega hoje

- criacao de solicitacoes por obra
- tipos e status por setor
- aprovacao previa por diretoria conforme classificacao da obra
- prioridades da diretoria por lote
- atribuicao e assumir solicitacao
- envio entre setores
- anexos, comentarios e timeline
- visibilidade por perfil, setor e obra
- parceiro unificado na solicitacao
- apropriacao principal na solicitacao
- pagamentos parciais vinculados a solicitacao
- geracao manual de titulo financeiro a partir do detalhe

## Telas Principais

- listagem geral de solicitacoes
- detalhe da solicitacao
- nova solicitacao
- solicitacoes arquivadas

## Integracoes com outros modulos

- financeiro
  Pode gerar titulo a pagar ou receber.

- compras
  Solicitacoes de compra usam fluxo dedicado.

- parceiros
  Busca por nome ou CPF/CNPJ e cadastro rapido.

- obras
  Escopo e apropriacao dependem da obra selecionada.

- contratos
  Contrato e ref. de contrato so aparecem e podem ser exigidos quando `CONTRATOS` estiver habilitado.

## Modularidade Oficial

- `SOLICITACOES` funciona sozinha.
- `CONTRATOS` adiciona contexto contratual na criacao, detalhe, listagem e exportacao.
- `OBRAS` adiciona apropriacao principal na criacao e no detalhe.
- se `CONTRATOS` estiver desligado, os campos contratuais ficam ocultos e deixam de ser obrigatorios.
- se `OBRAS` estiver desligado, a apropriacao principal fica oculta e deixa de ser obrigatoria.

## Observacao Tecnica Importante

O cadastro de apropriacoes nao pertence ao modulo `Compras`.
Ele pertence ao dominio de `Obras` e e consumido por `Solicitacoes`, `Compras` e `Financeiro` por uma API compartilhada.

## Observacoes Operacionais

- usuario do setor OBRA continua com restricoes especificas
- numero de pedido segue regra especial do setor GEO
- backend decide o que cada perfil pode ver e fazer
- quando a aprovacao por diretoria estiver ativa, a area responsavel escolhida na criacao e a area final; a solicitacao passa antes pela diretoria correspondente da obra
- tipos de solicitacao continuam filtrados pela area responsavel final
- regras completas estao em `docs/regras_negocio/solicitacoes.md`
