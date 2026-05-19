# Modulo Fiscal - Fase 5 Criptografia Base

Data: 2026-05-19

## Objetivo entregue

Criar a base de criptografia para segredos fiscais antes de qualquer persistencia de senha de certificado A1.

## Arquivo criado

- `backend/src/modules/fiscal/services/fiscalCryptoService.js`

## Variavel adicionada

```env
FISCAL_CRYPTO_KEY=
```

## Funcoes disponiveis

- `encryptFiscalSecret(value)`
- `decryptFiscalSecret(payload)`
- `isFiscalCryptoConfigured()`

## Algoritmo

- AES-256-GCM
- IV aleatorio de 12 bytes
- Auth tag separado
- Chave derivada via SHA-256 de `FISCAL_CRYPTO_KEY`

## Regras

- Em producao, `FISCAL_CRYPTO_KEY` precisa ter pelo menos 32 caracteres.
- O service nao loga plaintext.
- O service ainda nao e usado por rotas publicas.
- Nenhum certificado ou senha foi salvo nesta fase.

## Proxima fase sugerida

Criar `fiscalCertificateService` para:

- cadastrar metadados de certificado;
- armazenar senha/path criptografados;
- validar leitura local segura em DEV;
- nunca retornar segredo em API.
