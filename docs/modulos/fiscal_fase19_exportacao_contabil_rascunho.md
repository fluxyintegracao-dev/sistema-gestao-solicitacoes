# Fiscal - Fase 19: exportacao contabil em rascunho

## Objetivo
Criar a primeira camada operacional de lotes contabeis fiscais sem gerar ZIP, sem enviar arquivos e sem alterar documentos ou modulos financeiros/compras.

## Entregue
- Endpoints protegidos para listar, abrir e criar lotes contabeis fiscais.
- Criacao idempotente por empresa, mes e ano enquanto o lote nao estiver cancelado.
- Inclusao apenas de documentos fiscais com `document_status = validated`.
- Itens do lote registram se havia XML e PDF/DANFE disponivel no momento da geracao.
- Tela `/fiscal/exportacao-contabil` para gerar rascunho e conferir documentos incluidos.
- Evento de auditoria `FISCAL_ACCOUNTING_BATCH_CREATED`.

## Regras de seguranca
- Nenhuma consulta SEFAZ real foi adicionada.
- Nenhum job automatico foi ativado.
- Nenhum titulo financeiro, pedido ou solicitacao e alterado.
- O status dos documentos fiscais nao muda ao criar o lote.
- A geracao de ZIP/relatorio S3 fica para fase posterior.

## Rotas
- `GET /api/fiscal/accounting-batches`
- `POST /api/fiscal/accounting-batches`
- `GET /api/fiscal/accounting-batches/:id`

## Proxima fase sugerida
Gerar ZIP privado no S3 com XML/PDF/DANFE do lote, criar relatorio CSV/XLSX e mudar status do lote de `draft` para `generated` somente apos validacao visual.
