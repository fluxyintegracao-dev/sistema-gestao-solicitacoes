# Fiscal - Fase 20: ZIP privado do lote contabil

## Objetivo
Permitir gerar manualmente um ZIP privado no S3 para um lote contabil fiscal ja criado em rascunho.

## Entregue
- Leitura segura de objetos fiscais privados no S3 pelo backend.
- Geracao de ZIP com:
  - `resumo.csv`
  - XMLs disponiveis em `xml/`
  - PDFs/DANFEs disponiveis em `pdf-danfe/`
- Upload do ZIP para o bucket fiscal privado.
- URL assinada curta para abrir o ZIP.
- Tela de exportacao contabil com botoes `Gerar ZIP` e `ZIP/Abrir ZIP`.
- Eventos de auditoria:
  - `FISCAL_ACCOUNTING_BATCH_GENERATED`
  - `FISCAL_ACCOUNTING_BATCH_SIGNED_URL`

## Regras de seguranca
- O ZIP fica em bucket fiscal privado.
- O frontend recebe apenas URL assinada temporaria.
- O CSV trata valores iniciados por `=`, `+`, `-` e `@` para reduzir risco de formula injection.
- Nenhum documento, titulo financeiro, pedido ou solicitacao e alterado.
- Nenhum job automatico foi ativado.

## Rotas
- `POST /api/fiscal/accounting-batches/:id/generate`
- `GET /api/fiscal/accounting-batches/:id/zip-url`

## Pendente
- Tela de status/baixar relatorio separado.
- Alterar status para `sent` somente quando existir fluxo formal de envio para contabilidade.
- Opcional: assinar manifest/relatorio com hash e totalizadores.
