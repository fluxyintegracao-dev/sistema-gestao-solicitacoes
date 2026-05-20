# Modulo Fiscal - Fase 9 Importacao manual de XML

## Escopo entregue

- Importacao manual de XML de NFe na caixa fiscal.
- Importacao em lote por multiplos XMLs ou ZIP com XMLs exportados por outro sistema.
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
- `file` para compatibilidade com envio unitario; ou
- `files` para envio multiplo de XMLs/ZIP.

## Permissao adicionada

- `fiscal.document.upload`

SUPERADMIN/ADMIN continuam com acesso administrativo por regra geral.

## Regras importantes

- Nao gera titulo financeiro.
- Nao vincula pedido/solicitacao automaticamente.
- Nao consulta SEFAZ.
- Reimportar a mesma chave atualiza o documento existente e marca `is_duplicate=true`, sem criar duplicidade.
- O XML fica privado no S3 fiscal.
- Importacao manual ou em lote nao altera `fiscal_dfe_sync_states.ult_nsu`.
- ZIPs sao aceitos somente como pacote de transporte; apenas arquivos `.xml` internos sao processados.

## Dependencias

Requer `.env` DEV com:

```env
FISCAL_S3_BUCKET=...
FISCAL_S3_REGION=sa-east-1
FISCAL_S3_PREFIX=dev
FISCAL_XML_UPLOAD_MAX_MB=200
FISCAL_XML_UPLOAD_MAX_FILES=200
FISCAL_XML_IMPORT_MAX_FILES=2000
```

Onde:

- `FISCAL_XML_UPLOAD_MAX_MB` limita o tamanho do arquivo enviado, incluindo ZIP.
- `FISCAL_XML_UPLOAD_MAX_FILES` limita quantos arquivos soltos podem ser selecionados no mesmo envio.
- `FISCAL_XML_IMPORT_MAX_FILES` limita quantos XMLs podem ser processados dentro de um ZIP/envio.

## Ainda pendente

- Parser XML robusto com biblioteca propria para XML fiscal.
- Integracao automatica com API SIENGE, se o contrato/API disponivel retornar XML completo ou link exportavel.
- Validacao de assinatura XML.
- Cruzamento com pedidos, compras e financeiro.
- Consulta SEFAZ real por NSU.
