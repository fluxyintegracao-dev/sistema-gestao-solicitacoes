# Modulo Fiscal - Fase 13 Vinculo manual

## Escopo entregue

- Vinculo manual de documento fiscal com registros existentes.
- Rota protegida por `fiscal.document.link`:
  - `POST /api/fiscal/documents/:id/link`
- Campos opcionais aceitos:
  - `solicitacao_id`
  - `solicitacao_compra_id`
  - `pedido_id`
  - `pedido_item_id`
  - `financeiro_titulo_id`
  - `obra_id`
  - `centro_custo_id`
  - `plano_financeiro_id`
  - `fornecedor_id`
  - `matched_reason`
- O vinculo nasce como:
  - `link_status=manually_linked`
  - `matched_by=manual`
  - `confidence_score=100`
  - `confirmed_by` e `confirmed_at` preenchidos
- Auditoria registrada em `security_event_logs`.
- Tela de detalhe permite registrar vinculos por ID.

## Regras mantidas

- Nao altera o registro vinculado.
- Nao muda financeiro, pedido, solicitacao ou obra.
- Nao gera titulo financeiro.
- Nao confirma divergencias automaticamente.

## Observacao

A primeira versao usa IDs para reduzir risco e evitar acoplamento de telas. A proxima evolucao natural e trocar esses campos por buscas/autocomplete de solicitacao, pedido, obra e fornecedor.
