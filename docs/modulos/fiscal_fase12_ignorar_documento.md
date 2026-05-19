# Modulo Fiscal - Fase 12 Ignorar documento fiscal

## Escopo entregue

- Ação manual para marcar documento fiscal como ignorado.
- Rota protegida por permissao dedicada:
  - `POST /api/fiscal/documents/:id/ignore`
- Permissao adicionada:
  - `fiscal.document.ignore`
- Auditoria registrada em `security_event_logs`.
- Botao na tela de detalhe do documento fiscal.

## Regras mantidas

- Nao exclui documento.
- Nao remove XML/PDF/DANFE do S3.
- Nao altera financeiro, compras, pedidos ou solicitacoes.
- A acao apenas muda `document_status` para `ignored`.

## Observacao operacional

O status `ignored` permite limpar a fila de analise sem perder rastreabilidade. Se futuramente for preciso reverter a decisao, a etapa seguinte deve criar uma acao explicita de reabrir documento fiscal.
