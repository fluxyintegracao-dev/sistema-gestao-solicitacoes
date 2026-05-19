# Modulo Fiscal - Fase 37 - URLs assinadas para payloads brutos

## Objetivo

Permitir auditoria tecnica de payloads brutos SEFAZ armazenados no S3 fiscal privado, sem tornar arquivos publicos.

## Backend

Novo endpoint protegido:

```http
GET /api/fiscal/sync/logs/:id/raw-url?type=response
GET /api/fiscal/sync/logs/:id/raw-url?type=request
```

Permissoes:

- exige acesso a sincronizacao fiscal;
- exige acesso a logs fiscais.

Regras:

- retorna URL assinada curta usando `FISCAL_S3_PRESIGNED_EXPIRES_SECONDS`;
- retorna 404 amigavel quando o log nao tem payload bruto daquele tipo;
- registra auditoria `FISCAL_SYNC_RAW_URL_GENERATED`;
- nao expõe bucket publico;
- nao expõe senha/certificado.

## Frontend

Tela alterada:

- `Fiscal > Logs de Sincronizacao`

Quando o log fiscal possuir:

- `raw_request_storage_key`, mostra botao `Request`;
- `raw_response_storage_key`, mostra botao `Response`.

Ao clicar, o frontend solicita a URL assinada e abre em nova aba.

## Observacao

Esta fase nao executa SEFAZ real. Ela apenas prepara o acesso seguro aos payloads que serao gravados em fases futuras.
