# Modulo Fiscal - Fase 15 - Divergencias Manuais

## Objetivo

Permitir que a equipe fiscal registre divergencias encontradas durante a conferencia manual de documentos fiscais.

## Entrega

- Novas rotas protegidas:
  - `POST /api/fiscal/documents/:id/divergences`
  - `PATCH /api/fiscal/documents/:id/divergences/:divergenceId`
- O detalhe do documento fiscal permite:
  - registrar divergencia manual;
  - informar tipo, severidade, descricao, valor esperado e valor encontrado;
  - vincular a divergencia a um vinculo fiscal existente, quando aplicavel;
  - resolver ou ignorar divergencias abertas.
- Ao registrar divergencia aberta, o documento passa para `with_divergence`, exceto quando ja estiver `cancelled` ou `ignored`.
- Ao resolver/ignorar todas as divergencias abertas, o documento retorna para `pending_link` ou `linked_to_order`, conforme tenha vinculo registrado.

## Seguranca e auditoria

- As rotas exigem autenticacao e permissao de vinculo fiscal.
- Acoes registram eventos em `security_event_logs`:
  - `FISCAL_DIVERGENCE_CREATED`
  - `FISCAL_DIVERGENCE_UPDATED`
- Nenhuma acao gera titulo financeiro, pedido ou alteracao em outros modulos.

## Observacoes

- Esta fase nao cria migrations.
- Esta fase nao executa SEFAZ.
- Divergencias automaticas por matching ficam para fase posterior.
