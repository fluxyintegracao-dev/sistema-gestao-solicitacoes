# Modulo Fiscal - Fase 33 - Atalho para certificados

## Objetivo

Melhorar a descoberta do cadastro de certificados A1 na interface fiscal sem criar nova regra de backend.

## Implementacao

- A secao de certificados dentro de `Fiscal > Empresas Fiscais` recebeu o anchor `#certificados`.
- O menu Fiscal agora exibe o atalho `Certificados` para usuarios com permissao de configuracao fiscal.
- O atalho aponta para:
  - `/fiscal/empresas#certificados`

## Escopo

- Nao foi criada nova rota de API.
- Nao foi alterada a regra de permissao.
- Nao foi alterado armazenamento de senha/certificado.
- O cadastro segue usando os endpoints ja protegidos de certificados fiscais.

## Observacao

O arquivo A1 continua fora do frontend. A tela cadastra somente metadados e segredos criptografados pelo backend quando `FISCAL_CRYPTO_KEY` estiver configurada.
