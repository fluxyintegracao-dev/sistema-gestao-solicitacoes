# Modulo Fiscal - Fase 36 - Storage bruto SEFAZ

## Objetivo

Preparar armazenamento privado de payloads brutos de requisicao/resposta SEFAZ para auditoria tecnica e suporte futuro.

## Implementacao

Arquivo alterado:

- `backend/src/modules/fiscal/services/fiscalS3Service.js`

Novas funcoes:

- `buildFiscalRawSefazObjectKey(...)`
- `saveRawSefazPayload(...)`
- `saveRawSefazRequest(...)`
- `saveRawSefazResponse(...)`

## Padrao de chave

```text
{prefix}/{cnpj}/raw/sefaz/{ano}/{mes}/{dia}/{syncLogId}/{direction}-{requestType}.{ext}
```

Exemplo:

```text
dev/55666777000188/raw/sefaz/2026/05/19/99/response-distNSU.xml
```

## Tipos permitidos

- `application/xml`
- `text/xml`
- `application/json`

O suporte a `application/json` foi adicionado para payloads tecnicos normalizados, sem expor segredos.

## Regras de seguranca

- Nao ha rota publica nova.
- Nao roda automaticamente.
- Usa o mesmo bucket fiscal privado.
- Usa SSE-S3 (`AES256`) como os demais objetos fiscais.
- Metadados sao limitados e nao devem incluir senha, certificado ou XML em texto de log.

## Teste

O teste `npm run test:fiscal-dfe-processor` passou a validar o padrao de chave e MIME type JSON.

## Proxima etapa

Quando o SOAP real for implementado:

- salvar request apenas se configurado e sem segredo sensivel;
- salvar response bruto em S3 privado;
- persistir as chaves em `fiscal_sync_logs.raw_request_storage_key` e `raw_response_storage_key`.

## Integracao preparada

O processor fiscal ja aceita `rawRequestStorageKey` e `rawResponseStorageKey` ao processar retorno normalizado/XML e grava essas chaves no `fiscal_sync_logs` quando houver `syncLogId`.
