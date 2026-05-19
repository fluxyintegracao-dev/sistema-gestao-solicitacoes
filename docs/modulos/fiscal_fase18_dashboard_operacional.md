# Modulo Fiscal - Fase 18 - Dashboard Operacional

## Objetivo

Transformar o painel fiscal em uma visao operacional real dos documentos ja cadastrados/importados no modulo.

## Entrega

- O endpoint `GET /api/fiscal/dashboard` passa a retornar:
  - documentos por status;
  - documentos por origem;
  - documentos recentes;
  - logs recentes;
  - contadores de documentos pendentes, com divergencia, validados e ignorados.
- A tela `Painel Fiscal` passa a exibir:
  - cards de resumo ampliados;
  - listas por status e origem;
  - tabela de documentos recentes com link para detalhe;
  - tabela de logs recentes.

## Regras

- Apenas leitura.
- Nao cria migrations.
- Nao executa SEFAZ.
- Nao altera pedidos, financeiro, solicitacoes ou compras.

## Observacoes

- O painel ja fica preparado para refletir documentos vindos de importacao manual agora e de sincronizacao SEFAZ nas fases futuras.
