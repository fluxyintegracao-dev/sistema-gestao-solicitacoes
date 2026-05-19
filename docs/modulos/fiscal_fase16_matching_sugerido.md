# Modulo Fiscal - Fase 16 - Matching Sugerido

## Objetivo

Criar uma primeira camada de sugestao de vinculos fiscais, sem confirmar automaticamente e sem alterar modulos externos.

## Entrega

- Nova rota protegida:
  - `POST /api/fiscal/documents/:id/suggest-links`
- Nova rota para tratar sugestoes:
  - `PATCH /api/fiscal/documents/:id/links/:linkId`
- O detalhe do documento fiscal passa a ter o botao `Sugerir vinculos`.
- Sugestoes podem ser confirmadas ou rejeitadas pela interface.

## Regras de sugestao

O matching considera:

- fornecedor pelo CNPJ do emitente;
- pedido de compra pelo fornecedor de compra e valor total;
- titulo financeiro pelo fornecedor e valor;
- solicitacao pelo fornecedor e valor;
- obra inferida a partir dos candidatos encontrados.

## Seguranca

- A rota exige autenticacao e permissao `fiscal.document.link`.
- Sugestoes sao gravadas em `fiscal_document_links` com:
  - `link_status = suggested`
  - `matched_by = automatic`
  - `confidence_score`
  - `matched_reason`
- Confirmar sugestao atualiza apenas o vinculo fiscal.
- Nenhum pedido, titulo financeiro, solicitacao ou obra e alterado.
- Acoes geram auditoria:
  - `FISCAL_MATCHING_SUGGESTED`
  - `FISCAL_LINK_SUGGESTION_UPDATED`

## Limites desta fase

- Nao ha matching por itens do XML ainda.
- Nao ha confirmacao automatica.
- Nao ha job em background.
- Nao ha criacao automatica de titulo financeiro.
