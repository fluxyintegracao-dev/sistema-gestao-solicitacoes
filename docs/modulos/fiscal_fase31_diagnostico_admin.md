# Modulo Fiscal - Fase 31 - Diagnostico administrativo

## Objetivo

Disponibilizar uma visao administrativa de saude/configuracao do modulo Fiscal sem expor segredos.

## Entrega

- Endpoint protegido `GET /api/fiscal/diagnostics`.
- Pagina frontend `/fiscal/diagnostico`.
- Atalho no menu Fiscal para usuarios com permissao de configuracao fiscal.

## Informacoes exibidas

- Feature flags fiscais.
- Ambiente fiscal.
- Status de storage S3 fiscal.
- Bucket mascarado.
- Regiao e prefixo S3.
- Status de criptografia fiscal.
- Configuracoes SEFAZ nao sensiveis.
- Quantidade de empresas, certificados e estados de sincronizacao.
- Ultimo log fiscal.

## Seguranca

- Nao retorna `FISCAL_CRYPTO_KEY`.
- Nao retorna senha de certificado.
- Nao retorna caminho do certificado A1.
- Nao retorna credenciais AWS.
- Bucket e mascarado.

## Proxima etapa sugerida

Adicionar diagnostico de permissao IAM/S3 com uma acao manual controlada, antes de tentar salvar XML real da SEFAZ em ambiente DEV.
