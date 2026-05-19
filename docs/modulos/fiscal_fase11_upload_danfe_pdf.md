# Modulo Fiscal - Fase 11 Upload manual de DANFE/PDF

## Escopo entregue

- Upload manual de arquivo fiscal vinculado a um documento existente.
- Rota protegida por `fiscal.document.upload`:
  - `POST /api/fiscal/documents/:id/upload-file`
- Tipos aceitos:
  - `file_type=danfe`
  - `file_type=pdf`
- Formatos aceitos:
  - PDF
  - PNG
  - JPG/JPEG
- Validacao binaria reaproveitando a camada segura de uploads.
- Salvamento no S3 fiscal privado com key padronizada por CNPJ, tipo documental, ano/mes e chave de acesso.
- Auditoria em `security_event_logs`.
- Tela de detalhe permite anexar DANFE/PDF e abrir arquivos por URL assinada.

## Regras mantidas

- Nao gera financeiro.
- Nao vincula pedidos automaticamente.
- Nao consulta SEFAZ.
- Nao cria URL publica permanente.
- O arquivo fica privado no bucket fiscal.

## Variaveis opcionais

```env
FISCAL_FILE_UPLOAD_MAX_MB=15
```

Se nao informada, o limite padrao e 15 MB.
