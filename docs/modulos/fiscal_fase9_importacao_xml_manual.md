# Modulo Fiscal - Fase 9 Importacao manual de XML

## Escopo entregue

- Importacao manual de XML de NFe na caixa fiscal.
- Upload protegido por autenticacao e permissao fiscal.
- Validacao basica de extensao/conteudo XML.
- Extração inicial de metadados da NFe:
  - chave de acesso
  - emitente
  - destinatario
  - numero
  - serie
  - emissao
  - valor total
  - protocolo/status quando presente
- Salvamento do XML no S3 fiscal privado.
- Criacao ou atualizacao idempotente de `fiscal_dfe_documents` por `access_key`.
- Auditoria em `security_event_logs`.

## Rota adicionada

- `POST /api/fiscal/documents/upload-xml`

Formato multipart:

- `fiscal_company_id`
- `file`

## Permissao adicionada

- `fiscal.document.upload`

SUPERADMIN/ADMIN continuam com acesso administrativo por regra geral.

## Regras importantes

- Nao gera titulo financeiro.
- Nao vincula pedido/solicitacao automaticamente.
- Nao consulta SEFAZ.
- Reimportar a mesma chave atualiza o documento existente e marca `is_duplicate=true`, sem criar duplicidade.
- O XML fica privado no S3 fiscal.

## Dependencias

Requer `.env` DEV com:

```env
FISCAL_S3_BUCKET=...
FISCAL_S3_REGION=sa-east-1
FISCAL_S3_PREFIX=dev
```

## Ainda pendente

- Parser XML robusto com biblioteca propria para XML fiscal.
- Upload de PDF/DANFE manual.
- Validacao de assinatura XML.
- Cruzamento com pedidos, compras e financeiro.
- Consulta SEFAZ real por NSU.
