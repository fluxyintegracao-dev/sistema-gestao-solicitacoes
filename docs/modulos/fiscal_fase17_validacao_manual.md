# Modulo Fiscal - Fase 17 - Validacao Manual

## Objetivo

Permitir que a equipe fiscal marque um documento como validado depois da conferencia manual.

## Entrega

- Nova rota protegida:
  - `POST /api/fiscal/documents/:id/validate`
- O detalhe do documento fiscal passa a exibir a acao `Validar`.
- A validacao atualiza apenas `fiscal_dfe_documents.document_status` para `validated`.

## Regras

- Documento `ignored` ou `cancelled` nao pode ser validado.
- Documento com divergencia aberta nao pode ser validado.
- Divergencias precisam estar `resolved` ou `ignored` antes da validacao.
- A validacao nao altera pedidos, titulos financeiros, solicitacoes, compras ou obras.

## Auditoria

- A acao registra `FISCAL_DOCUMENT_VALIDATED` em `security_event_logs`.

## Observacoes

- Esta fase nao cria migrations.
- Esta fase nao executa SEFAZ.
- Esta fase nao gera lancamentos financeiros ou contabeis.
