# Modulo Fiscal - Fase 4 Storage S3 Base

Data: 2026-05-19

## Objetivo entregue

Evoluir o `fiscalS3Service` para operar com bucket fiscal privado, sem expor endpoints de upload/download ao usuario ainda.

## Arquivo alterado

- `backend/src/modules/fiscal/services/fiscalS3Service.js`

## Capacidades adicionadas

- Validacao de configuracao S3 fiscal:
  - `FISCAL_S3_BUCKET`
  - `FISCAL_S3_REGION`
- Criacao de cliente S3 usando credenciais AWS existentes ou IAM Role da EC2.
- Upload privado com `PutObjectCommand`.
- SSE-S3 (`ServerSideEncryption: AES256`) por padrao.
- Presigned URL curta com limite entre 60 e 900 segundos.
- Validacao de MIME types fiscais permitidos:
  - `application/xml`
  - `text/xml`
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
- Geracao de hash SHA-256.
- Helper `saveFiscalXml`.

## Regras de seguranca preservadas

- Nenhum objeto fiscal fica publico.
- Nenhuma URL publica permanente e gerada.
- Nenhum endpoint frontend foi criado nesta fase.
- O service nao registra XML/PDF no console.
- Chaves com path traversal ou caminho absoluto sao bloqueadas.

## Variaveis necessarias

```env
FISCAL_S3_BUCKET=fluxy-fiscal-dev-ACCOUNT_ID
FISCAL_S3_REGION=sa-east-1
FISCAL_S3_PREFIX=dev
FISCAL_S3_PRESIGNED_EXPIRES_SECONDS=300
```

## Validacao DEV futura

Quando o bucket DEV existir e o backend tiver permissao IAM:

```bash
node - <<'NODE'
const { saveFiscalXml } = require('./src/modules/fiscal/services/fiscalS3Service');

saveFiscalXml({
  cnpj: '00000000000000',
  accessKey: 'TESTE-CHAVE-DEV',
  xml: '<xml>teste</xml>',
  metadata: { source: 'manual-dev' }
}).then(console.log).catch(console.error);
NODE
```

Executar apenas em DEV.

## Proxima fase sugerida

- Criar service de criptografia fiscal.
- Criar service de certificado A1 com leitura local segura.
- Criar endpoint administrativo de validacao de certificado sem expor segredo.
