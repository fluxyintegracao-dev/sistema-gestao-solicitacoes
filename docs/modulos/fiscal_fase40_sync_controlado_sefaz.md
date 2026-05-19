# Fiscal - Fase 40 - Sync Controlado SEFAZ

## Objetivo

Conectar as pecas ja criadas para permitir uma sincronizacao real controlada do `NFeDistribuicaoDFe`, mantendo tudo atras de feature flag.

## Entregue

- `sefazDfeDistributionService` passou a:
  - montar SOAP via `sefazDfeSoapBuilderService`;
  - exigir `FISCAL_SEFAZ_ENABLED=true` para qualquer chamada real;
  - exigir `FISCAL_SEFAZ_DFE_DISTRIBUTION_URL`;
  - buscar certificado fiscal ativo com segredos descriptografados em memoria;
  - enviar SOAP via adaptador HTTPS/mTLS;
  - parsear o retorno com `sefazDfeResponseParserService`;
  - devolver XML bruto de request/response apenas em memoria para persistencia controlada.

- `fiscalDfeSyncJobService` passou a:
  - manter lock por empresa/tipo documental;
  - salvar request/response brutos no S3 fiscal quando houver chamada real;
  - processar documentos normalizados;
  - atualizar log e estado de sync em caso de sucesso;
  - continuar retornando erro controlado quando faltar configuracao, certificado, endpoint ou storage.

## Variaveis novas

```env
FISCAL_SEFAZ_DFE_DISTRIBUTION_URL=
FISCAL_SEFAZ_REQUEST_TIMEOUT_MS=30000
```

## Segurança

- A sincronizacao real continua desligada por padrao.
- O certificado nao e logado.
- A senha do certificado permanece descriptografada apenas em memoria.
- XML bruto nao vai para console; quando houver chamada real, vai para S3 fiscal privado.
- A ativacao depende de bucket, criptografia, certificado, endpoint e flag.

## Proximo passo recomendado

Executar primeiro em DEV com:

1. bucket fiscal DEV criado;
2. `FISCAL_CRYPTO_KEY` forte;
3. certificado A1 cadastrado e validado;
4. endpoint SEFAZ configurado;
5. `FISCAL_SEFAZ_ENABLED=true` somente no momento do teste controlado.
